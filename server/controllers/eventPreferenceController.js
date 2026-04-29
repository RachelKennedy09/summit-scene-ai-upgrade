import Event from "../models/Event.js";
import EventPreference, {
  EVENT_REMINDER_TIMES,
} from "../models/EventPreference.js";
import { isEventUpcoming } from "../../utils/eventSchedule.js";

const EVENT_POPULATE_FIELDS =
  "title town category date time endTime scheduleType recurrence locationName address imageUrl createdBy attendees";

function getUserId(req) {
  return req.user?.userId;
}

function normalizeReminderTime(value) {
  return EVENT_REMINDER_TIMES.includes(value) ? value : "1h";
}

function buildReminderText(preference, event) {
  const timeLabel =
    preference.reminderTime === "1mo"
      ? "1 month"
      : preference.reminderTime === "1d"
      ? "1 day"
      : preference.reminderTime === "3h"
        ? "3 hours"
        : "1 hour";

  return `Reminder ${timeLabel} before ${event.title}`;
}

function isUserGoing(event, userId) {
  return Array.isArray(event?.attendees)
    ? event.attendees.some((attendeeId) => attendeeId.toString() === userId.toString())
    : false;
}

export async function getEventPreferences(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const preferences = await EventPreference.find({ userId })
      .populate("eventId", EVENT_POPULATE_FIELDS)
      .sort({ updatedAt: -1 });

    const activePreferences = preferences.filter(
      (preference) =>
        Boolean(preference.eventId) && isEventUpcoming(preference.eventId)
    );
    const stalePreferenceIds = preferences
      .filter(
        (preference) =>
          !preference.eventId || !isEventUpcoming(preference.eventId)
      )
      .map((preference) => preference._id);

    if (stalePreferenceIds.length) {
      await EventPreference.deleteMany({ _id: { $in: stalePreferenceIds } });
    }

    return res.json(activePreferences);
  } catch (error) {
    console.error("Error in GET /api/event-preferences:", error);
    return res.status(500).json({
      message: "Failed to load event preferences.",
      error: error.message,
    });
  }
}

export async function getEventPreferenceByEvent(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const preference = await EventPreference.findOne({
      userId,
      eventId: req.params.eventId,
    }).populate("eventId", EVENT_POPULATE_FIELDS);

    return res.json(preference || null);
  } catch (error) {
    console.error("Error in GET /api/event-preferences/:eventId:", error);
    return res.status(500).json({
      message: "Failed to load event preference.",
      error: error.message,
    });
  }
}

export async function updateEventPreference(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const event = await Event.findById(req.params.eventId).select("_id");
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const update = {};
    if (typeof req.body?.saved === "boolean") {
      update.saved = req.body.saved;
      if (!req.body.saved) {
        update.savedReminderEnabled = false;
      }
    }
    if (typeof req.body?.savedReminderEnabled === "boolean") {
      update.savedReminderEnabled = req.body.savedReminderEnabled;
    }
    if (typeof req.body?.goingReminderEnabled === "boolean") {
      update.goingReminderEnabled = req.body.goingReminderEnabled;
    }
    if (req.body?.reminderTime) {
      update.reminderTime = normalizeReminderTime(req.body.reminderTime);
    }

    const preference = await EventPreference.findOneAndUpdate(
      { userId, eventId: event._id },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("eventId", EVENT_POPULATE_FIELDS);

    return res.json(preference);
  } catch (error) {
    console.error("Error in PATCH /api/event-preferences/:eventId:", error);
    return res.status(500).json({
      message: "Failed to update event preference.",
      error: error.message,
    });
  }
}

export async function getNotifications(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const preferences = await EventPreference.find({ userId })
      .populate("eventId", EVENT_POPULATE_FIELDS)
      .sort({ updatedAt: -1 });

    const reminders = preferences
      .filter((preference) => {
        const event = preference.eventId;
        if (!event || !isEventUpcoming(event)) return false;
        return (
          preference.savedReminderEnabled ||
          (preference.goingReminderEnabled && isUserGoing(event, userId))
        );
      })
      .map((preference) => ({
        _id: `${preference._id}:reminder`,
        type: "event-reminder",
        title: "Event reminder",
        message: buildReminderText(preference, preference.eventId),
        event: preference.eventId,
        reminderTime: preference.reminderTime,
        createdAt: preference.updatedAt,
      }));

    return res.json(reminders);
  } catch (error) {
    console.error("Error in GET /api/notifications:", error);
    return res.status(500).json({
      message: "Failed to load notifications.",
      error: error.message,
    });
  }
}
