import express from "express";

import authMiddleware from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import Event from "../models/Event.js";
import EventSource from "../models/EventSource.js";
import ImportCandidate from "../models/ImportCandidate.js";
import { runEventImport } from "../services/eventImporter/runEventImport.js";
import { getFallbackImageUrlForSource } from "../services/eventImporter/imageDiscovery.js";
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
    imageUrl:
      normalizeString(merged.imageUrl) ||
      getFallbackImageUrlForSource(sourceUrl || merged.sourceName),
    bookingUrl: ticketUrl || sourceUrl,
    bookingRequired: false,
    priceRange: normalizeString(merged.price),
    importedBySummitScene: true,
    sourceUrl,
    sourceName: normalizeString(merged.sourceName),
    createdBy: userId,
  };
}

router.get("/candidates", authMiddleware, isAdmin, async (req, res) => {
  try {
    const status = normalizeString(req.query?.status) || "pending";
    const query = status === "all" ? {} : { status };
    const candidates = await ImportCandidate.find(query)
      .sort({ discoveredAt: -1 })
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

router.post("/candidates/:id/reject", authMiddleware, isAdmin, async (req, res) => {
  try {
    const candidate = await ImportCandidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    candidate.status = "rejected";
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
    if (candidate.status !== "pending") {
      return res.status(400).json({ message: "Only pending candidates can be approved." });
    }

    const event = await Event.create(
      candidateToEventPayload(candidate, req.body?.event || {}, req.user.userId)
    );

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
      confidenceScore: { $gte: 90 },
      duplicateOf: { $exists: false },
    }).limit(25);
    const approved = [];
    const errors = [];

    for (const candidate of candidates) {
      try {
        const event = await Event.create(candidateToEventPayload(candidate, {}, req.user.userId));
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
