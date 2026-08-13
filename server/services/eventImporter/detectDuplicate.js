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

export function findDuplicateEvent(candidate, existingEvents = []) {
  const candidateUrl = String(candidate?.sourceUrl || candidate?.ticketUrl || "").trim();

  for (const event of existingEvents) {
    const eventUrl = String(event?.sourceUrl || event?.bookingUrl || "").trim();
    if (candidateUrl && eventUrl && candidateUrl === eventUrl) {
      return { event, reason: "same source URL", score: 1 };
    }

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

    if (sameDate && sameTown && titleScore >= 0.72) {
      return { event, reason: "similar title, same date and town", score: titleScore };
    }

    if (sameDate && sameTown && sameVenue && titleScore >= 0.5) {
      return { event, reason: "same venue/date/town with similar title", score: titleScore };
    }

    if (sameDate && sameTown && sameTime && titleScore >= 0.5) {
      return { event, reason: "same date, town and time with similar title", score: titleScore };
    }
  }

  return null;
}

export function isDuplicateEvent(candidate, existingEvents = []) {
  return Boolean(findDuplicateEvent(candidate, existingEvents));
}

export { normalizeTitle, jaccardSimilarity };
