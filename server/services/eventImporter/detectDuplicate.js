function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value) {
  return new Set(normalizeTitle(value).split(" ").filter((token) => token.length > 2));
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
    value?.startTime || value?.time || "",
    value?.endTime || "",
  ].join("|");
}

export function findDuplicateEvent(candidate, existingEvents = []) {
  const candidateUrl = String(candidate?.sourceUrl || candidate?.ticketUrl || "").trim();
  const candidateIsRecurring =
    candidate?.scheduleType === "recurring" || Boolean(candidate?.recurrence);

  for (const event of existingEvents) {
    const eventUrl = String(event?.sourceUrl || event?.bookingUrl || "").trim();
    const eventIsRecurring =
      event?.scheduleType === "recurring" || Boolean(event?.recurrence);
    const recurringMismatch =
      candidateIsRecurring &&
      eventIsRecurring &&
      recurrenceSignature(candidate) !== recurrenceSignature(event);
    const sameDate = candidate?.startDate && candidate.startDate === event?.date;
    const sameTown = candidate?.town && candidate.town === event?.town;
    const sameTime =
      candidate?.startTime &&
      event?.time &&
      String(candidate.startTime).trim().toLowerCase() ===
        String(event.time).trim().toLowerCase();
    const sameVenue =
      sameText(candidate?.venue, event?.locationName) ||
      sameText(candidate?.venue, event?.location);
    const titleScore = jaccardSimilarity(candidate?.title, event?.title);

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
  }

  return null;
}

export function isDuplicateEvent(candidate, existingEvents = []) {
  return Boolean(findDuplicateEvent(candidate, existingEvents));
}

export { normalizeTitle, jaccardSimilarity };
