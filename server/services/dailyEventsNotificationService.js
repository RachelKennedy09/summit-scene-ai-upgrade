import Event from "../models/Event.js";
import NotificationDelivery from "../models/NotificationDelivery.js";
import User from "../models/User.js";
import { createAppNotification } from "./notificationService.js";
import { eventOccursOnDate } from "../../utils/eventSchedule.js";

const DAILY_EVENTS_TYPE = "daily-events";
const DEFAULT_TIMEZONE = "America/Edmonton";
const DEFAULT_TOWN = "All";
const DAILY_EVENTS_TIMES = {
  morning: "09:00",
  afternoon: "13:00",
  evening: "17:00",
};
const VALID_TOWNS = new Set(["Banff", "Canmore", "Lake Louise", "All"]);

let schedulerHandle = null;

function normalizeTown(value, fallback = DEFAULT_TOWN) {
  const town = String(value || "").trim();
  if (town === "LL") return "Lake Louise";
  return VALID_TOWNS.has(town) ? town : fallback;
}

function getPreferredTown(user) {
  return normalizeTown(
    user?.notificationPreferences?.dailyEventsTown,
    normalizeTown(user?.town, DEFAULT_TOWN)
  );
}

function getTimeForPreference(preferences = {}) {
  const explicitTime = String(preferences.dailyEventsTime || "").trim();
  if (/^\d{2}:\d{2}$/.test(explicitTime)) return explicitTime;
  return DAILY_EVENTS_TIMES[preferences.dailyEventsTimeOfDay] || DAILY_EVENTS_TIMES.morning;
}

function getLocalParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value || "";

  return {
    dateString: `${read("year")}-${read("month")}-${read("day")}`,
    minutes: Number(read("hour")) * 60 + Number(read("minute")),
  };
}

function timeToMinutes(value) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) return 9 * 60;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getGreeting(minutes) {
  if (minutes >= 17 * 60) return "Good evening";
  if (minutes >= 12 * 60) return "Good afternoon";
  return "Good morning";
}

function getGreetingIcon(minutes) {
  if (minutes >= 17 * 60) return "🌙";
  if (minutes >= 12 * 60) return "🏔️";
  return "☀️";
}

function buildDailyMessage({ eventCount, town, minutes }) {
  const greeting = getGreeting(minutes);
  const icon = getGreetingIcon(minutes);
  const place = town && town !== "All" ? town : "the Bow Valley";
  const timing = minutes >= 17 * 60 ? "tonight" : "today";

  if (eventCount <= 0) {
    return `${greeting}! ${icon} Check Summit Scene to see what's happening around ${place} ${timing}.`;
  }

  if (eventCount === 1) {
    return `${greeting}! ${icon} There's 1 event happening around ${place} ${timing}.`;
  }

  return `${greeting}! ${icon} ${eventCount} events are happening around ${place} ${timing}.`;
}

function buildCandidateQuery(dateString, town) {
  const query = {
    $or: [
      {
        $or: [
          { scheduleType: { $exists: false } },
          { scheduleType: "single" },
        ],
        date: dateString,
      },
      {
        scheduleType: "recurring",
        date: { $lte: dateString },
        $or: [
          { "recurrence.frequency": "selected_dates", "recurrence.dates": dateString },
          {
            "recurrence.frequency": { $ne: "selected_dates" },
            $or: [
              { "recurrence.untilDate": { $exists: false } },
              { "recurrence.untilDate": null },
              { "recurrence.untilDate": "" },
              { "recurrence.untilDate": { $gte: dateString } },
            ],
          },
        ],
      },
    ],
  };

  if (town && town !== "All") {
    query.town = town;
  }

  return query;
}

export async function countEventsHappeningOnDate({ dateString, town }) {
  const normalizedTown = normalizeTown(town);
  const events = await Event.find(buildCandidateQuery(dateString, normalizedTown))
    .select("date scheduleType recurrence town")
    .lean();

  return events.filter((event) => eventOccursOnDate(event, dateString)).length;
}

async function createDeliveryGuard({ userId, dateString, timezone, metadata }) {
  try {
    await NotificationDelivery.create({
      user: userId,
      type: DAILY_EVENTS_TYPE,
      deliveryDate: dateString,
      timezone,
      metadata,
    });
    return true;
  } catch (error) {
    if (error?.code === 11000) return false;
    throw error;
  }
}

export async function sendDueDailyEventsNotifications({ now = new Date() } = {}) {
  const users = await User.find({
    "notificationPreferences.dailyEventsEnabled": true,
  }).select("name town notificationPreferences");

  const summary = {
    checked: users.length,
    due: 0,
    sent: 0,
    skipped: 0,
    errors: [],
  };

  for (const user of users) {
    try {
      const preferences = user.notificationPreferences || {};
      const timezone = preferences.dailyEventsTimezone || DEFAULT_TIMEZONE;
      const local = getLocalParts(now, timezone);
      const scheduledMinutes = timeToMinutes(getTimeForPreference(preferences));

      if (local.minutes < scheduledMinutes) {
        summary.skipped += 1;
        continue;
      }

      const town = getPreferredTown(user);
      const eventCount = await countEventsHappeningOnDate({
        dateString: local.dateString,
        town,
      });

      const guarded = await createDeliveryGuard({
        userId: user._id,
        dateString: local.dateString,
        timezone,
        metadata: { town, eventCount },
      });

      if (!guarded) {
        summary.skipped += 1;
        continue;
      }

      summary.due += 1;
      await createAppNotification({
        recipientId: user._id,
        type: DAILY_EVENTS_TYPE,
        title: "What's happening today",
        message: buildDailyMessage({ eventCount, town, minutes: local.minutes }),
        data: {
          type: DAILY_EVENTS_TYPE,
          date: local.dateString,
          town,
          eventCount,
        },
        sendPush: true,
        channelId: "daily-events",
      });
      summary.sent += 1;
    } catch (error) {
      summary.errors.push({
        userId: user?._id?.toString?.() || "",
        message: error.message,
      });
    }
  }

  return summary;
}

export function startDailyEventsNotificationJob({
  intervalMs = Number(process.env.DAILY_EVENTS_JOB_INTERVAL_MS) || 15 * 60 * 1000,
} = {}) {
  if (schedulerHandle || process.env.NODE_ENV === "test") {
    return schedulerHandle;
  }

  schedulerHandle = setInterval(() => {
    sendDueDailyEventsNotifications().catch((error) => {
      console.warn("Daily events notification job failed:", error.message);
    });
  }, intervalMs);

  sendDueDailyEventsNotifications().catch((error) => {
    console.warn("Daily events notification startup check failed:", error.message);
  });

  return schedulerHandle;
}

export { DAILY_EVENTS_TIMES, DAILY_EVENTS_TYPE };
