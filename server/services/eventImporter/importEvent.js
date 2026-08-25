import Event from "../../models/Event.js";
import ImportCandidate from "../../models/ImportCandidate.js";
import { findDuplicateEvent } from "./detectDuplicate.js";
import { isValidFutureDateString } from "./dateParsing.js";
import { normalizeWithAi } from "./aiNormalizer.js";
import { normalizeExtractedEvent } from "./normalizeEvent.js";

function buildCandidateQuery(candidate) {
  return {
    sourceUrl: candidate.sourceUrl,
    startDate: candidate.startDate,
    title: candidate.title,
    status: { $in: ["pending", "duplicate", "error"] },
  };
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

function buildExistingEventDuplicateQuery(candidate) {
  return {
    town: candidate.town,
    $or: [
      { date: candidate.startDate },
      { sourceUrl: candidate.sourceUrl },
      { bookingUrl: candidate.ticketUrl || candidate.sourceUrl },
      { scheduleType: "recurring" },
    ],
  };
}

export async function importExtractedEvent(extracted, source, options = {}) {
  const aiCandidate = await normalizeWithAi(extracted).catch((error) => ({
    importNotes: `AI normalization failed: ${error.message}`,
  }));
  const deterministicCandidate = normalizeExtractedEvent(extracted, source, options);
  const candidate = {
    ...deterministicCandidate,
    ...(aiCandidate || {}),
  };
  candidate.description = deterministicCandidate.description;
  candidate.imageUrl = deterministicCandidate.imageUrl;
  candidate.rawExtractedData = deterministicCandidate.rawExtractedData;

  if (
    !candidate.title ||
    !candidate.town ||
    !isValidFutureDateString(candidate.startDate, options.now)
  ) {
    return {
      status: "skipped",
      reason: "Candidate did not include title, town, and future date.",
      candidate,
    };
  }

  const existingCandidate = await ImportCandidate.findOne(buildCandidateQuery(candidate));
  if (existingCandidate) {
    const [existingEvents, existingCandidates] = await Promise.all([
      Event.find(buildExistingEventDuplicateQuery(candidate))
        .select("title town date time locationName location bookingUrl sourceUrl scheduleType recurrence")
        .limit(500),
      ImportCandidate.find({
        _id: { $ne: existingCandidate._id },
        town: candidate.town,
        status: { $in: ["pending", "approved", "duplicate"] },
      }).select("title town startDate startTime endTime venue ticketUrl sourceUrl scheduleType recurrence")
        .limit(500),
    ]);
    const duplicate =
      findDuplicateEvent(candidate, existingEvents) ||
      findDuplicateEvent(
        candidate,
        existingCandidates.map(candidateToDuplicateComparable)
      );
    const nextStatus = duplicate
      ? "duplicate"
      : existingCandidate.status === "duplicate"
        ? "pending"
        : existingCandidate.status;
    existingCandidate.set({
      ...candidate,
      status: nextStatus,
      duplicateOf: duplicate?.event?._id,
      confidenceScore: duplicate ? Math.min(candidate.confidenceScore, 70) : candidate.confidenceScore,
      importNotes: duplicate
        ? `Possible duplicate: ${duplicate.reason}`
        : candidate.importNotes,
    });
    await existingCandidate.save();
    return { status: "updated", candidate: existingCandidate, duplicate };
  }

  const [existingEvents, existingCandidates] = await Promise.all([
    Event.find(buildExistingEventDuplicateQuery(candidate))
      .select("title town date time locationName location bookingUrl sourceUrl scheduleType recurrence")
      .limit(500),
    ImportCandidate.find({
      town: candidate.town,
      status: { $in: ["pending", "approved", "duplicate"] },
    }).select("title town startDate startTime endTime venue ticketUrl sourceUrl scheduleType recurrence")
      .limit(500),
  ]);
  const duplicate =
    findDuplicateEvent(candidate, existingEvents) ||
    findDuplicateEvent(
      candidate,
      existingCandidates.map(candidateToDuplicateComparable)
    );

  const candidateStatus = duplicate ? "duplicate" : "pending";

  const savedCandidate = await ImportCandidate.create({
    ...candidate,
    status: candidateStatus,
    duplicateOf: duplicate?.event?._id,
    confidenceScore: duplicate
      ? Math.min(candidate.confidenceScore, 70)
      : candidate.confidenceScore,
    importNotes: duplicate
      ? `Possible duplicate: ${duplicate.reason}`
      : candidate.importNotes,
  });

  return {
    status: duplicate ? "duplicate" : "created",
    candidate: savedCandidate,
    duplicate,
  };
}
