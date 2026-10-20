import Event from "../../models/Event.js";
import ImportCandidate from "../../models/ImportCandidate.js";
import { canonicalEventUrl } from "./detectDuplicate.js";
import { parseEventTime } from "./dateParsing.js";
import { findPreviousSourceCandidate } from "./previousDecision.js";

const REVIEW_AFTER_MISSING_CHECKS = 2;
const TRACKED_CHANGE_FIELDS = [
  "title",
  "description",
  "town",
  "category",
  "categories",
  "venue",
  "address",
  "startDate",
  "endDate",
  "startTime",
  "endTime",
  "scheduleType",
  "recurrence",
  "price",
  "ticketUrl",
  "sourceUrl",
];

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSourceKeyPart(value) {
  return cleanText(value).toLowerCase();
}

function normalizeUrl(value) {
  const canonical = canonicalEventUrl(value);
  if (canonical) return canonical;
  const text = cleanText(value);
  if (!text) return "";

  try {
    const url = new URL(text);
    url.hash = "";
    const pathname = url.pathname.replace(/\/+$/, "") || "/";
    url.pathname = pathname;
    return url.toString().replace(/\/$/, "");
  } catch {
    return text.replace(/\/+$/, "");
  }
}

function normalizeComparableValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeComparableValue).filter((item) => item !== "");
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((normalized, key) => {
        const nextValue = normalizeComparableValue(value[key]);
        if (nextValue !== "" && nextValue !== undefined) {
          normalized[key] = nextValue;
        }
        return normalized;
      }, {});
  }

  if (typeof value === "string") return cleanText(value);
  return value ?? "";
}

function valuesEqual(a, b) {
  return JSON.stringify(normalizeComparableValue(a)) === JSON.stringify(normalizeComparableValue(b));
}

export function buildSourceKey(candidate, source = {}) {
  const sourceUrl = normalizeUrl(candidate?.sourceUrl);
  const sourceRootUrl = normalizeUrl(source?.url);

  if (sourceUrl && sourceUrl !== sourceRootUrl) {
    return [sourceUrl, candidate?.startDate || "", parseEventTime(candidate?.startTime) || ""].join("|");
  }

  return [
    sourceUrl || sourceRootUrl,
    normalizeSourceKeyPart(candidate?.title),
    normalizeSourceKeyPart(candidate?.town),
    normalizeSourceKeyPart(candidate?.startDate),
    normalizeSourceKeyPart(parseEventTime(candidate?.startTime)),
  ]
    .filter(Boolean)
    .join("|");
}

export function buildSourceSnapshot(candidate) {
  return TRACKED_CHANGE_FIELDS.reduce((snapshot, field) => {
    const value = candidate?.[field];
    if (value !== undefined && value !== null && value !== "") {
      snapshot[field] = field === "sourceUrl" || field === "ticketUrl"
        ? normalizeUrl(value)
        : normalizeComparableValue(value);
    }
    return snapshot;
  }, {});
}

export function diffSourceSnapshots(previous = {}, next = {}) {
  const diff = {};
  const keys = new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]);

  keys.forEach((key) => {
    if (!valuesEqual(previous?.[key], next?.[key])) {
      diff[key] = {
        previous: previous?.[key],
        next: next?.[key],
      };
    }
  });

  return diff;
}

function isCandidateFuture(candidate, todayString) {
  const date = cleanText(candidate?.startDate);
  return date && date >= todayString;
}

function buildReviewNote(candidate, checks) {
  const sourceName = cleanText(candidate?.sourceName) || "the source";
  return `Possibly deleted or cancelled: not found on ${sourceName} for ${checks} successful importer checks.`;
}

async function propagateCandidateReviewToEvent(candidate) {
  if (!candidate?.approvedEvent) return;

  await Event.findByIdAndUpdate(candidate.approvedEvent, {
    $set: {
      sourceMissingSince: candidate.sourceMissingSince,
      sourceMissingChecks: candidate.sourceMissingChecks,
      needsImportReview: Boolean(candidate.needsReview),
      importReviewReason: candidate.reviewReason,
      sourceSnapshot: candidate.sourceSnapshot,
      sourceChangeDiff: candidate.sourceChangeDiff,
      sourceLastChangedAt: candidate.sourceLastChangedAt,
      lastSyncedAt: candidate.lastSeenAt,
    },
  });
}

async function clearEventMissingState(candidate) {
  if (!candidate?.approvedEvent) return;

  await Event.findByIdAndUpdate(candidate.approvedEvent, {
    $set: {
      sourceMissingChecks: 0,
      needsImportReview: Boolean(candidate.needsReview),
      importReviewReason: candidate.reviewReason,
      sourceSnapshot: candidate.sourceSnapshot,
      sourceChangeDiff: candidate.sourceChangeDiff,
      sourceLastChangedAt: candidate.sourceLastChangedAt,
      lastSyncedAt: candidate.lastSeenAt,
    },
    $unset: {
      sourceMissingSince: "",
    },
  });
}

export async function reconcileSourceSync({
  source,
  seenCandidates,
  todayString,
  checkedAt = new Date(),
  reviewAfterMissingChecks = REVIEW_AFTER_MISSING_CHECKS,
} = {}) {
  if (!source?._id || !todayString) {
    return {
      seenTracked: 0,
      missingFirstSeen: 0,
      missingStill: 0,
      needsReview: 0,
      changed: 0,
    };
  }

  const summary = {
    seenTracked: 0,
    missingFirstSeen: 0,
    missingStill: 0,
    needsReview: 0,
    changed: 0,
  };
  const seenKeys = new Set();

  for (const candidate of seenCandidates || []) {
    if (!isCandidateFuture(candidate, todayString)) continue;
    const sourceKey = candidate.sourceKey || buildSourceKey(candidate, source);
    if (!sourceKey) continue;
    seenKeys.add(sourceKey);
    summary.seenTracked += 1;
  }

  const trackedCandidates = await ImportCandidate.find({
    source: source._id,
    status: { $in: ["pending", "approved"] },
    startDate: { $gte: todayString },
  }).limit(1000);

  for (const candidate of trackedCandidates) {
    const sourceKey = candidate.sourceKey || buildSourceKey(candidate, source);
    if (!sourceKey) continue;

    if (seenKeys.has(sourceKey)) {
      if (candidate.sourceMissingSince || candidate.sourceMissingChecks || candidate.reviewReason?.includes("deleted or cancelled")) {
        candidate.sourceMissingSince = undefined;
        candidate.sourceMissingChecks = 0;
        if (!candidate.sourceChangeDiff || !Object.keys(candidate.sourceChangeDiff || {}).length) {
          candidate.needsReview = false;
          candidate.reviewReason = undefined;
        }
        await candidate.save();
        await clearEventMissingState(candidate);
      }
      continue;
    }

    candidate.sourceKey = sourceKey;
    candidate.sourceMissingSince = candidate.sourceMissingSince || checkedAt;
    candidate.sourceMissingChecks = (candidate.sourceMissingChecks || 0) + 1;

    if (candidate.sourceMissingChecks >= reviewAfterMissingChecks) {
      candidate.needsReview = true;
      candidate.reviewReason = buildReviewNote(candidate, candidate.sourceMissingChecks);
      summary.needsReview += 1;
    } else {
      summary.missingFirstSeen += 1;
    }

    if (candidate.sourceMissingChecks > 1) {
      summary.missingStill += 1;
    }

    await candidate.save();
    await propagateCandidateReviewToEvent(candidate);
  }

  return summary;
}

export async function recordSeenSourceCandidate(candidate, source, { checkedAt = new Date() } = {}) {
  let sourceKey = buildSourceKey(candidate, source);
  const sourceUrl = normalizeUrl(candidate?.sourceUrl);
  const sourceRootUrl = normalizeUrl(source?.url);
  const lookupConditions = [];
  if (sourceKey) {
    lookupConditions.push({ source: source?._id, sourceKey });
  }
  if (sourceUrl && sourceUrl !== sourceRootUrl && candidate.startTime) {
    lookupConditions.push({ source: source?._id, sourceUrl, startDate: candidate.startDate,
      $or: [{ startTime: candidate.startTime }, { startTime: "" }, { startTime: { $exists: false } }] });
  }
  let existingCandidate = sourceKey
    ? await ImportCandidate.findOne({
        $or: lookupConditions,
        status: { $in: ["pending", "approved", "duplicate", "error"] },
      })
    : null;
  if (!existingCandidate && !candidate.startTime && sourceUrl && sourceUrl !== sourceRootUrl) {
    const possibleOccurrences = await ImportCandidate.find({ source: source?._id, sourceUrl,
      startDate: candidate.startDate, status: { $in: ["pending", "approved", "duplicate", "error"] } }).limit(2);
    // Only reuse a previous time when the page identifies one occurrence.
    if (possibleOccurrences.length === 1) existingCandidate = possibleOccurrences[0];
  }
  if (!existingCandidate) existingCandidate = await findPreviousSourceCandidate(candidate, source,
    ["pending", "approved", "duplicate", "error"]);
  const previousSnapshot = existingCandidate?.sourceSnapshot || {};
  const nextSnapshot = buildSourceSnapshot(candidate);
  // A partial calendar response must not erase details already reviewed.
  for (const field of ["venue", "address", "startTime", "endTime"]) {
    if (!cleanText(candidate[field]) && cleanText(existingCandidate?.[field])) {
      candidate[field] = previousSnapshot[field] || existingCandidate[field];
      if (previousSnapshot[field] || !Object.keys(previousSnapshot).length) {
        nextSnapshot[field] = previousSnapshot[field] || candidate[field];
      }
    }
  }
  sourceKey = buildSourceKey(candidate, source);
  const diff = existingCandidate ? diffSourceSnapshots(buildSourceSnapshot(previousSnapshot), nextSnapshot) : {};
  const hasDiff = Object.keys(diff).length > 0;
  if (existingCandidate?.status === "approved" && !hasDiff) {
    // Keep accepted/manual corrections separate from the source baseline.
    for (const field of TRACKED_CHANGE_FIELDS) {
      if (existingCandidate[field] !== undefined) candidate[field] = existingCandidate[field];
    }
  }

  return {
    existingCandidateId: existingCandidate?._id,
    existingCandidateStatus: existingCandidate?.status,
    sourceKey,
    sourceSnapshot: nextSnapshot,
    sourceChangeDiff: hasDiff ? diff : existingCandidate?.sourceChangeDiff,
    sourceLastChangedAt: hasDiff ? checkedAt : existingCandidate?.sourceLastChangedAt,
    sourceChangedThisRun: hasDiff,
    lastSeenAt: checkedAt,
    sourceMissingSince: undefined,
    sourceMissingChecks: 0,
    needsReview: Boolean(existingCandidate?.needsReview && !existingCandidate?.reviewReason?.includes("deleted or cancelled")) || hasDiff,
    reviewReason: hasDiff
      ? "Source details changed since the last importer run. Review before updating the live event."
      : existingCandidate?.reviewReason?.includes("deleted or cancelled")
        ? undefined
        : existingCandidate?.reviewReason,
  };
}

