import { expect } from "chai";
import Event from "../models/Event.js";
import ImportCandidate from "../models/ImportCandidate.js";
import router from "../routes/eventImport.js";
import { importExtractedEvent } from "../services/eventImporter/importEvent.js";
import { buildSourceKey } from "../services/eventImporter/sourceSync.js";

const source = { _id: "507f1f77bcf86cd799439011", name: "Example Calendar", url: "https://example.com/events", town: "Banff" };
const extracted = { title: "Local Concert", startDate: "2026-12-20", sourceUrl: "https://example.com/events/concert", venue: "Local Hall" };
const options = { now: new Date(2026, 9, 19) };
function matches(row, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === "$or") return value.some((part) => matches(row, part));
    if (value && typeof value === "object" && "$in" in value) return value.$in.includes(row[key]);
    return row[key] === value;
  });
}

describe("persistent importer rejections", () => {
  async function withRows(rows, task) {
    const old = { findOne: ImportCandidate.findOne, updateMany: ImportCandidate.updateMany,
      find: ImportCandidate.find, create: ImportCandidate.create, eventFind: Event.find };
    const created = [];
    try {
      ImportCandidate.findOne = async (query) => rows.find((row) => matches(row, query)) || null;
      ImportCandidate.updateMany = async (query, update) => {
        for (const row of rows.filter((item) => matches(item, query))) {
          Object.assign(row, update.$set);
          for (const key of Object.keys(update.$unset || {})) delete row[key];
        }
      };
      const empty = () => ({ select() { return this; }, limit: async () => [] });
      ImportCandidate.find = (query) => ({ select() { return this; }, limit: async () => rows.filter((row) => matches(row, query)) });
      Event.find = empty;
      ImportCandidate.create = async (candidate) => { created.push(candidate); return candidate; };
      await task(created);
    } finally {
      ImportCandidate.findOne = old.findOne; ImportCandidate.updateMany = old.updateMany;
      ImportCandidate.find = old.find; ImportCandidate.create = old.create; Event.find = old.eventFind;
    }
  }
  const rejection = (changes = {}) => ({ _id: "rejected-id", source: source._id,
    sourceKey: buildSourceKey(extracted, source), sourceUrl: extracted.sourceUrl,
    title: extracted.title, startDate: extracted.startDate, town: "Banff", status: "rejected",
    reviewedAt: new Date("2026-10-18"), reviewedBy: "admin-id", ...changes });

  it("keeps a rejected source listing rejected when its title and date change", async () => {
    const rejected = rejection();
    const copy = { ...rejected, _id: "copy", status: "pending", needsReview: true, reviewReason: "Changed" };
    await withRows([rejected, copy], async (created) => {
      const result = await importExtractedEvent({ ...extracted, title: "Renamed Concert", startDate: "2026-12-21" }, source, options);
      expect(result.status).to.equal("skipped");
      expect(created).to.have.length(0);
      expect(rejected.status).to.equal("rejected");
      expect(copy.status).to.equal("rejected");
      expect(copy.needsReview).to.equal(false);
      expect(copy).to.not.have.property("reviewReason");
    });
  });

  it("honours older rejected records without a source key", async () => {
    await withRows([rejection({ sourceKey: undefined })], async (created) => {
      expect((await importExtractedEvent({ ...extracted, title: "Renamed Concert" }, source, options)).status).to.equal("skipped");
      expect(created).to.have.length(0);
    });
  });

  it("does not block other events that share a calendar page", async () => {
    const rejected = rejection({ sourceUrl: source.url, sourceKey: buildSourceKey({ ...extracted, sourceUrl: source.url, town: "Banff" }, source) });
    await withRows([rejected], async (created) => {
      const result = await importExtractedEvent({ ...extracted, title: "Another Concert", sourceUrl: source.url }, source, options);
      expect(result.status).to.equal("created");
      expect(created[0].status).to.equal("pending");
    });
  });

  it("does not block a new occurrence on another date on a shared calendar", async () => {
    const rejected = rejection({ sourceUrl: source.url, sourceKey: buildSourceKey({ ...extracted, sourceUrl: source.url, town: "Banff" }, source) });
    await withRows([rejected], async (created) => {
      expect((await importExtractedEvent({ ...extracted, startDate: "2027-12-20", sourceUrl: source.url }, source, options)).status).to.equal("created");
      expect(created).to.have.length(1);
    });
  });

  it("clears review flags when the admin rejects a candidate", async () => {
    const old = ImportCandidate.findById;
    let saved = false;
    const candidate = { status: "pending", needsReview: true, reviewReason: "Changed", save: async () => { saved = true; } };
    try {
      ImportCandidate.findById = async () => candidate;
      const handler = router.stack.find((layer) => layer.route?.path === "/candidates/:id/reject").route.stack.at(-1).handle;
      const res = { status() { return this; }, json() {} };
      await handler({ params: { id: "id" }, body: {}, user: { userId: "admin" } }, res);
      expect(candidate).to.include({ status: "rejected", needsReview: false, reviewedBy: "admin" });
      expect(candidate.reviewReason).to.equal(undefined);
      expect(saved).to.equal(true);
    } finally { ImportCandidate.findById = old; }
  });

  for (const title of ["BING-GLOW", "Red Zone", "Taste for Adventure", "Literary Cabaret", "Pasta La Feasta"]) {
    it(`remembers a rejected ${title} when another calendar imports it`, async () => {
      await withRows([rejection({ title, source: "other-source", sourceKey: "other-key", sourceUrl: "https://other.example/event" })], async (created) => {
        const result = await importExtractedEvent({ ...extracted, title }, source, options);
        expect(result.status).to.equal("skipped");
        expect(created).to.have.length(0);
      });
    });
  }

  it("handles another importer winning the unique occurrence insert", async () => {
    await withRows([], async () => {
      const oldFindOne = ImportCandidate.findOne;
      let raced = false;
      const winner = { _id: "winner", status: "pending" };
      ImportCandidate.findOne = async (query) => raced && query.identityKey ? winner : oldFindOne(query);
      ImportCandidate.create = async () => { raced = true; throw Object.assign(new Error("duplicate key"), { code: 11000 }); };
      const result = await importExtractedEvent(extracted, source, options);
      expect(result.status).to.equal("skipped");
      expect(result.candidate).to.equal(winner);
    });
  });

  it("keeps duplicate and rejected review flags out of the pending queue", async () => {
    const old = ImportCandidate.find;
    let query;
    try {
      ImportCandidate.find = (value) => { query = value; return {
        sort() { return this; }, limit() { return this; }, populate() { return this; },
        then(resolve) { return Promise.resolve([]).then(resolve); },
      }; };
      const handler = router.stack.find((layer) => layer.route?.path === "/candidates" && layer.route.methods.get).route.stack.at(-1).handle;
      await handler({ query: { status: "pending" } }, { json() {} });
      expect(matches({ status: "rejected", needsReview: true }, query)).to.equal(false);
      expect(matches({ status: "duplicate", needsReview: true }, query)).to.equal(false);
      expect(matches({ status: "approved", needsReview: true }, query)).to.equal(true);
      expect(matches({ status: "pending", needsReview: false }, query)).to.equal(true);
    } finally { ImportCandidate.find = old; }
  });
});
