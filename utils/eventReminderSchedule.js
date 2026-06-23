import {
  getNextOccurrenceDate,
  getNormalizedTimeSlots,
} from "./eventSchedule.js";

export const REMINDER_OFFSETS_MS = {
  "1h": 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1mo": 30 * 24 * 60 * 60 * 1000,
};

function parseEventTime(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;

  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const period = match[3];

  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;

  return { hour, minute };
}

function buildEventStartDateTime(event, occurrenceDate) {
  const date = new Date(occurrenceDate);
  const firstSlot = getNormalizedTimeSlots(event)[0];
  const parsedTime = event?.isAllDay
    ? { hour: 9, minute: 0 }
    : parseEventTime(firstSlot?.startTime || event?.time);

  date.setHours(parsedTime?.hour ?? 9, parsedTime?.minute ?? 0, 0, 0);
  return date;
}

function findNextRecurringReminderDate(event, offset, fromDate) {
  const cursor = new Date(fromDate);

  for (let attempt = 0; attempt < 370; attempt += 1) {
    const occurrenceDate = getNextOccurrenceDate(event, cursor);
    if (!occurrenceDate) return null;

    const eventStart = buildEventStartDateTime(event, occurrenceDate);
    const reminderDate = new Date(eventStart.getTime() - offset);
    if (reminderDate.getTime() > fromDate.getTime()) {
      return reminderDate;
    }

    cursor.setTime(occurrenceDate.getTime());
    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
}

export function getEventReminderDate(event, reminderTime, fromDate = new Date()) {
  const offset = REMINDER_OFFSETS_MS[reminderTime];
  if (!offset) return null;

  if ((event?.scheduleType || "single") === "recurring") {
    return findNextRecurringReminderDate(event, offset, fromDate);
  }

  const occurrenceDate = getNextOccurrenceDate(event, fromDate);
  if (!occurrenceDate) return null;

  const eventStart = buildEventStartDateTime(event, occurrenceDate);
  const reminderDate = new Date(eventStart.getTime() - offset);
  return reminderDate.getTime() > fromDate.getTime() ? reminderDate : null;
}
