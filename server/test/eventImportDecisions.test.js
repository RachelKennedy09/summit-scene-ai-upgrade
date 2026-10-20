import { expect } from "chai";
import { Query } from "mingo";
import Event from "../models/Event.js";
import ImportCandidate from "../models/ImportCandidate.js";
import router from "../routes/eventImport.js";
import { importExtractedEvent } from "../services/eventImporter/importEvent.js";
import { normalizeExtractedEvent } from "../services/eventImporter/normalizeEvent.js";
import { buildSourceKey, buildSourceSnapshot, reconcileSourceSync } from "../services/eventImporter/sourceSync.js";

const source = { _id: "507f1f77bcf86cd799439011", name: "Calendar", url: "https://example.com/events", town: "Banff" };
const extracted = { title: "BING-GLOW", startDate: "2026-12-20", startTime: "8 PM", venue: "Local Hall", sourceUrl: "https://example.com/events/bing-glow" };
const options = { now: new Date("2026-10-20T12:00:00Z") };
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const approve = router.stack.find((layer) => layer.route?.path === "/candidates/:id/approve").route.stack.at(-1).handle;

describe("importer decisions across repeated runs", () => {
  let originals, rows, published;
  const matches = (row, query) => new Query(query).test(row);
  function document(data) {
    return { ...data, set(values) { Object.assign(this, values); }, async save() {},
      toObject() { return { ...this }; } };
  }
  function previous(status, raw = extracted, corrections = {}) {
    const normalized = normalizeExtractedEvent(raw, source, options);
    const row = document({ ...normalized, _id: "507f1f77bcf86cd799439012", status,
      sourceKey: buildSourceKey(normalized, source), sourceSnapshot: buildSourceSnapshot(normalized),
      reviewedAt: new Date(), needsReview: false,
      ...(status === "approved" ? { approvedEvent: "507f1f77bcf86cd799439013" } : {}), ...corrections });
    rows.push(row);
    return row;
  }
  beforeEach(() => {
    rows = []; published = [];
    originals = { findOne: ImportCandidate.findOne, find: ImportCandidate.find,
      create: ImportCandidate.create, updateMany: ImportCandidate.updateMany, findById: ImportCandidate.findById,
      eventFind: Event.find, eventCreate: Event.create, eventUpdate: Event.findByIdAndUpdate };
    ImportCandidate.findOne = async (query) => rows.find((row) => matches(row, query)) || null;
    ImportCandidate.find = (query) => ({ select() { return this; }, limit: async () => rows.filter((row) => matches(row, query)) });
    ImportCandidate.create = async (data) => { const row = document(data); rows.push(row); return row; };
    ImportCandidate.findById = async (id) => rows.find((row) => row._id === id);
    ImportCandidate.updateMany = async (query, update) => {
      rows.filter((row) => matches(row, query)).forEach((row) => {
        Object.assign(row, update.$set);
        Object.keys(update.$unset || {}).forEach((field) => delete row[field]);
      });
    };
    Event.find = () => ({ select() { return this; }, limit: async () => [] });
    Event.create = async (data) => { published.push(data); return { ...data, _id: "507f1f77bcf86cd799439013" }; };
    Event.findByIdAndUpdate = async (id, update) => { published.push(update.$set); return { _id: id }; };
  });
  afterEach(() => {
    for (const name of ["findOne", "find", "create", "updateMany", "findById"]) ImportCandidate[name] = originals[name];
    Event.find = originals.eventFind; Event.create = originals.eventCreate; Event.findByIdAndUpdate = originals.eventUpdate;
  });

  it("does not requeue an accepted event with manually supplied venue and time", async () => {
    const partial = { ...extracted, venue: "", startTime: "" };
    const row = previous("approved", partial, { venue: "Correct Hall", startTime: "8:00 PM" });
    for (let run = 0; run < 3; run++) {
      const result = await importExtractedEvent(partial, source, options);
      expect(result.status).to.equal("updated");
      expect(row.needsReview).to.equal(false);
      expect(row.venue).to.equal("Correct Hall");
      expect(row.startTime).to.equal("8:00 PM");
      expect(rows).to.have.length(1);
    }
  });

  it("keeps manually corrected titles and dates tied to the source listing", async () => {
    const row = previous("approved", extracted, { title: "My corrected title", startDate: "2026-12-21" });
    await importExtractedEvent(extracted, source, options);
    expect(rows).to.have.length(1);
    expect(row).to.include({ title: "My corrected title", startDate: "2026-12-21", needsReview: false });
    for (let check = 0; check < 3; check++) {
      await reconcileSourceSync({ source, seenCandidates: [row], todayString: "2026-10-20" });
    }
    expect(row.sourceMissingChecks || 0).to.equal(0);
    expect(row.needsReview).to.equal(false);
  });

  it("does not treat changed tracking links as a source change", async () => {
    const row = previous("approved", { ...extracted, sourceUrl: extracted.sourceUrl + "?utm_source=old" });
    const result = await importExtractedEvent({ ...extracted, sourceUrl: extracted.sourceUrl + "/?utm_source=new#tickets" }, source, options);
    expect(result.candidate).to.equal(row);
    expect(row.needsReview).to.equal(false);
    expect(rows).to.have.length(1);
  });

  it("keeps a rejected detail link suppressed after tracking, title and date changes", async () => {
    previous("rejected", { ...extracted, sourceUrl: extracted.sourceUrl + "?utm_source=old" });
    const result = await importExtractedEvent({ ...extracted, title: "Bing Glow Night", startDate: "2026-12-21",
      sourceUrl: "https://www.example.com/events/bing-glow/?utm_source=new" }, source, options);
    expect(result.status).to.equal("skipped");
    expect(rows).to.have.length(1);
  });

  it("recognizes reviewed titles on a shared calendar after punctuation changes", async () => {
    const raw = { ...extracted, sourceUrl: source.url };
    previous("approved", raw);
    await importExtractedEvent({ ...raw, title: "BING GLOW" }, source, options);
    expect(rows).to.have.length(1);
  });

  it("allows a genuinely different showtime", async () => {
    previous("approved");
    const result = await importExtractedEvent({ ...extracted, startTime: "6 PM" }, source, options);
    expect(result.status).to.equal("created");
    expect(rows).to.have.length(2);
  });

  it("clears review on initial approval and does not restore it on the next import", async () => {
    const row = previous("pending", extracted, { needsReview: true, reviewReason: "Check details" });
    const res = response();
    await approve({ params: { id: row._id }, body: {}, user: { userId: "admin" } }, res);
    expect(res.code).to.equal(201);
    expect(row).to.include({ status: "approved", needsReview: false });
    expect(published[0].needsImportReview).to.equal(false);
    await importExtractedEvent(extracted, source, options);
    expect(row.needsReview).to.equal(false);
    expect(rows).to.have.length(1);
  });

  it("reviews a genuine change once and remembers Apply Update and its corrections", async () => {
    const row = previous("approved");
    const changed = { ...extracted, venue: "Changed Hall" };
    await importExtractedEvent(changed, source, options);
    expect(row.needsReview).to.equal(true);
    const res = response();
    await approve({ params: { id: row._id }, body: { event: { title: "Admin title" } }, user: { userId: "admin" } }, res);
    expect(res.code).to.equal(200);
    for (let run = 0; run < 2; run++) await importExtractedEvent(changed, source, options);
    expect(row).to.include({ needsReview: false, title: "Admin title", venue: "Changed Hall" });
    expect(rows).to.have.length(1);
  });
});
