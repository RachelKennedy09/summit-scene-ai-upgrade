import { expect } from "chai";
import router from "../routes/eventImport.js";
import ImportCandidate from "../models/ImportCandidate.js";

const handler = router.stack.find((layer) => layer.route?.path === "/candidates/reject-selected").route.stack.at(-1).handle;
const id = (number) => String(number).padStart(24, "0");
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

describe("bulk imported event rejection", () => {
  let originals;
  let rows;
  let updates;
  beforeEach(() => {
    originals = { updateMany: ImportCandidate.updateMany, find: ImportCandidate.find };
    updates = 0;
    rows = ["pending", "duplicate", "error", "approved", "rejected"].map((status, index) =>
      ({ _id: id(index + 1), status, needsReview: true, reviewReason: "Review", sourceKey: `event-${index}`, title: `Event ${index}` }));
    ImportCandidate.updateMany = async (query, update) => {
      updates++;
      for (const row of rows.filter((item) => query._id.$in.includes(item._id) && query.status.$in.includes(item.status))) {
        Object.assign(row, update.$set);
        for (const field of Object.keys(update.$unset || {})) delete row[field];
      }
    };
    ImportCandidate.find = (query) => ({ select: async () => rows.filter((row) => query._id.$in.includes(row._id) && row.status === query.status) });
  });
  afterEach(() => { ImportCandidate.updateMany = originals.updateMany; ImportCandidate.find = originals.find; });

  it("rejects selected unpublished events in one write and preserves their importer history", async () => {
    const res = response();
    await handler({ body: { candidateIds: [id(1), id(2), id(3), id(4), id(5), id(6)] }, user: { userId: "admin" } }, res);
    expect(res.code).to.equal(200);
    expect(updates).to.equal(1);
    expect(res.body.rejectedIds).to.deep.equal([id(1), id(2), id(3), id(5)]);
    expect(res.body.skippedIds).to.deep.equal([id(4), id(6)]);
    for (const row of rows.slice(0, 3)) {
      expect(row).to.include({ status: "rejected", needsReview: false, reviewedBy: "admin" });
      expect(row).to.have.property("sourceKey");
      expect(row).to.have.property("title");
      expect(row).to.not.have.property("reviewReason");
    }
    expect(rows[3]).to.include({ status: "approved", needsReview: true });
  });
  it("can retry an already completed batch without changing rejection history", async () => {
    const req = { body: { candidateIds: [id(1), id(1)] }, user: { userId: "admin" } };
    await handler(req, response());
    const reviewedAt = rows[0].reviewedAt;
    const res = response();
    await handler(req, res);
    expect(res.body.rejectedIds).to.deep.equal([id(1)]);
    expect(res.body.skippedIds).to.deep.equal([]);
    expect(rows[0].reviewedAt).to.equal(reviewedAt);
  });
  for (const candidateIds of [undefined, [], ["invalid"], [id(1), null], Array(101).fill(id(1))]) {
    it(`rejects an invalid selection (${JSON.stringify(candidateIds)?.slice(0, 55) || "missing"}) before writing`, async () => {
      const res = response();
      await handler({ body: { candidateIds }, user: { userId: "admin" } }, res);
      expect(res.code).to.equal(400);
      expect(updates).to.equal(0);
      expect(rows[0].status).to.equal("pending");
    });
  }
  it("accepts the maximum displayed batch of 100", async () => {
    const res = response();
    await handler({ body: { candidateIds: Array.from({ length: 100 }, (_, index) => id(index + 1)) }, user: { userId: "admin" } }, res);
    expect(res.code).to.equal(200);
    expect(updates).to.equal(1);
  });
});
