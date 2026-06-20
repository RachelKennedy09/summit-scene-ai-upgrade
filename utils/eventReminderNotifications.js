import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  getNextOccurrenceDate,
  getNormalizedTimeSlots,
} from "./eventSchedule";

const STORAGE_KEY = "scheduledEventReminderNotifications";
const REMINDER_OFFSETS_MS = {
  "1h": 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1mo": 30 * 24 * 60 * 60 * 1000,
};

function getEventId(event) {
  return event?._id || event?.id || "";
}

function getPreferenceId(preference) {
  return preference?._id || preference?.id || "";
}

function getStorageKey({ eventId, source }) {
  return `${source}:${eventId}`;
}

async function readScheduledMap() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeScheduledMap(map) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

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

function getEventStartDateTime(event) {
  const occurrenceDate = getNextOccurrenceDate(event);
  if (!occurrenceDate) return null;

  const date = new Date(occurrenceDate);
  const firstSlot = getNormalizedTimeSlots(event)[0];
  const parsedTime = event?.isAllDay
    ? { hour: 9, minute: 0 }
    : parseEventTime(firstSlot?.startTime || event?.time);

  date.setHours(parsedTime?.hour ?? 9, parsedTime?.minute ?? 0, 0, 0);
  return date;
}

function getReminderDate(event, reminderTime) {
  const offset = REMINDER_OFFSETS_MS[reminderTime];
  const eventStart = getEventStartDateTime(event);
  if (!offset || !eventStart) return null;

  const reminderDate = new Date(eventStart.getTime() - offset);
  return reminderDate.getTime() > Date.now() ? reminderDate : null;
}

async function ensureNotificationPermission() {
  if (Platform.OS === "web") {
    return false;
  }

  async function ensureAndroidChannel() {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("event-reminders", {
        name: "Event reminders",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    await ensureAndroidChannel();
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  const allowed = Boolean(
    requested.granted ||
      requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );

  if (allowed && Platform.OS === "android") {
    await ensureAndroidChannel();
  }

  return allowed;
}

export async function cancelEventReminderNotification({ eventId, source }) {
  if (!eventId || !source) return;

  const map = await readScheduledMap();
  const key = getStorageKey({ eventId, source });
  const notificationId = map[key];

  if (notificationId) {
    if (Platform.OS !== "web") {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch {
        // The OS may already have removed delivered or expired notifications.
      }
    }
    delete map[key];
    await writeScheduledMap(map);
  }
}

export async function cancelAllEventReminderNotifications() {
  const map = await readScheduledMap();
  if (Platform.OS !== "web") {
    await Promise.all(
      Object.values(map).map((notificationId) =>
        Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {})
      )
    );
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function scheduleEventReminderNotification({
  event,
  preference,
  source,
}) {
  const eventId = getEventId(event);
  const preferenceId = getPreferenceId(preference);
  const reminderTime = preference?.reminderTime || "1h";
  const reminderDate = getReminderDate(event, reminderTime);

  if (!eventId || !preferenceId || !source) {
    return { scheduled: false, reason: "missing-data" };
  }

  await cancelEventReminderNotification({ eventId, source });

  if (!reminderDate) {
    return { scheduled: false, reason: "past-reminder-time" };
  }

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return { scheduled: false, reason: "permission-denied" };
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Event reminder",
      body: `${event?.title || "Your saved event"} is coming up.`,
      data: {
        type: "event-reminder",
        eventId,
        preferenceId,
        source,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
      channelId: "event-reminders",
    },
  });

  const map = await readScheduledMap();
  map[getStorageKey({ eventId, source })] = notificationId;
  await writeScheduledMap(map);

  return { scheduled: true, notificationId, reminderDate };
}

export async function updateEventReminderNotification({
  event,
  preference,
  source,
  enabled,
}) {
  const eventId = getEventId(event);
  if (!enabled) {
    await cancelEventReminderNotification({ eventId, source });
    return { scheduled: false, reason: "disabled" };
  }

  return scheduleEventReminderNotification({ event, preference, source });
}

export async function syncEventReminderNotifications(preferences, currentUserId) {
  await cancelAllEventReminderNotifications();

  const results = [];
  for (const preference of preferences || []) {
    const event = preference?.eventId;
    if (!event || typeof event !== "object") continue;

    if (preference.savedReminderEnabled) {
      results.push(
        await scheduleEventReminderNotification({
          event,
          preference,
          source: "saved",
        })
      );
    }

    const attendees = Array.isArray(event.attendees) ? event.attendees : [];
    const isGoing = attendees.some((attendee) => {
      const attendeeId =
        typeof attendee === "string" ? attendee : attendee?._id || attendee?.id;
      return attendeeId?.toString() === currentUserId?.toString();
    });

    if (preference.goingReminderEnabled && isGoing) {
      results.push(
        await scheduleEventReminderNotification({
          event,
          preference,
          source: "going",
        })
      );
    }
  }

  return results;
}
