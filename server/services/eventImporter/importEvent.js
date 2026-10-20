import Event from "../../models/Event.js";
import { createHash } from "node:crypto";
import ImportCandidate from "../../models/ImportCandidate.js";
import { findDuplicateEvent } from "./detectDuplicate.js";
import { isValidFutureDateString } from "./dateParsing.js";
import { normalizeWithAi } from "./aiNormalizer.js";
import { normalizeExtractedEvent } from "./normalizeEvent.js";
import { buildSourceKey, recordSeenSourceCandidate } from "./sourceSync.js";
import { findPreviousSourceCandidate } from "./previousDecision.js";

function buildCandidateQuery(candidate) {
  if (candidate.existingCandidateId) return {
    _id: candidate.existingCandidateId,
    status: { $in: ["pending", "approved", "duplicate", "error"] },
  };
  return {
    $or: [
      ...(candidate.existingCandidateId ? [{ _id: candidate.existingCandidateId }] : []),
      { source: candidate.source, sourceKey: candidate.sourceKey },
      {
        sourceUrl: candidate.sourceUrl,
        startDate: candidate.startDate,
        title: candidate.title,
        ...(candidate.startTime ? { startTime: candidate.startTime } : {}),
      },
    ],
    status: { $in: ["pending", "approved", "duplicate", "error"] },
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
  candidate.sourceKey = buildSourceKey(candidate, source);
  candidate.identityKey = createHash("sha256").update(`${source._id}|${candidate.sourceKey}`).digest("hex");

  // A rejection is a persistent decision about this source listing. Check it
  // before source-change tracking so edits cannot bring it back for review.
  const rejectedQuery = { ...buildCandidateQuery(candidate), status: "rejected" };
  if (candidate.sourceUrl &&
      candidate.sourceUrl.replace(/\/+$/, "") !== String(source.url || "").replace(/\/+$/, "")) {
    rejectedQuery.$or.push({ source: candidate.source, sourceUrl: candidate.sourceUrl });
  }
  let rejected = await ImportCandidate.findOne(rejectedQuery);
  if (!rejected) rejected = await findPreviousSourceCandidate(candidate, source, ["rejected"]);
  if (!rejected && candidate.town && candidate.startDate) {
    // The same listing is often syndicated by tourism and venue calendars.
    // Keep rejection decisions across sources, while preserving other dates.
    const rejectedOccurrences = await ImportCandidate.find({
      status: "rejected", town: candidate.town,
      $or: [{ startDate: candidate.startDate }, { scheduleType: "recurring" }],
    }).select("title town startDate endDate startTime endTime venue sourceUrl ticketUrl scheduleType recurrence reviewedAt reviewedBy").limit(2000);
    rejected = findDuplicateEvent(candidate, rejectedOccurrences)?.event;
  }
  if (rejected) {
    // Earlier importer versions may already have recreated pending copies.
    // Keep their audit records, but remove them from the review queue too.
    await ImportCandidate.updateMany(
      { $or: [...rejectedQuery.$or,
          { town: candidate.town, title: candidate.title, startDate: candidate.startDate,
            ...(candidate.startTime ? { startTime: candidate.startTime } : {}) }],
        status: { $in: ["pending", "duplicate", "error"] } },
      { $set: {
        status: "rejected", needsReview: false,
        reviewedAt: rejected.reviewedAt || options.checkedAt || new Date(),
        ...(rejected.reviewedBy ? { reviewedBy: rejected.reviewedBy } : {}),
        importNotes: "Suppressed: this source event was previously rejected.",
      }, $unset: { reviewReason: "" } }
    );
    return { status: "skipped", reason: "This source event was previously rejected.", candidate: rejected };
  }

  const syncFields = await recordSeenSourceCandidate(candidate, source, {
    checkedAt: options.checkedAt || new Date(),
  });
  const sourceChanged = Boolean(syncFields.sourceChangedThisRun);
  const alreadyApproved = syncFields.existingCandidateStatus === "approved";
  delete syncFields.existingCandidateStatus;
  const qualityReason = candidate.reviewReason;
  Object.assign(candidate, syncFields);
  candidate.identityKey = createHash("sha256").update(`${source._id}|${candidate.sourceKey}`).digest("hex");
  if (qualityReason && (!alreadyApproved || sourceChanged)) {
    candidate.needsReview = true;
    candidate.reviewReason = syncFields.reviewReason?.includes(qualityReason)
      ? syncFields.reviewReason : [qualityReason, syncFields.reviewReason].filter(Boolean).join(" ");
    candidate.confidenceScore = Math.min(candidate.confidenceScore, 75);
  }
  delete candidate.sourceChangedThisRun;

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
    if (existingCandidate.status === "approved") {
      existingCandidate.set({
        ...candidate,
        status: "approved",
        approvedEvent: existingCandidate.approvedEvent,
        reviewedAt: existingCandidate.reviewedAt,
        reviewedBy: existingCandidate.reviewedBy,
      });
      await existingCandidate.save();

      if (existingCandidate.approvedEvent) {
        await Event.findByIdAndUpdate(existingCandidate.approvedEvent, {
          $set: {
            sourceSnapshot: existingCandidate.sourceSnapshot,
            sourceChangeDiff: existingCandidate.sourceChangeDiff,
            sourceLastChangedAt: existingCandidate.sourceLastChangedAt,
            needsImportReview: Boolean(existingCandidate.needsReview),
            importReviewReason: existingCandidate.reviewReason,
            lastSyncedAt: existingCandidate.lastSeenAt,
          },
          $unset: {
            sourceMissingSince: "",
          },
        });
      }

      return { status: "updated", candidate: existingCandidate, sourceChanged };
    }

    const [existingEvents, existingCandidates] = await Promise.all([
      Event.find(buildExistingEventDuplicateQuery(candidate))
        .select("title town date time locationName location bookingUrl sourceUrl scheduleType recurrence")
        .limit(500),
      ImportCandidate.find({
        _id: { $ne: existingCandidate._id },
        town: candidate.town,
        $or: [{ startDate: candidate.startDate }, { scheduleType: "recurring" }],
        status: { $in: ["pending", "approved"] },
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
      ...(duplicate ? { needsReview: false, reviewReason: undefined } : {}),
      duplicateOf: duplicate?.event?._id,
      confidenceScore: duplicate ? Math.min(candidate.confidenceScore, 70) : candidate.confidenceScore,
      importNotes: duplicate
        ? `Possible duplicate: ${duplicate.reason}`
        : candidate.importNotes,
    });
    await existingCandidate.save();
    return { status: "updated", candidate: existingCandidate, duplicate, sourceChanged };
  }

  const [existingEvents, existingCandidates] = await Promise.all([
    Event.find(buildExistingEventDuplicateQuery(candidate))
      .select("title town date time locationName location bookingUrl sourceUrl scheduleType recurrence")
      .limit(500),
    ImportCandidate.find({
      town: candidate.town,
      $or: [{ startDate: candidate.startDate }, { scheduleType: "recurring" }],
      status: { $in: ["pending", "approved"] },
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

  let savedCandidate;
  try { savedCandidate = await ImportCandidate.create({
    ...candidate,
    status: candidateStatus,
    ...(duplicate ? { needsReview: false, reviewReason: undefined } : {}),
    duplicateOf: duplicate?.event?._id,
    confidenceScore: duplicate
      ? Math.min(candidate.confidenceScore, 70)
      : candidate.confidenceScore,
    importNotes: duplicate
      ? `Possible duplicate: ${duplicate.reason}`
      : candidate.importNotes,
  }); } catch (error) {
    if (error.code !== 11000) throw error;
    const winner = await ImportCandidate.findOne({ identityKey: candidate.identityKey });
    if (!winner) throw error;
    return { status: "skipped", candidate: winner, reason: "Occurrence already imported by another run." };
  }

  return {
    status: duplicate ? "duplicate" : "created",
    candidate: savedCandidate,
    duplicate,
    sourceChanged,
  };
}
