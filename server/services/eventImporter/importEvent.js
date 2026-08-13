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

export async function importExtractedEvent(extracted, source, options = {}) {
  const aiCandidate = await normalizeWithAi(extracted).catch((error) => ({
    importNotes: `AI normalization failed: ${error.message}`,
  }));
  const deterministicCandidate = normalizeExtractedEvent(extracted, source, options);
  const candidate = {
    ...deterministicCandidate,
    ...(aiCandidate || {}),
  };

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

  const existingEvents = await Event.find({
    town: candidate.town,
    date: candidate.startDate,
  }).select("title town date locationName location bookingUrl");
  const duplicate = findDuplicateEvent(candidate, existingEvents);

  const candidateStatus = duplicate ? "duplicate" : "pending";
  const existingCandidate = await ImportCandidate.findOne(buildCandidateQuery(candidate));
  if (existingCandidate) {
    existingCandidate.set({
      ...candidate,
      status: existingCandidate.status === "pending" ? candidateStatus : existingCandidate.status,
      duplicateOf: duplicate?.event?._id,
      confidenceScore: duplicate ? Math.min(candidate.confidenceScore, 70) : candidate.confidenceScore,
      importNotes: duplicate
        ? `Possible duplicate: ${duplicate.reason}`
        : candidate.importNotes,
    });
    await existingCandidate.save();
    return { status: "updated", candidate: existingCandidate, duplicate };
  }

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
