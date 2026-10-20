import { getNextOccurrenceDate } from "./eventSchedule.js";

export const EVENT_TIME_ZONE = "America/Edmonton";
export function localDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map((key) => parts.find((part) => part.type === key).value).join("-");
}
export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
export function addDays(value, days) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function dateRange(preset = "", from = "", to = "", now = new Date()) {
  const today = localDate(now);
  if (preset === "today") return { from: today, to: today };
  if (preset === "tomorrow") return { from: addDays(today, 1), to: addDays(today, 1) };
  if (preset === "weekend") {
    const weekday = new Date(`${today}T12:00Z`).getUTCDay();
    const friday = weekday === 0 || weekday === 6 ? today : addDays(today, (5 - weekday + 7) % 7);
    return { from: friday, to: addDays(friday, weekday === 0 ? 0 : weekday === 6 ? 1 : 2) };
  }
  return { from: from || today, to: to || addDays(from || today, 366) };
}
export function nextOccurrence(event, from) {
  const [year, month, day] = from.split("-").map(Number);
  const result = getNextOccurrenceDate(event, new Date(year, month - 1, day, 12));
  return result ? `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, "0")}-${String(result.getDate()).padStart(2, "0")}` : null;
}
export function dateLabel(value) {
  return validDate(value) ? new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", weekday: "short", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00Z`)) : "Date to be confirmed";
}

// Resolve a Mountain wall clock to an offset timestamp. Do not fabricate a
// timestamp for a skipped or ambiguous DST clock time.
export function eventTimestamp(date, time) {
  if (!validDate(date)) return null;
  const match = String(time || "").match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (minute > 59 || hour > (match[3] ? 12 : 23) || (match[3] && hour < 1)) return null;
  if (match[3]) hour = hour % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0);
  const wall = `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const matches = [];
  for (const offset of [-6, -7]) {
    const instant = new Date(Date.parse(`${wall}:00Z`) - offset * 3600000);
    const parts = Object.fromEntries(formatter.formatToParts(instant).map(({ type, value }) => [type, value]));
    if (`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` === wall) matches.push(`${wall}:00-0${-offset}:00`);
  }
  return matches.length === 1 ? matches[0] : null;
}
