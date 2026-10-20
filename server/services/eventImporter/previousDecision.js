import ImportCandidate from "../../models/ImportCandidate.js";
import { canonicalEventUrl, findDuplicateEvent } from "./detectDuplicate.js";
import { parseEventTime } from "./dateParsing.js";

// Include old records with tracking links and edited dates/titles. The stored
// source snapshot identifies what was imported before the admin corrected it.
export async function findPreviousSourceCandidate(candidate, source, statuses) {
  const url = canonicalEventUrl(candidate.sourceUrl);
  const detail = url && url !== canonicalEventUrl(source.url);
  const conditions = [
    { source: source._id, startDate: candidate.startDate },
    { source: source._id, "sourceSnapshot.startDate": candidate.startDate },
  ];
  if (detail) {
    const parsed = new URL(url);
    const path = `${parsed.host}${parsed.pathname}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    conditions.push({ sourceUrl: new RegExp(`^https?://(?:www\\.)?${path}/?(?:[?#]|$)`, "i") });
  }
  const rows = await ImportCandidate.find({ status: { $in: statuses }, $or: conditions }).limit(2000);
  const matches = rows.filter((row) => {
    const snapshot = row.sourceSnapshot || row;
    const sameUrl = detail && canonicalEventUrl(row.sourceUrl) === url;
    if (sameUrl && row.status === "rejected") return true;
    const datesMatch = row.startDate === candidate.startDate || snapshot.startDate === candidate.startDate;
    const incomingTime = parseEventTime(candidate.startTime);
    const time = parseEventTime(snapshot.startTime || row.startTime);
    if (!datesMatch || (incomingTime && time && incomingTime !== time)) return false;
    if (sameUrl) return true;
    return String(row.source) === String(source._id) && Boolean(
      findDuplicateEvent(candidate, [row]) || findDuplicateEvent(candidate, [snapshot])
    );
  });
  // Missing times cannot distinguish two performances on one detail page.
  if (matches.length > 1 && statuses[0] !== "rejected" && !candidate.startTime) return null;
  return matches.find((row) => row.status === "approved") || matches[0] || null;
}
