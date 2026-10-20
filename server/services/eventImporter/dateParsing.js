const MONTHS = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateString(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isFutureOrToday(dateString, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date >= today;
}

function normalizeIsoDate(value) {
  const match = String(value || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function chooseYear(month, day, now) {
  const currentYear = now.getFullYear();
  const candidate = toDateString(currentYear, month, day);
  return isFutureOrToday(candidate, now) ? currentYear : currentYear + 1;
}

function parseMonthNameDate(text, now) {
  const monthPattern = Object.keys(MONTHS).join("|");
  const monthFirst = new RegExp(
    `\\b(${monthPattern})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`,
    "i"
  );
  const dayFirst = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthPattern})\\.?\\s*(\\d{4})?\\b`,
    "i"
  );

  const match = text.match(monthFirst) || text.match(dayFirst);
  if (!match) return null;

  const isMonthFirst = Number.isNaN(Number(match[1]));
  const month = isMonthFirst
    ? MONTHS[match[1].toLowerCase().replace(".", "")]
    : MONTHS[match[2].toLowerCase().replace(".", "")];
  const day = Number(isMonthFirst ? match[2] : match[1]);
  const explicitYear = Number(isMonthFirst ? match[3] : match[3]);
  const year = explicitYear || chooseYear(month, day, now);

  if (!month || !day || day > 31) return null;
  return toDateString(year, month, day);
}

export function parseEventDate(rawValue, { now = new Date() } = {}) {
  const text = String(rawValue || "");
  const iso = normalizeIsoDate(text);
  if (iso) return iso;

  return parseMonthNameDate(text, now);
}

export function parseEventTime(rawValue) {
  const text = String(rawValue || "");
  const iso = text.match(/\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?/i);
  if (iso) {
    if (iso[3]?.toUpperCase() === "Z") {
      const date = new Date(iso[0]);
      if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Edmonton", hour: "numeric", minute: "2-digit", hour12: true,
      }).format(date);
    }
    return formatClock(Number(iso[1]), iso[2]);
  }
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
  if (!match) {
    const clock = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    return clock ? formatClock(Number(clock[1]), clock[2]) : undefined;
  }

  const hour = Number(match[1]);
  const minutes = match[2] || "00";
  const meridiem = match[3].toUpperCase().replace(/\./g, "");
  if (!hour || hour > 12 || Number(minutes) > 59) return undefined;

  return `${hour}:${minutes} ${meridiem}`;
}

function formatClock(hour, minutes) {
  if (hour > 23 || Number(minutes) > 59) return undefined;
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`;
}

export function parseEventTimeRange(rawValue) {
  const text = String(rawValue || "");
  const range = text.match(/\b(\d{1,2}(?::\d{2})?)\s*(am|pm)?\s*(?:[-–—]|to)\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)\b/i);
  if (range) {
    let startMeridiem = range[2] || range[4];
    if (!range[2] && Number(range[1].split(":")[0]) % 12 > Number(range[3].split(":")[0]) % 12) {
      startMeridiem = range[4].toLowerCase() === "pm" ? "am" : "pm";
    }
    return {
      startTime: parseEventTime(`${range[1]} ${startMeridiem}`),
      endTime: parseEventTime(`${range[3]} ${range[4]}`),
    };
  }
  const clockRange = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\s*[-–—]\s*([01]?\d|2[0-3]):([0-5]\d)\b/);
  return clockRange ? { startTime: formatClock(Number(clockRange[1]), clockRange[2]), endTime: formatClock(Number(clockRange[3]), clockRange[4]) }
    : { startTime: parseEventTime(text), endTime: undefined };
}

export function isValidFutureDateString(dateString, now = new Date()) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dateString || "")) &&
    isFutureOrToday(dateString, now);
}
