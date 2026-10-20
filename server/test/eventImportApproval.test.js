import { expect } from "chai";
import router from "../routes/eventImport.js";
import Event from "../models/Event.js";
import ImportCandidate from "../models/ImportCandidate.js";

describe("imported event reapproval", () => {
  const handler = router.stack.find((layer) =>
    layer.route?.path === "/candidates/:id/approve"
  ).route.stack.at(-1).handle;

  it("blocks approval of a duplicate already published after the queue was loaded", async () => {
    const original = { findById: ImportCandidate.findById, find: Event.find, create: Event.create };
    let created = false;
    const candidate = { status: "pending", title: "Literary Cabaret", town: "Banff", startDate: "2026-12-20", startTime: "8 PM",
      toObject() { return { ...this }; }, async save() {} };
    try {
      ImportCandidate.findById = async () => candidate;
      Event.find = () => ({ select() { return this; }, limit: async () => [{ _id: "published", title: candidate.title, town: "Banff", date: candidate.startDate, time: "20:00" }] });
      Event.create = async () => { created = true; };
      const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
      await handler({ params: { id: "candidate" }, body: {}, user: { userId: "admin" } }, res);
      expect(res.code).to.equal(409);
      expect(res.body.existingEventId).to.equal("published");
      expect(candidate.status).to.equal("duplicate");
      expect(candidate.needsReview).to.equal(false);
      expect(created).to.equal(false);
    } finally { ImportCandidate.findById = original.findById; Event.find = original.find; Event.create = original.create; }
  });

  for (const stale of [true, false]) {
    it(`approves an existing event ${stale ? "with" : "without"} missing-source markers without conflicting update paths`, async () => {
      const originalFind = ImportCandidate.findById;
      const originalUpdate = Event.findByIdAndUpdate;
      const eventId = "507f1f77bcf86cd799439012";
      const userId = "507f1f77bcf86cd799439013";
      let saved = false;
      const candidate = {
        status: "approved", approvedEvent: eventId,
        title: "Community Concert", category: "Music & Nightlife", town: "Banff",
        startDate: "2026-12-20", needsReview: true,
        sourceMissingSince: stale ? new Date("2026-10-15") : undefined,
        sourceMissingChecks: stale ? 3 : 0,
        reviewReason: stale ? "Possibly deleted or cancelled" : undefined,
        toObject() { return { ...this }; },
        async save() { saved = true; },
      };
      let captured;
      const event = { _id: eventId, title: "Updated concert" };
      try {
        ImportCandidate.findById = async () => candidate;
        Event.findByIdAndUpdate = async (id, update, options) => {
          expect(id).to.equal(eventId);
          expect(options).to.include({ new: true, runValidators: true });
          // Exercise the same conflicting-path constraint as MongoDB.
          const overlap = Object.keys(update.$set).filter((key) => key in update.$unset);
          if (overlap.length) throw new Error(`Updating the path '${overlap[0]}' would create a conflict`);
          captured = update;
          return event;
        };
        const res = {
          code: 200,
          status(code) { this.code = code; return this; },
          json(body) { this.body = body; return this; },
        };
        await handler({ params: { id: "candidate" }, body: { event: { title: "Updated concert" } }, user: { userId } }, res);
        expect(res.code).to.equal(200);
        expect(res.body.event).to.equal(event);
        expect(captured.$set).to.include({ title: "Updated concert", needsImportReview: false, sourceMissingChecks: 0 });
        expect(captured.$set).to.not.have.property("createdBy");
        expect(captured.$set).to.not.have.property("sourceMissingSince");
        expect(captured.$set).to.not.have.property("importReviewReason");
        expect(captured.$unset).to.deep.equal({ sourceMissingSince: "", importReviewReason: "" });
        expect(candidate.needsReview).to.equal(false);
        expect(candidate.sourceMissingSince).to.equal(undefined);
        expect(candidate.reviewReason).to.equal(undefined);
        expect(candidate.sourceMissingChecks).to.equal(0);
        expect(candidate.reviewedBy).to.equal(userId);
        expect(saved).to.equal(true);
      } finally {
        ImportCandidate.findById = originalFind;
        Event.findByIdAndUpdate = originalUpdate;
      }
    });
  }
});
