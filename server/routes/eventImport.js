import express from "express";

import authMiddleware from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import Event from "../models/Event.js";
import EventSource from "../models/EventSource.js";
import ImportCandidate from "../models/ImportCandidate.js";
import { findDuplicateEvent } from "../services/eventImporter/detectDuplicate.js";
import { runEventImport } from "../services/eventImporter/runEventImport.js";
import { STARTER_EVENT_SOURCES } from "../services/eventImporter/starterSources.js";

const router = express.Router();

function normalizeString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function isDateRange(startDate, endDate) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(String(startDate || "")) &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(endDate || "")) &&
    endDate > startDate
  );
}

function normalizeRecurrence(value) {
  if (!value || typeof value !== "object") return undefined;

  const weekdays = Array.isArray(value.weekdays)
    ? value.weekdays.filter(Boolean)
    : [];
  const dates = Array.isArray(value.dates) ? value.dates.filter(Boolean) : [];

  return {
    frequency: normalizeString(value.frequency) || "daily",
    untilDate: normalizeString(value.untilDate),
    weekdays,
    dates,
  };
}

function candidateToEventPayload(candidate, overrides = {}, userId) {
  const merged = { ...candidate.toObject(), ...overrides };
  const venue = normalizeString(merged.venue);
  const address = normalizeString(merged.address);
  const sourceUrl = normalizeString(merged.sourceUrl);
  const ticketUrl = normalizeString(merged.ticketUrl);
  const startDate = normalizeString(merged.startDate);
  const endDate = normalizeString(merged.endDate);
  const hasDateRange = isDateRange(startDate, endDate);
  const mergedRecurrence = normalizeRecurrence(merged.recurrence);
  const isRecurring = merged.scheduleType === "recurring" || hasDateRange;

  return {
    title: normalizeString(merged.title),
    description: normalizeString(merged.description),
    town: normalizeString(merged.town),
    category: normalizeString(merged.category || "Other"),
    categories: Array.isArray(merged.categories) && merged.categories.length
      ? merged.categories
      : [normalizeString(merged.category || "Other")],
    date: startDate,
    time: normalizeString(merged.startTime),
    endTime: normalizeString(merged.endTime),
    scheduleType: isRecurring ? "recurring" : "single",
    isAllDay: false,
    recurrence: isRecurring
      ? mergedRecurrence
        ? {
            ...mergedRecurrence,
            untilDate: mergedRecurrence.untilDate || (hasDateRange ? endDate : undefined),
          }
        : {
          frequency: "daily",
          untilDate: endDate,
          weekdays: [],
          dates: [],
        }
      : undefined,
    locationName: venue,
    address,
    latitude: merged.latitude,
    longitude: merged.longitude,
    location: [venue, address].filter(Boolean).join(" - ") || undefined,
    imageUrl: normalizeString(merged.imageUrl),
    bookingUrl: ticketUrl || sourceUrl,
    bookingRequired: false,
    priceRange: normalizeString(merged.price),
    importedBySummitScene: true,
    sourceUrl,
    sourceName: normalizeString(merged.sourceName),
    sourceMissingSince: merged.sourceMissingSince,
    sourceMissingChecks: merged.sourceMissingChecks || 0,
    needsImportReview: Boolean(merged.needsReview),
    importReviewReason: normalizeString(merged.reviewReason),
    sourceSnapshot: merged.sourceSnapshot,
    sourceChangeDiff: merged.sourceChangeDiff,
    sourceLastChangedAt: merged.sourceLastChangedAt,
    lastSyncedAt: merged.lastSeenAt,
    createdBy: userId,
  };
}

async function checkLiveDuplicate(payload, candidate) {
  const existing = await Event.find({ town: payload.town,
    $or: [{ date: payload.date }, { scheduleType: "recurring" }] })
    .select("title town date time locationName location bookingUrl sourceUrl scheduleType recurrence").limit(2000);
  const duplicate = findDuplicateEvent(payload, existing);
  if (duplicate) {
    candidate.status = "duplicate";
    candidate.needsReview = false;
    candidate.reviewReason = undefined;
    candidate.duplicateOf = duplicate.event._id;
    candidate.importNotes = `Already published: ${duplicate.reason}`;
    await candidate.save();
  }
  return duplicate;
}

function candidateToDuplicateComparable(candidate) {
  return {
    _id: candidate._id,
    title: candidate.title,
    town: candidate.town,
    date: candidate.startDate,
    time: candidate.startTime,
    locationName: candidate.venue,
    location: candidate.venue,
    bookingUrl: candidate.ticketUrl,
    sourceUrl: candidate.sourceUrl,
    scheduleType: candidate.scheduleType,
    recurrence: candidate.recurrence,
  };
}

router.get("/candidates", authMiddleware, isAdmin, async (req, res) => {
  try {
    const status = normalizeString(req.query?.status) || "pending";
    const query =
      status === "all"
        ? {}
        : status === "review" || status === "needs-review"
          ? { needsReview: true, status: { $in: ["pending", "approved", "error"] } }
          : status === "pending"
            ? { $or: [{ status: "pending" }, { needsReview: true, status: { $in: ["approved", "error"] } }] }
            : { status };
    const candidates = await ImportCandidate.find(query)
      .sort({ needsReview: -1, sourceLastChangedAt: -1, discoveredAt: -1 })
      .limit(100)
      .populate("duplicateOf", "title town date locationName")
      .populate("approvedEvent", "title town date");

    return res.json(candidates);
  } catch (error) {
    console.error("Error loading import candidates:", error);
    return res.status(500).json({ message: "Could not load import candidates." });
  }
});

router.get("/candidates/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const candidate = await ImportCandidate.findById(req.params.id)
      .populate("duplicateOf", "title town date locationName")
      .populate("approvedEvent", "title town date");
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });
    return res.json(candidate);
  } catch (error) {
    console.error("Error loading import candidate:", error);
    return res.status(500).json({ message: "Could not load import candidate." });
  }
});

router.patch("/candidates/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const candidate = await ImportCandidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });
    if (candidate.status !== "pending") {
      return res.status(400).json({ message: "Only pending candidates can be edited." });
    }

    const allowedFields = [
      "title",
      "description",
      "town",
      "category",
      "categories",
      "venue",
      "address",
      "latitude",
      "longitude",
      "startDate",
      "endDate",
      "startTime",
      "endTime",
      "scheduleType",
      "recurrence",
      "price",
      "ticketUrl",
      "imageUrl",
      "importNotes",
    ];

    for (const field of allowedFields) {
      if (req.body?.[field] !== undefined) {
        candidate[field] = req.body[field];
      }
    }

    await candidate.save();
    return res.json(candidate);
  } catch (error) {
    console.error("Error updating import candidate:", error);
    return res.status(400).json({
      message: error.message || "Could not update import candidate.",
    });
  }
});

router.post("/candidates/reject-selected", authMiddleware, isAdmin, async (req, res) => {
  const requestedIds = req.body?.candidateIds;
  if (!Array.isArray(requestedIds) || requestedIds.length === 0 || requestedIds.length > 100 ||
      requestedIds.some((id) => typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id))) {
    return res.status(400).json({ message: "Select between 1 and 100 valid imported events." });
  }
  const candidateIds = [...new Set(requestedIds.map((id) => id.toLowerCase()))];
  try {
    // Retain rejection history for the importer. Published events are excluded.
    await ImportCandidate.updateMany({ _id: { $in: candidateIds }, status: { $in: ["pending", "duplicate", "error"] } }, {
      $set: { status: "rejected", needsReview: false, reviewedAt: new Date(), reviewedBy: req.user.userId },
      $unset: { reviewReason: "" },
    });
    const rejected = await ImportCandidate.find({ _id: { $in: candidateIds }, status: "rejected" }).select("_id");
    const rejectedIds = rejected.map((candidate) => String(candidate._id));
    const rejectedSet = new Set(rejectedIds);
    return res.json({ rejectedIds, skippedIds: candidateIds.filter((id) => !rejectedSet.has(id)) });
  } catch (error) {
    console.error("Error rejecting selected import candidates:", error);
    return res.status(500).json({ message: "Could not reject selected events. Refresh the list and try again." });
  }
});

router.post("/candidates/:id/reject", authMiddleware, isAdmin, async (req, res) => {
  try {
    const candidate = await ImportCandidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    candidate.status = "rejected";
    candidate.needsReview = false;
    candidate.reviewReason = undefined;
    candidate.reviewedAt = new Date();
    candidate.reviewedBy = req.user.userId;
    candidate.importNotes = normalizeString(req.body?.importNotes) || candidate.importNotes;
    await candidate.save();

    return res.json(candidate);
  } catch (error) {
    console.error("Error rejecting import candidate:", error);
    return res.status(500).json({ message: "Could not reject import candidate." });
  }
});

router.post("/candidates/:id/approve", authMiddleware, isAdmin, async (req, res) => {
  try {
    const candidate = await ImportCandidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    if (candidate.status === "approved" && candidate.approvedEvent) {
      const updatePayload = candidateToEventPayload(
        candidate,
        req.body?.event || {},
        req.user.userId
      );
      delete updatePayload.createdBy;
      // These fields are cleared by $unset below. MongoDB rejects any path
      // present in both operators, even when the source payload is stale.
      delete updatePayload.sourceMissingSince;
      delete updatePayload.importReviewReason;

      const event = await Event.findByIdAndUpdate(
        candidate.approvedEvent,
        {
          $set: {
            ...updatePayload,
            needsImportReview: false,
            sourceMissingChecks: 0,
          },
          $unset: {
            sourceMissingSince: "",
            importReviewReason: "",
          },
        },
        { new: true, runValidators: true }
      );

      candidate.needsReview = false;
      candidate.reviewReason = undefined;
      candidate.sourceMissingSince = undefined;
      candidate.sourceMissingChecks = 0;
      candidate.reviewedAt = new Date();
      candidate.reviewedBy = req.user.userId;
      await candidate.save();

      return res.json({ candidate, event });
    }

    if (candidate.status !== "pending") {
      return res.status(400).json({ message: "Only pending candidates can be approved." });
    }

    const payload = candidateToEventPayload(candidate, req.body?.event || {}, req.user.userId);
    const duplicate = await checkLiveDuplicate(payload, candidate);
    if (duplicate) return res.status(409).json({ message: "This event is already published. The duplicate has been removed from the approval queue.", candidate, existingEventId: duplicate.event._id });
    const event = await Event.create(payload);

    candidate.status = "approved";
    candidate.reviewedAt = new Date();
    candidate.reviewedBy = req.user.userId;
    candidate.approvedEvent = event._id;
    await candidate.save();

    return res.status(201).json({ candidate, event });
  } catch (error) {
    console.error("Error approving import candidate:", error);
    return res.status(400).json({
      message: error.message || "Could not approve import candidate.",
    });
  }
});

router.post("/candidates/approve-high-confidence", authMiddleware, isAdmin, async (req, res) => {
  try {
    const candidates = await ImportCandidate.find({
      status: "pending",
      needsReview: { $ne: true },
      confidenceScore: { $gte: 90 },
      duplicateOf: { $exists: false },
    }).limit(25);
    const approved = [];
    const errors = [];

    for (const candidate of candidates) {
      try {
        // Recheck legacy candidates too: their saved score may predate quality checks.
        if (!candidate.venue || !candidate.startTime) {
          candidate.needsReview = true;
          candidate.reviewReason = "Missing venue or start time. Check the source before approval.";
          await candidate.save();
          continue;
        }
        const payload = candidateToEventPayload(candidate, {}, req.user.userId);
        if (await checkLiveDuplicate(payload, candidate)) continue;
        const event = await Event.create(payload);
        candidate.status = "approved";
        candidate.reviewedAt = new Date();
        candidate.reviewedBy = req.user.userId;
        candidate.approvedEvent = event._id;
        await candidate.save();
        approved.push({ candidateId: candidate._id, eventId: event._id });
      } catch (error) {
        errors.push({ candidateId: candidate._id, message: error.message });
      }
    }

    return res.json({ approved, errors });
  } catch (error) {
    console.error("Error approving high-confidence candidates:", error);
    return res.status(500).json({ message: "Could not approve candidates." });
  }
});

router.post("/candidates/cleanup-stale", authMiddleware, isAdmin, async (req, res) => {
  try {
    const result = await ImportCandidate.deleteMany({
      status: "pending",
      title: /^Date:/,
    });

    return res.json({
      message: "Stale date-title import candidates removed.",
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    console.error("Error cleaning stale import candidates:", error);
    return res.status(500).json({ message: "Could not clean stale import candidates." });
  }
});

router.post("/candidates/cleanup-duplicates", authMiddleware, isAdmin, async (req, res) => {
  try {
    const candidates = await ImportCandidate.find({ status: "pending" })
      .sort({ discoveredAt: -1 })
      .limit(500);

    const deletedCandidateIds = [];
    const markedDuplicateIds = [];

    for (const candidate of candidates) {
      const existingEvents = await Event.find({
        town: candidate.town,
        $or: [
          { date: candidate.startDate },
          { sourceUrl: candidate.sourceUrl },
          { bookingUrl: candidate.ticketUrl || candidate.sourceUrl },
          { scheduleType: "recurring" },
        ],
      })
        .select("title town date time locationName location bookingUrl sourceUrl scheduleType recurrence")
        .limit(500);

      const duplicate = findDuplicateEvent(
        candidateToDuplicateComparable(candidate),
        existingEvents
      );

      if (duplicate) {
        candidate.status = "duplicate";
        candidate.duplicateOf = duplicate.event?._id;
        candidate.reviewedAt = new Date();
        candidate.reviewedBy = req.user.userId;
        candidate.importNotes = `Removed from review queue: ${duplicate.reason}`;
        await candidate.save();
        markedDuplicateIds.push(candidate._id);
        continue;
      }

      const olderMatchingCandidate = await ImportCandidate.findOne({
        _id: { $ne: candidate._id },
        status: { $in: ["pending", "approved"] },
        town: candidate.town,
        title: candidate.title,
        startDate: candidate.startDate,
        startTime: candidate.startTime,
        $or: [{ discoveredAt: { $lt: candidate.discoveredAt } },
          { discoveredAt: candidate.discoveredAt, _id: { $lt: candidate._id } }],
      }).sort({ discoveredAt: 1 });

      if (olderMatchingCandidate) {
        candidate.status = "duplicate";
        candidate.reviewedAt = new Date();
        candidate.reviewedBy = req.user.userId;
        candidate.importNotes = "Removed from review queue: same title already exists in imports.";
        await candidate.save();
        markedDuplicateIds.push(candidate._id);
      }
    }

    return res.json({
      message: "Duplicate import candidates removed from the pending queue.",
      deletedCount: deletedCandidateIds.length,
      markedDuplicateCount: markedDuplicateIds.length,
    });
  } catch (error) {
    console.error("Error cleaning duplicate import candidates:", error);
    return res.status(500).json({ message: "Could not clean duplicate import candidates." });
  }
});

router.post("/run", authMiddleware, isAdmin, async (req, res) => {
  try {
    const summary = await runEventImport();
    return res.json(summary);
  } catch (error) {
    console.error("Error running event import:", error);
    return res.status(500).json({ message: "Could not run event import." });
  }
});

router.get("/sources", authMiddleware, isAdmin, async (req, res) => {
  try {
    const sources = await EventSource.find({}).sort({ name: 1 });
    return res.json(sources);
  } catch (error) {
    console.error("Error loading event sources:", error);
    return res.status(500).json({ message: "Could not load event sources." });
  }
});

router.post("/sources", authMiddleware, isAdmin, async (req, res) => {
  try {
    const source = await EventSource.create(req.body || {});
    return res.status(201).json(source);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not create source." });
  }
});

router.post("/sources/seed-starter", authMiddleware, isAdmin, async (req, res) => {
  try {
    const sources = [];
    for (const starterSource of STARTER_EVENT_SOURCES) {
      const source = await EventSource.findOneAndUpdate(
        { url: starterSource.url },
        { $set: starterSource },
        { upsert: true, new: true, runValidators: true }
      );
      sources.push(source);
    }

    return res.json({
      message: "Starter event sources are ready.",
      sources,
    });
  } catch (error) {
    console.error("Error seeding starter event sources:", error);
    return res.status(500).json({ message: "Could not seed starter event sources." });
  }
});

router.patch("/sources/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const source = await EventSource.findByIdAndUpdate(req.params.id, req.body || {}, {
      new: true,
      runValidators: true,
    });
    if (!source) return res.status(404).json({ message: "Source not found." });
    return res.json(source);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not update source." });
  }
});

router.delete("/sources/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    const source = await EventSource.findByIdAndDelete(req.params.id);
    if (!source) return res.status(404).json({ message: "Source not found." });

    return res.json({
      message: "Event source deleted.",
      sourceId: source._id,
      sourceName: source.name,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not delete source." });
  }
});

router.post("/sources/:id/retry", authMiddleware, isAdmin, async (req, res) => {
  try {
    const source = await EventSource.findById(req.params.id);
    if (!source) return res.status(404).json({ message: "Source not found." });
    const summary = await runEventImport({ maxSources: 1, sourceId: source._id });
    return res.json(summary);
  } catch (error) {
    return res.status(500).json({ message: "Could not retry source." });
  }
});

export default router;
