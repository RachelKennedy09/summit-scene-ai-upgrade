import {
  EVENT_CATEGORY_VALUES,
  getMainCategoryForTag,
} from "../../../constants/eventCategories.js";
import { TOWNS } from "./config.js";
import {
  isValidFutureDateString,
  parseEventDate,
  parseEventTime,
  parseEventTimeRange,
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

const ACTIVITY_CATEGORY_RULES = [
  { pattern: /\b(hock(?:e)?y|nhl|puck|basketball|baseball|softball|soccer|football|rugby|volleyball|tennis|pickleball|curling|golf|biathlon|super bowl|grey cup|stanley cup|sports? watch part(?:y|ies))\b/i, category: "Outdoors & Sports" },
  { pattern: /\b(live music|music|concerts?|djs?|bands?|karaoke|open mic|acoustic|songwriters?|jazz|gig|nightclub|dance night|après[- ]ski party|apres[- ]ski party)\b/i, category: "Music & Nightlife" },
  { pattern: /\b(yoga|wellness|fitness|meditation|breathwork|pilates|sound bath|mental health)\b/i, category: "Wellness" },
  { pattern: /\b(hik(?:e|es|ing)|ski(?:s|ing)?|snowboard(?:ing)?|snowshoe(?:ing)?|bik(?:e|es|ing)|cycling|run(?:ning)?|races?|marathon|climb(?:ing)?|skat(?:e|es|ing)|canoe(?:ing)?|kayak(?:ing)?|paddleboard(?:ing)?|outdoors?)\b/i, category: "Outdoors & Sports" },
  { pattern: /\b(art|gallery|exhibitions?|film|cinema|theatre|theater|pottery|painting|craft fair|craft market|makers? market)\b/i, category: "Arts & Creativity" },
  { pattern: /\b(food|beer|wine|brunch|dinner|restaurant|culinary|tasting|coffee|cocktails?|happy hour|farmers? market|bbq|community meal)\b/i, category: "Food & Drink" },
  { pattern: /\b(workshops?|class(?:es)?|courses?|lectures?|seminars?|learn(?:ing)?|training)\b/i, category: "Learning" },
  { pattern: /\b(tours?|sightseeing|guided experience)\b/i, category: "Tours & Experiences" },
];

function inferActivityCategory(text) {
  return ACTIVITY_CATEGORY_RULES.find(({ pattern }) => pattern.test(text || ""))?.category;
}

function normalizeCategory(value, extracted = {}) {
  const exact = cleanText(value);
  const suppliedCategory = EVENT_CATEGORY_VALUES.includes(exact)
    ? getMainCategoryForTag(exact) || exact
    : undefined;
  // Classify the activity before accepting broad source labels such as
  // "Inclusive Community". Venue names and addresses are not activity clues.
  const titleCategory = inferActivityCategory(extracted.title);
  if (titleCategory) return titleCategory;

  const broadCategories = ["Inclusive Community", "Community", "Family & Pets", "Other"];
  if (suppliedCategory && !broadCategories.includes(suppliedCategory)) return suppliedCategory;

  const text = cleanText([extracted.title, extracted.description, exact].filter(Boolean).join(" "));
  const activityCategory = inferActivityCategory(text);
  if (activityCategory) return activityCategory;
  if (suppliedCategory && suppliedCategory !== "Other") return suppliedCategory;

  if (/\b(lgbtq\w*|pride|queer|bipoc|allyship|accessibility|sensory friendly|inclusive)\b/i.test(text)) return "Inclusive Community";
  if (/\b(family|kids|children|pets?)\b/i.test(text)) return "Family & Pets";
  if (/\b(community|fundraiser|volunteer|charity|meetup|meetups|trivia|bingo)\b/i.test(text)) return "Community";
  return "Other";
}

export function buildOriginalSummary({
  title,
  originalDescription,
  startDate,
  endDate,
  startTime,
  endTime,
  venue,
  town,
  price,
  category,
}) {
  const where = [venue, town].filter(Boolean).join(" in ");
  const timeText = [startTime, endTime].filter(Boolean).join(" to ");
  const dateText = endDate && endDate !== startDate
    ? `${startDate} to ${endDate}`
    : startDate;
  const themeText = buildThemeText({
    title,
    originalDescription,
    category,
    price,
  });
  const parts = [];

  if (title && themeText && dateText && where) {
    parts.push(`${title} is a ${themeText} happening on ${dateText}${timeText ? ` from ${timeText}` : ""} at ${where}.`);
  } else if (title && themeText && dateText) {
    parts.push(`${title} is a ${themeText} happening on ${dateText}${timeText ? ` from ${timeText}` : ""}.`);
  } else if (title && themeText && where) {
    parts.push(`${title} is a ${themeText} at ${where}.`);
  } else if (title && dateText && where) {
    parts.push(`${title} happens on ${dateText}${timeText ? ` from ${timeText}` : ""} at ${where}.`);
  } else if (title && dateText) {
    parts.push(`${title} happens on ${dateText}${timeText ? ` from ${timeText}` : ""}.`);
  } else if (title && where) {
    parts.push(`${title} takes place at ${where}.`);
  } else if (title) {
    parts.push(`${title} is an upcoming local event.`);
  }

  if (price) {
    parts.push(price.toLowerCase() === "free" ? "Admission is listed as free." : `Price details: ${price}.`);
  }

  const extraContext = buildExtraContext(originalDescription);
  if (extraContext) {
    parts.push(extraContext);
  }

  return parts.join(" ");
}

function buildThemeText({ title, originalDescription, category, price }) {
  const text = cleanText([title, originalDescription, category, price].filter(Boolean).join(" ")).toLowerCase();
  const themes = [
    { pattern: /\b(live music|concert|band|dj|karaoke|acoustic|songwriter|jam night)\b/, text: "live music event" },
    { pattern: /\b(theatre|theater|musical|performance|show|play)\b/, text: "performance" },
    { pattern: /\b(market|vendor|makers?|artisan|craft fair)\b/, text: "market" },
    { pattern: /\b(workshop|class|course|lesson|learn)\b/, text: "workshop" },
    { pattern: /\b(yoga|meditation|wellness|fitness|run club)\b/, text: "wellness activity" },
    { pattern: /\b(hike|ski|bike|ride|race|outdoor|trail|mountain)\b/, text: "mountain activity" },
    { pattern: /\b(family|kids|children|all ages)\b/, text: "family-friendly outing" },
    { pattern: /\b(food|drink|beer|wine|cocktail|brunch|dinner|tasting|happy hour)\b/, text: "food and drink event" },
    { pattern: /\b(fundraiser|community|volunteer|charity)\b/, text: "community event" },
    { pattern: /\b(art|gallery|exhibition|film|creative)\b/, text: "arts event" },
  ];

  return themes.find((theme) => theme.pattern.test(text))?.text || "local event";
}

function buildExtraContext(description) {
  const text = cleanText(description)
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b(learn more|more details|view details|visit website|buy tickets|book now|click here)\b/gi, "")
    .trim();

  if (!text || text.length < 20) return "";

  const lower = text.toLowerCase();
  const notes = [];
  if (/\bfree admission\b|\bfree\b/.test(lower)) notes.push("free admission");
  if (/\blocal\b/.test(lower)) notes.push("a local focus");
  if (/\bfamily|kids|children|all ages\b/.test(lower)) notes.push("family-friendly programming");
  if (/\bpatio|outdoor|outside|rooftop\b/.test(lower)) notes.push("an outdoor setting");
  if (/\bfood|drink|beer|wine|cocktail|dinner|brunch\b/.test(lower)) notes.push("food or drink options");
  if (/\blive music|concert|band|dj|acoustic|songwriter\b/.test(lower)) notes.push("live entertainment");

  if (!notes.length) return "";

  return `The listing highlights ${notes.slice(0, 3).join(", ")}.`;
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

function scoreCandidate(candidate, notes, options = {}) {
  let score = 20;

  if (candidate.title) score += 20;
  if (isValidFutureDateString(candidate.startDate, options.now)) score += 25;
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
  const category = normalizeCategory(extracted?.category, extracted);
  const title = cleanText(extracted?.title);
  const venue = cleanText(extracted?.venue);
  const timeRange = parseEventTimeRange(extracted?.dateText || extracted?.description || "");
  const startTime = parseEventTime(extracted?.startTime) || parseEventTime(extracted?.startDate) || timeRange.startTime;
  const endTime = parseEventTime(extracted?.endTime) || parseEventTime(extracted?.endDate) || timeRange.endTime;
  const price = cleanText(extracted?.price);
  const sourceName = cleanText(source?.name);

  const candidate = {
    title,
    description: buildOriginalSummary({
      title,
      originalDescription: extracted?.description,
      startDate,
      endDate,
      startTime,
      endTime,
      venue,
      town,
      price,
      category,
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

  candidate.confidenceScore = scoreCandidate(candidate, notes, options);
  const missing = [];
  if (!venue || ["Banff", "Canmore", "Lake Louise", "Canmore Kananaskis", "SkiBig3", "Rocky Mountain Live"].includes(venue)) missing.push("venue");
  if (!startTime) missing.push("start time");
  if (missing.length) {
    candidate.needsReview = true;
    candidate.reviewReason = `Missing ${missing.join(" and ")}. Check the source before approval.`;
    candidate.confidenceScore = Math.min(candidate.confidenceScore, 75);
    notes.push(candidate.reviewReason);
  }
  candidate.importNotes = notes.join(" ");

  return candidate;
}
