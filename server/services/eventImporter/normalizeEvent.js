import {
  EVENT_CATEGORY_VALUES,
  getMainCategoryForTag,
} from "../../../constants/eventCategories.js";
import { TOWNS } from "./config.js";
import {
  isValidFutureDateString,
  parseEventDate,
  parseEventTime,
} from "./dateParsing.js";

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTown(value, fallbackTown) {
  const text = cleanText(value || fallbackTown);
  return TOWNS.find((town) => town.toLowerCase() === text.toLowerCase());
}

function inferTown(text, fallbackTown) {
  const lower = String(text || "").toLowerCase();
  return TOWNS.find((town) => lower.includes(town.toLowerCase())) ||
    normalizeTown(fallbackTown);
}

function normalizeCategory(value, text = "") {
  const exact = cleanText(value);
  if (EVENT_CATEGORY_VALUES.includes(exact)) {
    return getMainCategoryForTag(exact) || exact;
  }

  const lower = `${exact} ${text}`.toLowerCase();
  const keywordMap = [
    { keywords: ["music", "concert", "dj", "band", "karaoke"], category: "Music & Nightlife" },
    { keywords: ["market", "vendor", "maker"], category: "Food & Drink" },
    { keywords: ["yoga", "wellness", "fitness"], category: "Wellness" },
    { keywords: ["hike", "ski", "bike", "run", "outdoor"], category: "Outdoors & Sports" },
    { keywords: ["workshop", "class", "course", "learn"], category: "Learning" },
    { keywords: ["art", "gallery", "film", "theatre", "craft"], category: "Arts & Creativity" },
    { keywords: ["food", "beer", "wine", "brunch", "restaurant"], category: "Food & Drink" },
    { keywords: ["family", "kids", "pet"], category: "Family & Pets" },
    { keywords: ["community", "fundraiser", "volunteer"], category: "Inclusive Community" },
  ];

  return keywordMap.find((item) =>
    item.keywords.some((keyword) => lower.includes(keyword))
  )?.category || "Other";
}

export function buildOriginalSummary({
  title,
  startDate,
  endDate,
  startTime,
  endTime,
  venue,
  town,
  price,
  sourceName,
}) {
  const where = [venue, town].filter(Boolean).join(" in ");
  const timeText = [startTime, endTime].filter(Boolean).join(" to ");
  const dateText = endDate && endDate !== startDate
    ? `${startDate} to ${endDate}`
    : startDate;
  const parts = [];

  if (title && dateText && where) {
    parts.push(`${title} is listed for ${dateText}${timeText ? `, ${timeText}` : ""} at ${where}.`);
  } else if (title && dateText) {
    parts.push(`${title} is listed for ${dateText}${timeText ? `, ${timeText}` : ""}.`);
  } else if (title && where) {
    parts.push(`${title} is listed at ${where}.`);
  } else if (title) {
    parts.push(`${title} is listed as an upcoming event.`);
  }

  if (price) {
    parts.push(`Price: ${price}.`);
  }

  if (sourceName) {
    parts.push(`Details are attributed to ${sourceName}; view the organizer website for the latest information.`);
  } else {
    parts.push("View the organizer website for the latest information.");
  }

  return parts.join(" ");
}

export function buildFactualRawExtractedData(extracted, source) {
  return {
    title: cleanText(extracted?.title),
    dateText: cleanText(extracted?.dateText),
    startDate: cleanText(extracted?.startDate),
    endDate: cleanText(extracted?.endDate),
    startTime: cleanText(extracted?.startTime),
    endTime: cleanText(extracted?.endTime),
    venue: cleanText(extracted?.venue),
    address: cleanText(extracted?.address),
    town: cleanText(extracted?.town || source?.town),
    price: cleanText(extracted?.price),
    ticketUrl: cleanText(extracted?.ticketUrl),
    sourceUrl: cleanText(extracted?.sourceUrl || source?.url),
    sourceName: cleanText(source?.name),
    extractionMethod: cleanText(extracted?.extractionMethod),
  };
}

function todayString(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function chooseImportStartDate(startDate, endDate, now, isRecurring = false) {
  if (
    isValidFutureDateString(startDate, now) &&
    isValidFutureDateString(endDate, now) &&
    startDate > endDate
  ) {
    return todayString(now);
  }
  if (isValidFutureDateString(startDate, now)) return startDate;
  if (isValidFutureDateString(endDate, now)) return todayString(now);
  if (isRecurring) return todayString(now);
  return startDate;
}

function normalizeRecurrence(recurrence, options = {}) {
  if (!recurrence || typeof recurrence !== "object") return undefined;

  const validFrequencies = new Set([
    "daily",
    "weekly",
    "biweekly",
    "monthly",
    "selected_weekdays",
    "selected_dates",
  ]);
  const validWeekdays = new Set([
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]);
  const weekdays = Array.isArray(recurrence.weekdays)
    ? recurrence.weekdays.filter((weekday) => validWeekdays.has(weekday))
    : [];
  const dates = Array.isArray(recurrence.dates)
    ? recurrence.dates.filter((date) => isValidFutureDateString(date, options.now))
    : [];
  const frequency = validFrequencies.has(recurrence.frequency)
    ? recurrence.frequency
    : weekdays.length
      ? "selected_weekdays"
      : dates.length
        ? "selected_dates"
        : "daily";
  const untilDate = parseEventDate(recurrence.untilDate, options);

  return {
    frequency,
    weekdays: weekdays.length ? weekdays : [],
    untilDate: isValidFutureDateString(untilDate, options.now) ? untilDate : undefined,
    dates,
  };
}

function scoreCandidate(candidate, notes) {
  let score = 20;

  if (candidate.title) score += 20;
  if (isValidFutureDateString(candidate.startDate)) score += 25;
  else notes.push("Missing or non-future date.");
  if (candidate.town) score += 15;
  else notes.push("Town could not be identified.");
  if (candidate.venue) score += 10;
  else notes.push("Venue is missing.");
  if (candidate.sourceUrl) score += 10;
  if (candidate.category && candidate.category !== "Other") score += 5;

  return Math.max(0, Math.min(100, score));
}

export function normalizeExtractedEvent(extracted, source, options = {}) {
  const notes = [];
  const text = cleanText(
    [
      extracted?.title,
      extracted?.description,
      extracted?.dateText,
      extracted?.venue,
      extracted?.address,
    ].filter(Boolean).join(" ")
  );
  const parsedStartDate = parseEventDate(
    extracted?.startDate || extracted?.dateText || text,
    options
  );
  const endDate = parseEventDate(extracted?.endDate, options);
  const scheduleType =
    extracted?.scheduleType === "recurring" || extracted?.recurrence
      ? "recurring"
      : "single";
  const recurrence = normalizeRecurrence(extracted?.recurrence, options);
  const startDate = chooseImportStartDate(
    parsedStartDate,
    endDate,
    options.now,
    scheduleType === "recurring"
  );
  const town = normalizeTown(extracted?.town) || inferTown(text, source?.town);
  const category = normalizeCategory(extracted?.category, text);
  const title = cleanText(extracted?.title);
  const venue = cleanText(extracted?.venue);
  const startTime = cleanText(extracted?.startTime) || parseEventTime(extracted?.dateText || text);
  const endTime = cleanText(extracted?.endTime);
  const price = cleanText(extracted?.price);
  const sourceName = cleanText(source?.name);

  const candidate = {
    title,
    description: buildOriginalSummary({
      title,
      startDate,
      endDate,
      startTime,
      endTime,
      venue,
      town,
      price,
      sourceName,
    }),
    town,
    category,
    categories: [category],
    venue,
    address: cleanText(extracted?.address),
    latitude: extracted?.latitude,
    longitude: extracted?.longitude,
    startDate,
    endDate: endDate && endDate !== startDate ? endDate : undefined,
    startTime,
    endTime,
    scheduleType,
    recurrence: scheduleType === "recurring" ? recurrence || { frequency: "daily" } : undefined,
    price,
    ticketUrl: cleanText(extracted?.ticketUrl),
    sourceUrl: cleanText(extracted?.sourceUrl || source?.url),
    sourceName,
    source: source?._id,
    imageUrl: cleanText(source?.permittedImageUrl) || undefined,
    rawExtractedData: buildFactualRawExtractedData(extracted, source),
  };

  candidate.confidenceScore = scoreCandidate(candidate, notes);
  candidate.importNotes = notes.join(" ");

  return candidate;
}
