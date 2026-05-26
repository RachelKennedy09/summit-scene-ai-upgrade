// server/controllers/eventController.js
// Controller functions for SummitScene events
//  - Listing upcoming events (for Hub + Map)
//  - Creating new events (business users only)
//  - Fetching a single event
//  - Updating and deleting events (owner-only)
//  - Fetching "My Events" for the logged-in business user
//
// USED BY ROUTES:
//  - GET    /api/events
//  - GET    /api/events/mine
//  - GET    /api/events/:id
//  - POST   /api/events
//  - PUT    /api/events/:id
//  - DELETE /api/events/:id

import Event from "../models/Event.js";
import EventPreference from "../models/EventPreference.js";
import User from "../models/User.js";
import { geocodeEventAddress } from "../services/geocoding.js";
import {
  getNextOccurrenceDateString,
  isEventUpcoming,
} from "../../utils/eventSchedule.js";
import { getEventDistanceKm } from "../../utils/proximity.js";
import {
  EVENT_CATEGORY_TAGS,
  EVENT_CATEGORY_VALUES,
  MAX_CATEGORY_TAGS,
  MAX_VIBE_TAGS,
  VIBE_TAGS,
  getMainCategoryForTag,
  getEventCategoryFilterOptions,
} from "../../constants/eventCategories.js";

const VALID_RECURRENCE_FREQUENCIES = [
  "daily",
  "weekly",
  "selected_weekdays",
];
const VALID_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function isAdminEmail(email) {
  const adminEmails = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(email) && adminEmails.includes(String(email).toLowerCase());
}
const USER_POPULATE_FIELDS =
  "name email role businessVerificationStatus avatarKey profileImageUrl town userType languages originallyFrom interests skillLevel socialAccounts bio lookingFor instagram facebook website googleBusinessUrl phone createdAt";

function getUserId(value) {
  if (!value) return "";
  return typeof value === "string"
    ? value
    : value._id?.toString() || value.id?.toString() || "";
}

async function getBlockContext(viewerId) {
  if (!viewerId) {
    return {
      blockedIds: new Set(),
      blockedByIds: new Set(),
    };
  }

  const [viewer, usersBlockingViewer] = await Promise.all([
    User.findById(viewerId).select("blockedUsers"),
    User.find({ blockedUsers: viewerId }).select("_id"),
  ]);

  return {
    blockedIds: new Set((viewer?.blockedUsers || []).map((id) => id.toString())),
    blockedByIds: new Set(
      usersBlockingViewer.map((user) => user._id.toString())
    ),
  };
}

function filterBlockedUserList(users = [], blockContext) {
  return users.filter((user) => {
    const id = getUserId(user);
    return !blockContext.blockedIds.has(id) && !blockContext.blockedByIds.has(id);
  });
}

function normalizeOptionalString(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeRequiredString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeEventCategories({ category, categories } = {}) {
  const rawCategories = Array.isArray(categories) ? categories : [category];
  const normalizedCategories = [
    ...new Set(
      rawCategories
        .map((item) => {
          const normalized = normalizeRequiredString(item);
          return getMainCategoryForTag(normalized) || normalized;
        })
        .filter(Boolean)
    ),
  ];

  if (!normalizedCategories.length) {
    throw new Error("Please choose at least one category.");
  }

  if (normalizedCategories.length > 3) {
    throw new Error("Choose up to 3 categories.");
  }

  const invalidCategory = normalizedCategories.find(
    (item) => !EVENT_CATEGORY_VALUES.includes(item)
  );
  if (invalidCategory) {
    throw new Error(`"${invalidCategory}" is not a valid event category.`);
  }

  return normalizedCategories;
}

function normalizeCategoryTags({ categoryTags, category, categories } = {}) {
  const rawCategories = Array.isArray(categories) ? categories : [category];
  const legacyDetailTags = rawCategories
    .map((item) => normalizeRequiredString(item))
    .filter((item) => EVENT_CATEGORY_TAGS.includes(item));
  const rawTags = Array.isArray(categoryTags) ? categoryTags : [];
  const normalizedTags = [
    ...new Set(
      [...legacyDetailTags, ...rawTags]
        .map((item) => normalizeRequiredString(item))
        .filter(Boolean)
    ),
  ];

  if (normalizedTags.length > MAX_CATEGORY_TAGS) {
    throw new Error(`Choose up to ${MAX_CATEGORY_TAGS} category tags.`);
  }

  const invalidTag = normalizedTags.find(
    (item) => !EVENT_CATEGORY_TAGS.includes(item)
  );
  if (invalidTag) {
    throw new Error(`"${invalidTag}" is not a valid category tag.`);
  }

  return normalizedTags;
}

function normalizeVibeTags(value) {
  if (!Array.isArray(value)) return [];

  const normalizedTags = [
    ...new Set(
      value
        .map((item) => normalizeRequiredString(item))
        .filter(Boolean)
    ),
  ];

  if (normalizedTags.length > MAX_VIBE_TAGS) {
    throw new Error(`Choose up to ${MAX_VIBE_TAGS} vibe tags.`);
  }

  const invalidTag = normalizedTags.find((item) => !VIBE_TAGS.includes(item));
  if (invalidTag) {
    throw new Error(`"${invalidTag}" is not a valid vibe tag.`);
  }

  return normalizedTags;
}

function buildTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTimeSlots(timeSlots, fallbackTime, fallbackEndTime, isAllDay) {
  if (isAllDay) {
    return [];
  }

  const sourceSlots = Array.isArray(timeSlots)
    ? timeSlots
    : fallbackTime || fallbackEndTime
    ? [{ startTime: fallbackTime, endTime: fallbackEndTime }]
    : [];

  return sourceSlots
    .map((slot) => ({
      startTime: normalizeOptionalString(slot?.startTime),
      endTime: normalizeOptionalString(slot?.endTime),
    }))
    .filter((slot) => slot.startTime || slot.endTime);
}

function validateTimeSlots(timeSlots) {
  for (const slot of timeSlots) {
    if (slot.endTime && !slot.startTime) {
      throw new Error(
        "Each time slot needs a start time before you add an end time."
      );
    }
  }
}

function normalizeRecurrence(recurrence, scheduleType) {
  if (scheduleType !== "recurring") {
    return undefined;
  }

  const frequency = normalizeRequiredString(recurrence?.frequency || "daily");
  if (!VALID_RECURRENCE_FREQUENCIES.includes(frequency)) {
    throw new Error("Please choose a valid recurrence frequency.");
  }

  const weekdays = Array.isArray(recurrence?.weekdays)
    ? recurrence.weekdays
        .map((day) => normalizeRequiredString(day))
        .filter((day) => VALID_WEEKDAYS.includes(day))
    : [];

  if (frequency === "selected_weekdays" && weekdays.length === 0) {
    throw new Error("Choose at least one weekday for this recurring event.");
  }

  const untilDate = normalizeOptionalString(recurrence?.untilDate);

  return {
    frequency,
    weekdays: frequency === "selected_weekdays" ? weekdays : [],
    untilDate,
  };
}

function buildLegacyTimeFields(timeSlots, isAllDay) {
  if (isAllDay || !timeSlots.length) {
    return {
      time: undefined,
      endTime: undefined,
    };
  }

  return {
    time: timeSlots[0].startTime,
    endTime: timeSlots[0].endTime,
  };
}

function buildLegacyLocation(locationName, address) {
  return locationName || address || undefined;
}

async function buildGeocodedEventFields({ address, town }) {
  const normalizedAddress = normalizeRequiredString(address);
  const normalizedTown = normalizeRequiredString(town);

  if (!normalizedAddress) {
    throw new Error("A full street address is required for map placement.");
  }

  const geocoded = await geocodeEventAddress({
    address: normalizedAddress,
    town: normalizedTown,
  });

  return {
    address: normalizedAddress,
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
  };
}

function normalizeCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSearchTerms(value) {
  const normalized = normalizeRequiredString(value);
  if (!normalized) return [];

  const terms = [normalized];
  const lower = normalized.toLowerCase();

  if (lower.includes("book club") || lower.includes("bookclub")) {
    terms.push("Book Club", "Local Clubs");
  }

  return [...new Set(terms)];
}

function buildDateFilterRange(dateFilter) {
  const normalizedFilter = normalizeRequiredString(dateFilter);
  if (
    !normalizedFilter ||
    normalizedFilter === "All" ||
    normalizedFilter === "All Dates" ||
    normalizedFilter === "All dates"
  ) {
    return null;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const rangeStart = new Date(todayStart);
  const rangeEnd = new Date(todayStart);

  if (normalizedFilter === "Today") {
    rangeEnd.setDate(rangeEnd.getDate() + 1);
  } else if (normalizedFilter === "Tomorrow") {
    rangeStart.setDate(rangeStart.getDate() + 1);
    rangeEnd.setDate(rangeEnd.getDate() + 2);
  } else if (normalizedFilter === "Next 3 days") {
    rangeEnd.setDate(rangeEnd.getDate() + 3);
  } else if (normalizedFilter === "Next 7 days") {
    rangeEnd.setDate(rangeEnd.getDate() + 7);
  } else if (normalizedFilter === "Next 30 days") {
    rangeEnd.setDate(rangeEnd.getDate() + 30);
  } else if (normalizedFilter === "Next 90 days") {
    rangeEnd.setDate(rangeEnd.getDate() + 90);
  } else if (normalizedFilter === "Next 6 months") {
    rangeEnd.setMonth(rangeEnd.getMonth() + 6);
  } else if (normalizedFilter === "Next 12 months") {
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 1);
  } else {
    return null;
  }

  return { start: rangeStart, end: rangeEnd };
}

function matchesDateFilter(event, dateFilter) {
  const range = buildDateFilterRange(dateFilter);
  if (!range) return true;

  const effectiveDate = getNextOccurrenceDateString(event) || event?.date;
  if (!effectiveDate || typeof effectiveDate !== "string") {
    return false;
  }

  const [year, month, day] = effectiveDate.split("-").map(Number);
  if (!year || !month || !day) {
    return false;
  }

  const eventDay = new Date(year, month - 1, day);
  return eventDay >= range.start && eventDay < range.end;
}

// -------------------------------------------
// GET /api/events
//   Return upcoming events (today or later).
//   - Build today's date as "YYYY-MM-DD".
//   - Query events where date >= today.
//   - Sort ascending by date.
//   - Populate createdBy with business host profile fields.
// -------------------------------------------
export async function getAllEvents(req, res) {
  try {
    const todayStr = buildTodayString();
    const normalizedTown = normalizeRequiredString(req.query?.town);
    const normalizedCategory = normalizeRequiredString(req.query?.category);
    const normalizedDateFilter = normalizeRequiredString(req.query?.dateFilter);
    const searchTerms = buildSearchTerms(req.query?.search);
    const requestedPage = parsePositiveInt(req.query?.page, 1);
    const requestedLimit = Math.min(parsePositiveInt(req.query?.limit, 20), 50);
    const nearLat = parseCoordinate(req.query?.nearLat);
    const nearLng = parseCoordinate(req.query?.nearLng);
    const radiusKm = parseCoordinate(req.query?.radiusKm);
    const shouldPaginate =
      req.query?.page !== undefined || req.query?.limit !== undefined;

    const baseQuery = {
      $or: [
        {
          $or: [
            { scheduleType: { $exists: false } },
            { scheduleType: "single" },
          ],
          date: { $gte: todayStr },
        },
        {
          scheduleType: "recurring",
          $or: [
            { "recurrence.untilDate": { $exists: false } },
            { "recurrence.untilDate": null },
            { "recurrence.untilDate": "" },
            { "recurrence.untilDate": { $gte: todayStr } },
          ],
        },
      ],
    };

    if (normalizedTown && normalizedTown !== "All") {
      baseQuery.town = normalizedTown;
    }

    const categoryFilterOptions = getEventCategoryFilterOptions(normalizedCategory);

    if (categoryFilterOptions) {
      baseQuery.$and = [
        ...(baseQuery.$and || []),
        {
          $or: [
            { category: { $in: categoryFilterOptions } },
            { categories: { $in: categoryFilterOptions } },
            { categoryTags: { $in: categoryFilterOptions } },
          ],
        },
      ];
    }

    if (searchTerms.length) {
      const searchRegexes = searchTerms.map((term) => new RegExp(escapeRegex(term), "i"));
      baseQuery.$and = [
        ...(baseQuery.$and || []),
        {
          $or: [
            { title: { $in: searchRegexes } },
            { description: { $in: searchRegexes } },
            { duration: { $in: searchRegexes } },
            { priceRange: { $in: searchRegexes } },
            { bookingUrl: { $in: searchRegexes } },
            { category: { $in: searchRegexes } },
            { categories: { $in: searchRegexes } },
            { categoryTags: { $in: searchRegexes } },
            { vibeTags: { $in: searchRegexes } },
            { town: { $in: searchRegexes } },
            { locationName: { $in: searchRegexes } },
            { address: { $in: searchRegexes } },
          ],
        },
      ];
    }

    const events = await Event.find(baseQuery)
      .sort({ date: 1, createdAt: -1 })
      .populate(
        "createdBy",
        "name email role businessVerificationStatus avatarKey profileImageUrl town userType languages originallyFrom interests skillLevel socialAccounts bio lookingFor instagram facebook website googleBusinessUrl phone createdAt"
      );

    const filteredEvents =
      normalizedDateFilter && normalizedDateFilter !== "All"
        ? events.filter((event) => matchesDateFilter(event, normalizedDateFilter))
        : events;

    const nearMeEvents =
      nearLat !== null && nearLng !== null
        ? filteredEvents
            .map((event) => ({
              event,
              distanceKm: getEventDistanceKm(event, {
                latitude: nearLat,
                longitude: nearLng,
              }),
            }))
            .filter(
              ({ distanceKm }) =>
                distanceKm !== null &&
                (radiusKm === null || distanceKm <= radiusKm)
            )
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .map(({ event }) => event)
        : filteredEvents;

    if (!shouldPaginate) {
      return res.json(nearMeEvents);
    }

    const totalCount = nearMeEvents.length;
    const startIndex = (requestedPage - 1) * requestedLimit;
    const pagedEvents = nearMeEvents.slice(
      startIndex,
      startIndex + requestedLimit
    );
    const totalPages = Math.max(1, Math.ceil(totalCount / requestedLimit));

    return res.json({
      events: pagedEvents,
      page: requestedPage,
      limit: requestedLimit,
      totalCount,
      totalPages,
      hasMore: requestedPage < totalPages,
    });
  } catch (error) {
    console.error("Error in GET /api/events:", error);
    return res.status(500).json({
      message: "Error fetching events.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// POST /api/events
//   Create a new event.
//   - Requires authMiddleware (req.user.userId).
//   - Requires isBusiness middleware at route level.
//   - This controller double-checks the user + role in DB.
//
// FLOW:
//   1) Check userId from JWT.
//   2) Look up the user and confirm they're a business.
//   3) Validate required event fields.
//   4) Create and save a new Event linked to createdBy.
// -------------------------------------------
export async function createEvent(req, res) {
  try {
    const userId = req.user?.userId; // from auth middleware
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: no user ID." });
    }

    // Make sure this user still exists and is allowed to host events
    const hostUser = await User.findById(userId);
    if (!hostUser) {
      return res.status(401).json({
        message: "Your account no longer exists. Please log in again.",
      });
    }

    const canHostOfficialEvents =
      isAdminEmail(req.user?.email) ||
      isAdminEmail(hostUser.email) ||
      (hostUser.role === "business" &&
        hostUser.businessVerificationStatus === "verified");

    if (!canHostOfficialEvents) {
      return res
        .status(403)
        .json({
          message:
            "A verified business or organizer profile is required for official event posting.",
        });
    }

    const rawBody = req.body || {};
    const {
      title,
      description,
      duration,
      priceRange,
      town,
      category,
      categories,
      categoryTags,
      vibeTags,
      date,
      time,
      endTime,
      scheduleType,
      isAllDay,
      recurrence,
      timeSlots,
      latitude,
      longitude,
      locationName,
      address,
      location,
      imageUrl,
      bookingUrl,
    } = rawBody;

    const normalizedTitle = normalizeRequiredString(title);
    const normalizedTown = normalizeRequiredString(town);
    const normalizedDate = normalizeRequiredString(date);
    let normalizedCategories;
    try {
      normalizedCategories = normalizeEventCategories({ category, categories });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    let normalizedVibeTags;
    let normalizedCategoryTags;
    try {
      normalizedVibeTags = normalizeVibeTags(vibeTags);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    try {
      normalizedCategoryTags = normalizeCategoryTags({
        categoryTags,
        category,
        categories,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    const normalizedLocationName = normalizeOptionalString(
      locationName ?? location
    );
    const normalizedScheduleType =
      normalizeRequiredString(scheduleType || "single") || "single";
    const normalizedIsAllDay = Boolean(isAllDay);

    // Basic validation
    if (
      !normalizedTitle ||
      !normalizedTown ||
      !normalizedCategories.length ||
      !normalizedDate
    ) {
      return res.status(400).json({
        message: "title, town, category and date are required.",
      });
    }

    if (!["single", "recurring"].includes(normalizedScheduleType)) {
      return res.status(400).json({
        message: "Please choose a valid schedule type.",
      });
    }

    let normalizedRecurrence;
    let normalizedTimeSlots;

    try {
      normalizedRecurrence = normalizeRecurrence(
        recurrence,
        normalizedScheduleType
      );
      normalizedTimeSlots = normalizeTimeSlots(
        timeSlots,
        time,
        endTime,
        normalizedIsAllDay
      );
      validateTimeSlots(normalizedTimeSlots);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    let geocodedFields;

    const normalizedLatitude = normalizeCoordinate(latitude);
    const normalizedLongitude = normalizeCoordinate(longitude);

    if (
      normalizedLatitude !== undefined &&
      normalizedLongitude !== undefined
    ) {
      geocodedFields = {
        address: normalizeRequiredString(address),
        latitude: normalizedLatitude,
        longitude: normalizedLongitude,
      };
    } else {
      try {
        geocodedFields = await buildGeocodedEventFields({
          address,
          town: normalizedTown,
        });
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    const legacyTimeFields = buildLegacyTimeFields(
      normalizedTimeSlots,
      normalizedIsAllDay
    );

    const event = new Event({
      title: normalizedTitle,
      description: normalizeOptionalString(description),
      duration: normalizeOptionalString(duration),
      priceRange: normalizeOptionalString(priceRange),
      town: normalizedTown,
      category: normalizedCategories[0],
      categories: normalizedCategories,
      categoryTags: normalizedCategoryTags,
      vibeTags: normalizedVibeTags,
      date: normalizedDate,
      time: legacyTimeFields.time,
      endTime: legacyTimeFields.endTime,
      scheduleType: normalizedScheduleType,
      isAllDay: normalizedIsAllDay,
      recurrence: normalizedRecurrence,
      timeSlots: normalizedTimeSlots,
      locationName: normalizedLocationName,
      address: geocodedFields.address,
      location: buildLegacyLocation(
        normalizedLocationName,
        geocodedFields.address
      ),
      latitude: geocodedFields.latitude,
      longitude: geocodedFields.longitude,
      imageUrl: normalizeOptionalString(imageUrl),
      bookingUrl: normalizeOptionalString(bookingUrl),
      createdBy: userId,
    });

    const savedEvent = await event.save();

    return res.status(201).json(savedEvent);
  } catch (error) {
    console.error("Error in POST /api/events:", error);
    return res.status(500).json({
      message: "Error creating event.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// GET /api/events/:id
//   Fetch a single event by its MongoDB ID.
//   - Populates createdBy so the frontend can show host info.
// -------------------------------------------
export async function getEventById(req, res) {
  try {
    const { id } = req.params;

    const event = await Event.findById(id)
      .populate("createdBy", USER_POPULATE_FIELDS)
      .populate("attendees", USER_POPULATE_FIELDS);

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const eventObject = event.toObject();
    const blockContext = await getBlockContext(req.user?.userId);
    eventObject.attendees = filterBlockedUserList(
      eventObject.attendees || [],
      blockContext
    );

    return res.json(eventObject);
  } catch (error) {
    console.error("Error in GET /api/events/:id:", error);
    return res.status(500).json({
      message: "Error fetching event.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// POST /api/events/:id/attendance
//   Toggle the current user's "I'm going" state for an event.
// -------------------------------------------
export async function toggleEventAttendance(req, res) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const alreadyGoing = (event.attendees || []).some(
      (attendeeId) => attendeeId.toString() === userId.toString()
    );

    if (!alreadyGoing && !isEventUpcoming(event)) {
      return res.status(400).json({
        message: "This event has passed, so new attendance is closed.",
      });
    }

    if (alreadyGoing) {
      event.attendees = event.attendees.filter(
        (attendeeId) => attendeeId.toString() !== userId.toString()
      );
      await EventPreference.findOneAndUpdate(
        { userId, eventId: event._id },
        { $set: { goingReminderEnabled: false } }
      );
    } else {
      event.attendees.push(userId);
    }

    await event.save();

    const populated = await Event.findById(event._id)
      .populate("createdBy", USER_POPULATE_FIELDS)
      .populate("attendees", USER_POPULATE_FIELDS);
    const populatedObject = populated.toObject();
    const blockContext = await getBlockContext(userId);
    populatedObject.attendees = filterBlockedUserList(
      populatedObject.attendees || [],
      blockContext
    );

    return res.json({
      event: populatedObject,
      isGoing: !alreadyGoing,
      attendeesCount: populatedObject.attendees?.length || 0,
    });
  } catch (error) {
    console.error("Error in POST /api/events/:id/attendance:", error);
    return res.status(500).json({
      message: "Failed to update event attendance.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// PUT /api/events/:id
//   Update an existing event.
//   - Must be logged in.
//   - Must be the creator (business user who posted it).
//
//   1) Find event by ID.
//   2) If not found -> 404.
//   3) Check ownership (event.createdBy === userId).
//   4) Apply allowed updates from body.
//   5) Save and return updated event.
// -------------------------------------------
export async function updateEvent(req, res) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    // Find the event
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Check ownership
    if (!event.createdBy || event.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not allowed to edit this event." });
    }

    // Only update allowed fields
    const rawBody = req.body || {};
    const {
      title,
      description,
      duration,
      priceRange,
      town,
      category,
      categories,
      categoryTags,
      vibeTags,
      date,
      time,
      endTime,
      scheduleType,
      isAllDay,
      recurrence,
      timeSlots,
      latitude,
      longitude,
      locationName,
      address,
      location,
      imageUrl,
      bookingUrl,
    } = rawBody;

    if (title !== undefined) {
      const normalizedTitle = normalizeRequiredString(title);
      if (!normalizedTitle) {
        return res.status(400).json({ message: "Event title is required." });
      }
      event.title = normalizedTitle;
    }
    if (description !== undefined) {
      event.description = normalizeOptionalString(description);
    }
    if (duration !== undefined) {
      event.duration = normalizeOptionalString(duration);
    }
    if (priceRange !== undefined) {
      event.priceRange = normalizeOptionalString(priceRange);
    }
    if (town !== undefined) {
      const normalizedTown = normalizeRequiredString(town);
      if (!normalizedTown) {
        return res.status(400).json({ message: "Town is required." });
      }
      event.town = normalizedTown;
    }
    if (category !== undefined || categories !== undefined) {
      let normalizedCategories;
      try {
        normalizedCategories = normalizeEventCategories({
          category: category ?? event.category,
          categories: categories ?? event.categories,
        });
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }

      event.category = normalizedCategories[0];
      event.categories = normalizedCategories;
    }
    if (categoryTags !== undefined || category !== undefined || categories !== undefined) {
      try {
        event.categoryTags = normalizeCategoryTags({
          categoryTags: categoryTags ?? event.categoryTags,
          category: category ?? event.category,
          categories: categories ?? event.categories,
        });
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }
    if (vibeTags !== undefined) {
      try {
        event.vibeTags = normalizeVibeTags(vibeTags);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }
    if (date !== undefined) {
      const normalizedDate = normalizeRequiredString(date);
      if (!normalizedDate) {
        return res.status(400).json({ message: "Event date is required." });
      }
      event.date = normalizedDate;
    }
    if (scheduleType !== undefined) {
      const normalizedScheduleType = normalizeRequiredString(scheduleType);
      if (!["single", "recurring"].includes(normalizedScheduleType)) {
        return res
          .status(400)
          .json({ message: "Please choose a valid schedule type." });
      }
      event.scheduleType = normalizedScheduleType;
    }
    if (isAllDay !== undefined) {
      event.isAllDay = Boolean(isAllDay);
    }
    if (locationName !== undefined || location !== undefined) {
      event.locationName = normalizeOptionalString(locationName ?? location);
    }
    if (imageUrl !== undefined) event.imageUrl = normalizeOptionalString(imageUrl);
    if (bookingUrl !== undefined) event.bookingUrl = normalizeOptionalString(bookingUrl);

    if (
      recurrence !== undefined ||
      timeSlots !== undefined ||
      time !== undefined ||
      endTime !== undefined ||
      scheduleType !== undefined ||
      isAllDay !== undefined
    ) {
      try {
        const normalizedRecurrence = normalizeRecurrence(
          recurrence ?? event.recurrence,
          event.scheduleType || "single"
        );
        const normalizedTimeSlots = normalizeTimeSlots(
          timeSlots !== undefined ? timeSlots : event.timeSlots,
          time !== undefined ? time : event.time,
          endTime !== undefined ? endTime : event.endTime,
          event.isAllDay
        );
        validateTimeSlots(normalizedTimeSlots);

        event.recurrence = normalizedRecurrence;
        event.timeSlots = normalizedTimeSlots;

        const legacyTimeFields = buildLegacyTimeFields(
          normalizedTimeSlots,
          event.isAllDay
        );
        event.time = legacyTimeFields.time;
        event.endTime = legacyTimeFields.endTime;
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    if (
      address !== undefined ||
      town !== undefined ||
      latitude !== undefined ||
      longitude !== undefined
    ) {
      const normalizedLatitude = normalizeCoordinate(latitude);
      const normalizedLongitude = normalizeCoordinate(longitude);

      if (
        normalizedLatitude !== undefined &&
        normalizedLongitude !== undefined
      ) {
        event.address = normalizeRequiredString(
          address !== undefined ? address : event.address
        );
        event.latitude = normalizedLatitude;
        event.longitude = normalizedLongitude;
      } else {
        try {
          const geocodedFields = await buildGeocodedEventFields({
            address: address !== undefined ? address : event.address,
            town: event.town,
          });

          event.address = geocodedFields.address;
          event.latitude = geocodedFields.latitude;
          event.longitude = geocodedFields.longitude;
        } catch (error) {
          return res.status(400).json({ message: error.message });
        }
      }
    }

    event.location = buildLegacyLocation(event.locationName, event.address);

    const updated = await event.save();

    return res.json(updated);
  } catch (error) {
    console.error("Error in PUT /api/events/:id:", error);
    return res.status(500).json({
      message: "Error updating event.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// DELETE /api/events/:id
//   Delete an event completely.
//   - Must be logged in.
//   - Must be the business user that created it.
// -------------------------------------------
export async function deleteEvent(req, res) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    // Find the event
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Check ownership
    if (!event.createdBy || event.createdBy.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not allowed to delete this event." });
    }

    await event.deleteOne();

    return res.json({ message: "Event deleted successfully." });
  } catch (error) {
    console.error("Error in DELETE /api/events/:id:", error);
    return res.status(500).json({
      message: "Error deleting event.",
      error: error.message,
    });
  }
}

// -------------------------------------------
// GET /api/events/mine
//   Fetch events created by the currently logged-in user.
//   - Must be logged in.
//   - Used for the "My Events" screen so businesses can manage their posts.
// -------------------------------------------
export async function getMyEvents(req, res) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: no user ID." });
    }

    // Find events where createdBy matches this user
    const events = await Event.find({ createdBy: userId })
      .sort({ date: 1 })
      .populate(
        "createdBy",
        "name email role businessVerificationStatus avatarKey profileImageUrl town userType languages originallyFrom interests skillLevel socialAccounts bio lookingFor instagram facebook website googleBusinessUrl phone createdAt"
      );

    return res.json(events);
  } catch (error) {
    console.error("Error in GET /api/events/mine:", error);
    return res.status(500).json({
      message: "Error fetching your events.",
      error: error.message,
    });
  }
}



