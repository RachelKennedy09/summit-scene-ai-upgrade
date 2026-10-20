import { parseEventTime } from "./dateParsing.js";

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value) {
  return new Set(normalizeTitle(value).split(" ").filter((token) =>
    (token.length > 2 || /^\d+$/.test(token)) && !["live", "the", "presents"].includes(token)));
}

export function canonicalEventUrl(value) {
  try {
    const url = new URL(String(value || ""));
    url.hash = "";
    url.hostname = url.hostname.replace(/^www\./, "");
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString().replace(/\/$/, "");
  } catch { return ""; }
}

function jaccardSimilarity(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;

  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return intersection / union;
}

function sameText(left, right) {
  return normalizeTitle(left) && normalizeTitle(left) === normalizeTitle(right);
}

function recurrenceSignature(value) {
  const recurrence = value?.recurrence || {};
  const weekdays = Array.isArray(recurrence.weekdays)
    ? [...recurrence.weekdays].map((day) => String(day).toLowerCase()).sort()
    : [];
  const dates = Array.isArray(recurrence.dates)
    ? [...recurrence.dates].map(String).sort()
    : [];

  return [
    value?.scheduleType || "",
    recurrence.frequency || "",
    weekdays.join(","),
    dates.join(","),
    parseEventTime(value?.startTime || value?.time) || "",
    parseEventTime(value?.endTime) || "",
  ].join("|");
}

export function findDuplicateEvent(candidate, existingEvents = []) {
  const candidateUrl = canonicalEventUrl(candidate?.sourceUrl || candidate?.ticketUrl);
  const candidateIsRecurring =
    candidate?.scheduleType === "recurring" || Boolean(candidate?.recurrence);

  for (const event of existingEvents) {
    const eventUrl = canonicalEventUrl(event?.sourceUrl || event?.bookingUrl || event?.ticketUrl);
    const eventIsRecurring =
      event?.scheduleType === "recurring" || Boolean(event?.recurrence);
    const recurringMismatch =
      candidateIsRecurring && eventIsRecurring &&
      recurrenceSignature(candidate) !== recurrenceSignature(event);
    const candidateDate = candidate?.startDate || candidate?.date;
    const eventDate = event?.startDate || event?.date;
    const sameDate = candidateDate && candidateDate === eventDate;
    const candidateEnd = candidate?.endDate || candidate?.recurrence?.untilDate || candidateDate;
    const eventEnd = event?.endDate || event?.recurrence?.untilDate || eventDate;
    const datesConflict = candidateDate && eventDate && !sameDate &&
      !(candidateIsRecurring && eventIsRecurring && candidateDate <= eventEnd && eventDate <= candidateEnd);
    const sameTown = sameText(candidate?.town, event?.town);
    const candidateTime = parseEventTime(candidate?.startTime || candidate?.time);
    const eventTime = parseEventTime(event?.startTime || event?.time);
    const timesConflict = candidateTime && eventTime && candidateTime !== eventTime;
    if (datesConflict || timesConflict || recurringMismatch) continue;
    const sameTime =
      candidateTime && candidateTime === eventTime;
    const sameVenue =
      sameText(candidate?.venue || candidate?.locationName, event?.venue || event?.locationName) ||
      sameText(candidate?.venue, event?.location);
    const titleScore = jaccardSimilarity(candidate?.title, event?.title);
    // A calendar-wide URL and generic titles cannot identify an occurrence.
    const genericTitle = /^(live music|live entertainment|happy hour|trivia|bingo|karaoke|open mic)$/i.test(normalizeTitle(candidate?.title));
    if (genericTitle && !sameVenue) continue;

    if (
      candidateUrl &&
      eventUrl &&
      candidateUrl === eventUrl &&
      (sameText(candidate?.title, event?.title) || titleScore >= 0.72)
    ) {
      return { event, reason: "same source URL and similar title", score: 1 };
    }

    if (!recurringMismatch && sameDate && sameTown && titleScore >= 0.72) {
      return { event, reason: "similar title, same date and town", score: titleScore };
    }

    if (!recurringMismatch && sameDate && sameTown && sameVenue && titleScore >= 0.5) {
      return { event, reason: "same venue/date/town with similar title", score: titleScore };
    }

    if (!recurringMismatch && sameDate && sameTown && sameTime && titleScore >= 0.5) {
      return { event, reason: "same date, town and time with similar title", score: titleScore };
    }

    if (sameDate && sameTown && sameText(candidate?.title, event?.title)) {
      return { event, reason: "same title and town", score: 1 };
    }
  }

  return null;
}

export function isDuplicateEvent(candidate, existingEvents = []) {
  return Boolean(findDuplicateEvent(candidate, existingEvents));
}

export { normalizeTitle, jaccardSimilarity };
