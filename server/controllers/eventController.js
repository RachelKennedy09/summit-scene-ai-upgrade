// server/controllers/eventController.js
// Controller functions for SummitScene events
//  - Listing upcoming events (for Hub + Map)
//  - Creating new events (business users only)
//  - Fetching a single event
//  - Updating and deleting events (owner or admin)
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
  getNextOccurrenceDate,
  getNextOccurrenceDateString,
  isEventUpcoming,
} from "../../utils/eventSchedule.js";
import { getEventDistanceKm } from "../../utils/proximity.js";
import {
  EVENT_CATEGORY_TAGS,
  EVENT_CATEGORY_VALUES,
  COMMUNITY_SUPPORT_CATEGORIES,
  VIBE_TAGS,
  getMainCategoryForTag,
  getEventCategoryFilterOptions,
} from "../../constants/eventCategories.js";
import {
  COMMUNITY_EVENT_TAGS,
  EVENT_AUDIENCE_OPTIONS,
} from "../../constants/eventAudience.js";
import { findContentModerationIssue } from "../utils/contentModeration.js";
import { isAdminEmail } from "../utils/adminAccess.js";

const VALID_RECURRENCE_FREQUENCIES = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "selected_weekdays",
  "selected_dates",
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
const EVENT_TIME_ZONE = process.env.EVENT_TIME_ZONE || "America/Edmonton";

const USER_POPULATE_FIELDS =
  "name email role isAdmin businessVerificationStatus avatarKey profileImageUrl town towns userType languages originallyFrom interests businessVibeTags skillLevel socialAccounts bio lookingFor instagram facebook website googleBusinessUrl phone createdAt";
const COMPACT_EVENT_LIST_FIELDS = [
  "title",
  "date",
  "time",
  "endTime",
  "scheduleType",
  "isAllDay",
  "recurrence",
  "timeSlots",
  "town",
  "category",
  "categories",
  "categoryTags",
  "vibeTags",
  "audience",
  "communityTags",
  "locationName",
  "location",
  "address",
  "latitude",
  "longitude",
  "imageUrl",
  "bookingUrl",
  "priceRange",
  "sourceUrl",
  "sourceName",
  "sourceType",
  "importedBySummitScene",
  "createdBy",
  "createdAt",
].join(" ");

function getUserId(value) {
  if (!value) return "";
  return typeof value === "string"
    ? value
    : value._id?.toString() || value.id?.toString() || "";
}

function isMongoObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || "").trim());
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

  const invalidTag = normalizedTags.find((item) => !VIBE_TAGS.includes(item));
  if (invalidTag) {
    throw new Error(`"${invalidTag}" is not a valid vibe tag.`);
  }

  return normalizedTags;
}

function normalizeEventAudience(value) {
  const normalized = normalizeRequiredString(value || "Everyone welcome");
  if (!EVENT_AUDIENCE_OPTIONS.includes(normalized)) {
    throw new Error(`"${normalized}" is not a valid event audience.`);
  }

  return normalized;
}

function normalizeCommunityTags(value) {
  if (!Array.isArray(value)) return [];

  const normalizedTags = [
    ...new Set(
      value
        .map((item) => normalizeRequiredString(item))
        .filter(Boolean)
    ),
  ];

  const invalidTag = normalizedTags.find(
    (item) => !COMMUNITY_EVENT_TAGS.includes(item)
  );
  if (invalidTag) {
    throw new Error(`"${invalidTag}" is not a valid community event tag.`);
  }

  return normalizedTags;
}

function buildDateStringInEventTimeZone(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function buildDateFromDateString(dateString) {
  const [year, month, day] = String(dateString || "").split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function buildTodayString() {
  return buildDateStringInEventTimeZone();
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

function normalizeSelectedDates(dates) {
  if (!Array.isArray(dates)) {
    return [];
  }

  return [
    ...new Set(
      dates
        .map((date) => normalizeRequiredString(date))
        .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    ),
  ].sort();
}

function normalizeRecurrenceFrequency(value, recurrence) {
  const hasSelectedDates = normalizeSelectedDates(
    recurrence?.dates || recurrence?.selectedDates || recurrence?.customDates
  ).length > 0;
  const normalized = normalizeRequiredString(value || (hasSelectedDates ? "selected_dates" : "daily"));
  const lower = normalized.toLowerCase();
  const aliasMap = {
    "custom selected dates": "selected_dates",
    "custom selected date": "selected_dates",
    "custom dates": "selected_dates",
    "custom date": "selected_dates",
    "selected dates": "selected_dates",
    "selected date": "selected_dates",
    custom_selected_dates: "selected_dates",
    custom_selected_date: "selected_dates",
    custom_dates: "selected_dates",
    custom_date: "selected_dates",
    selected_dates: "selected_dates",
    selected_date: "selected_dates",
    "selected weekdays": "selected_weekdays",
    "selected weekday": "selected_weekdays",
    selected_weekdays: "selected_weekdays",
    selected_weekday: "selected_weekdays",
    weekdays: "selected_weekdays",
    weekday: "selected_weekdays",
    daily: "daily",
    weekly: "weekly",
    "bi-weekly": "biweekly",
    biweekly: "biweekly",
    "every other week": "biweekly",
    monthly: "monthly",
  };

  if (aliasMap[lower]) {
    return aliasMap[lower];
  }

  if (hasSelectedDates && lower.includes("date")) {
    return "selected_dates";
  }

  if (lower.includes("weekday")) {
    return "selected_weekdays";
  }

  return normalized;
}

function normalizeRecurrence(recurrence, scheduleType) {
  if (scheduleType !== "recurring") {
    return undefined;
  }

  const frequency = normalizeRecurrenceFrequency(recurrence?.frequency, recurrence);
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

  const dates = normalizeSelectedDates(
    recurrence?.dates || recurrence?.selectedDates || recurrence?.customDates
  );
  if (frequency === "selected_dates" && dates.length === 0) {
    throw new Error("Choose at least one available date for this event.");
  }

  const untilDate = normalizeOptionalString(recurrence?.untilDate);

  return {
    frequency,
    weekdays: frequency === "selected_weekdays" ? weekdays : [],
    dates: frequency === "selected_dates" ? dates : [],
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

function parseTimeToMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 23 * 60 + 59;

  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  if (match[3].toUpperCase() === "PM") {
    hours += 12;
  }
  return hours * 60 + minutes;
}

function getSortableEventTime(event) {
  const nextDate = getNextOccurrenceDateString(event) || event?.date;
  const date = buildDateFromDateString(nextDate);
  const dateTime = Number.isNaN(date.getTime())
    ? Number.MAX_SAFE_INTEGER
    : date.getTime();
  return dateTime + parseTimeToMinutes(event?.time) * 60000;
}

function sortEventsByNextOccurrence(events) {
  return events.slice().sort((a, b) => {
    const timeDiff = getSortableEventTime(a) - getSortableEventTime(b);
    if (timeDiff !== 0) return timeDiff;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
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

function canUseSummitSceneImportFlag(user, tokenUser) {
  return Boolean(
    user?.isAdmin || isAdminEmail(user?.email) || isAdminEmail(tokenUser?.email)
  );
}

function isSummitSceneAdminCreatedEvent(eventObject) {
  const creator =
    eventObject?.createdBy && typeof eventObject.createdBy === "object"
      ? eventObject.createdBy
      : null;
  const creatorName = normalizeRequiredString(creator?.name).toLowerCase();
  const hasVenueHost = Boolean(
    normalizeRequiredString(eventObject?.venueName) ||
      normalizeRequiredString(eventObject?.locationName)
  );
  const isSummitSceneCreator =
    creator?.isAdmin ||
    isAdminEmail(creator?.email) ||
    creatorName === "summit scene admin" ||
    creatorName === "summit scene";

  return hasVenueHost && isSummitSceneCreator;
}

function decorateEventForResponse(event) {
  const eventObject =
    event && typeof event.toObject === "function" ? event.toObject() : event;

  if (!eventObject || typeof eventObject !== "object") {
    return eventObject;
  }

  if (!eventObject.importedBySummitScene && isSummitSceneAdminCreatedEvent(eventObject)) {
    return {
      ...eventObject,
      importedBySummitScene: true,
    };
  }

  return eventObject;
}

function isTruthyQueryValue(value) {
  return ["1", "true", "yes"].includes(String(value || "").toLowerCase());
}

function decorateCompactEventForResponse(event) {
  const eventObject = decorateEventForResponse(event);

  if (!eventObject || typeof eventObject !== "object") {
    return eventObject;
  }

  const imageUrl =
    typeof eventObject.imageUrl === "string" ? eventObject.imageUrl : "";

  return {
    ...eventObject,
    imageUrl: imageUrl.startsWith("data:") ? "" : imageUrl,
  };
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
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "at",
    "for",
    "in",
    "of",
    "or",
    "the",
    "to",
    "with",
  ]);

  normalized
    .split(/\s+/)
    .map((term) => term.replace(/^[^\w$]+|[^\w$]+$/g, ""))
    .filter((term) => term.length >= 2 && !stopWords.has(term.toLowerCase()))
    .forEach((term) => terms.push(term));

  if (lower.includes("book club") || lower.includes("bookclub")) {
    terms.push("Book Club", "Local Clubs");
  }

  return [...new Set(terms)];
}

function isDateOnlyString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function buildCustomDateRange(startDate, endDate) {
  if (!isDateOnlyString(startDate)) return null;

  const rangeStart = buildDateFromDateString(startDate);
  const rangeEnd = isDateOnlyString(endDate)
    ? buildDateFromDateString(endDate)
    : buildDateFromDateString(startDate);

  if (rangeEnd < rangeStart) {
    rangeEnd.setTime(rangeStart.getTime());
  }

  rangeEnd.setDate(rangeEnd.getDate() + 1);
  return { start: rangeStart, end: rangeEnd };
}

function buildDateFilterRange(dateFilter, startDate, endDate) {
  const customRange = buildCustomDateRange(startDate, endDate);
  if (customRange) return customRange;

  const normalizedFilter = normalizeRequiredString(dateFilter);
  if (
    !normalizedFilter ||
    normalizedFilter === "All" ||
    normalizedFilter === "All Dates" ||
    normalizedFilter === "All dates"
  ) {
    return null;
  }

  const todayStart = buildDateFromDateString(buildTodayString());
  const rangeStart = new Date(todayStart);
  const rangeEnd = new Date(todayStart);

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedFilter)) {
    rangeStart.setTime(buildDateFromDateString(normalizedFilter).getTime());
    rangeEnd.setTime(rangeStart.getTime());
    rangeEnd.setDate(rangeEnd.getDate() + 1);
  } else if (normalizedFilter === "Today") {
    rangeEnd.setDate(rangeEnd.getDate() + 1);
  } else if (normalizedFilter === "Tomorrow") {
    rangeStart.setDate(rangeStart.getDate() + 1);
    rangeEnd.setDate(rangeEnd.getDate() + 2);
  } else if (normalizedFilter === "Next 3 days") {
    rangeEnd.setDate(rangeEnd.getDate() + 3);
  } else if (normalizedFilter === "This weekend") {
    const day = rangeStart.getDay();
    const saturdayOffset = day === 0 ? -1 : 6 - day;
    rangeStart.setDate(rangeStart.getDate() + saturdayOffset);
    rangeEnd.setTime(rangeStart.getTime());
    rangeEnd.setDate(rangeEnd.getDate() + 2);
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

function matchesDateFilter(event, dateFilter, startDate, endDate) {
  const range = buildDateFilterRange(dateFilter, startDate, endDate);
  if (!range) return true;

  const nextOccurrence = getNextOccurrenceDate(event, range.start);
  return Boolean(
    nextOccurrence &&
      nextOccurrence >= range.start &&
      nextOccurrence < range.end
  );
}

function buildCategoryListingConditions(values) {
  return [
    { category: { $in: values } },
    { categories: { $in: values } },
    { categoryTags: { $in: values } },
  ];
}

const TOUR_EVENT_TAG_EXCLUSIONS = [
  "Canada Day",
  "Christmas Markets",
  "Holiday Events",
  "Ski Season Launch",
  "Stampede Events",
  "Summer Kickoff",
];

function buildCategoryExclusionConditions(values) {
  return [
    { category: { $nin: values } },
    { categories: { $nin: values } },
    { categoryTags: { $nin: values } },
  ];
}

function buildToursListingConditions() {
  const categoryOptions =
    getEventCategoryFilterOptions("Tours & Experiences") || [
      "Tours & Experiences",
    ];
  const tourTagOptions = categoryOptions.filter(
    (option) =>
      option !== "Tours & Experiences" &&
      !TOUR_EVENT_TAG_EXCLUSIONS.includes(option)
  );

  return [
    ...buildCategoryListingConditions(tourTagOptions),
    {
      $and: [
        {
          $or: [
            { category: "Tours & Experiences" },
            { categories: "Tours & Experiences" },
          ],
        },
        ...buildCategoryExclusionConditions(TOUR_EVENT_TAG_EXCLUSIONS),
      ],
    },
  ];
}

function buildRestaurantSpecialListingConditions() {
  return buildCategoryListingConditions([
    "Restaurant Specials",
    "Brunch",
    "Cocktail Nights",
    "Coffee",
    "Breweries",
    "Wine Tastings",
  ]);
}

function buildClassListingConditions() {
  return buildCategoryListingConditions([
    "Fitness Classes",
    "Gym Events",
    "Low-Impact Fitness",
    "Run Clubs",
    "Strength Training",
    "Yoga",
    "Wellness Retreats",
  ]);
}

function buildDirectoryListingConditions() {
  return [
    ...buildToursListingConditions(),
    ...buildRestaurantSpecialListingConditions(),
    ...buildClassListingConditions(),
  ];
}

function buildListingTypeCondition(listingType) {
  if (!listingType || listingType === "All") return null;
  if (listingType === "tours") return { $or: buildToursListingConditions() };
  if (listingType === "restaurant_specials") {
    return { $or: buildRestaurantSpecialListingConditions() };
  }
  if (listingType === "classes") return { $or: buildClassListingConditions() };
  if (listingType === "events") return { $nor: buildDirectoryListingConditions() };
  return null;
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
    const normalizedStartDate = normalizeRequiredString(req.query?.startDate);
    const normalizedEndDate = normalizeRequiredString(req.query?.endDate);
    const normalizedAudience = normalizeRequiredString(req.query?.audience);
    const normalizedListingType = normalizeRequiredString(req.query?.listingType);
    const communityOnly = String(req.query?.communityOnly || "") === "true";
    const useCompactResponse = isTruthyQueryValue(req.query?.compact);
    const searchTerms = buildSearchTerms(req.query?.search);
    const requestedPage = parsePositiveInt(req.query?.page, 1);
    const maxLimit = useCompactResponse ? 250 : 50;
    const requestedLimit = Math.min(parsePositiveInt(req.query?.limit, 20), maxLimit);
    const nearLat = parseCoordinate(req.query?.nearLat);
    const nearLng = parseCoordinate(req.query?.nearLng);
    const radiusKm = parseCoordinate(req.query?.radiusKm);
    const creatorId = normalizeRequiredString(req.query?.creatorId);
    const shouldPaginate =
      req.query?.page !== undefined || req.query?.limit !== undefined;

    if (normalizedStartDate && !isDateOnlyString(normalizedStartDate)) {
      return res.status(400).json({ message: "Invalid start date." });
    }

    if (normalizedEndDate && !isDateOnlyString(normalizedEndDate)) {
      return res.status(400).json({ message: "Invalid end date." });
    }

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
            {
              "recurrence.frequency": "selected_dates",
              "recurrence.dates": { $gte: todayStr },
            },
            {
              "recurrence.frequency": { $ne: "selected_dates" },
              $or: [
                { "recurrence.untilDate": { $exists: false } },
                { "recurrence.untilDate": null },
                { "recurrence.untilDate": "" },
                { "recurrence.untilDate": { $gte: todayStr } },
              ],
            },
          ],
        },
      ],
    };

    if (normalizedTown && normalizedTown !== "All") {
      baseQuery.town = normalizedTown;
    }

    if (creatorId) {
      if (!isMongoObjectId(creatorId)) {
        return res.status(400).json({ message: "Invalid creator id." });
      }

      baseQuery.createdBy = creatorId;
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

    if (communityOnly) {
      const communityCategoryOptions =
        getEventCategoryFilterOptions("Community") || [
          "Community",
          ...COMMUNITY_SUPPORT_CATEGORIES,
        ];

      baseQuery.$and = [
        ...(baseQuery.$and || []),
        {
          $or: [
            { audience: "Community-focused" },
            { category: { $in: communityCategoryOptions } },
            { categories: { $in: communityCategoryOptions } },
            { categoryTags: { $in: communityCategoryOptions } },
            { communityTags: { $in: COMMUNITY_EVENT_TAGS } },
          ],
        },
      ];
    } else if (normalizedAudience) {
      if (!EVENT_AUDIENCE_OPTIONS.includes(normalizedAudience)) {
        return res.status(400).json({ message: "Invalid event audience." });
      }
      baseQuery.audience = normalizedAudience;
    }

    if (normalizedListingType && normalizedListingType !== "All") {
      if (
        !["events", "tours", "restaurant_specials", "classes"].includes(
          normalizedListingType
        )
      ) {
        return res.status(400).json({ message: "Invalid listing type." });
      }

      const listingTypeCondition = buildListingTypeCondition(normalizedListingType);
      baseQuery.$and = [
        ...(baseQuery.$and || []),
        listingTypeCondition,
      ];
    }

    if (searchTerms.length) {
      const searchRegexes = searchTerms.map((term) => new RegExp(escapeRegex(term), "i"));
      const matchingCreators = await User.find({
        $or: [
          { name: { $in: searchRegexes } },
          { email: { $in: searchRegexes } },
          { town: { $in: searchRegexes } },
          { userType: { $in: searchRegexes } },
          { bio: { $in: searchRegexes } },
          { lookingFor: { $in: searchRegexes } },
          { businessVibeTags: { $in: searchRegexes } },
          { website: { $in: searchRegexes } },
          { googleBusinessUrl: { $in: searchRegexes } },
          { instagram: { $in: searchRegexes } },
          { facebook: { $in: searchRegexes } },
          { phone: { $in: searchRegexes } },
        ],
      }).select("_id");
      const matchingCreatorIds = matchingCreators.map((user) => user._id);

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
            { audience: { $in: searchRegexes } },
            { communityTags: { $in: searchRegexes } },
            { town: { $in: searchRegexes } },
            { locationName: { $in: searchRegexes } },
            { location: { $in: searchRegexes } },
            { address: { $in: searchRegexes } },
            ...(matchingCreatorIds.length
              ? [{ createdBy: { $in: matchingCreatorIds } }]
              : []),
          ],
        },
      ];
    }

    const eventQuery = Event.find(baseQuery).sort({ date: 1, createdAt: -1 });

    if (useCompactResponse) {
      eventQuery.select(COMPACT_EVENT_LIST_FIELDS).lean({ virtuals: true });
    } else {
      eventQuery.populate(
        "createdBy",
        "name email role businessVerificationStatus avatarKey profileImageUrl town towns userType languages originallyFrom interests businessVibeTags skillLevel socialAccounts bio lookingFor instagram facebook website googleBusinessUrl phone createdAt"
      );
    }

    const events = await eventQuery;

    const filteredEvents =
      (normalizedDateFilter && normalizedDateFilter !== "All") || normalizedStartDate
        ? events.filter((event) =>
            matchesDateFilter(
              event,
              normalizedDateFilter,
              normalizedStartDate,
              normalizedEndDate
            )
          )
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
    const sortedEvents =
      nearLat !== null && nearLng !== null
        ? nearMeEvents
        : sortEventsByNextOccurrence(nearMeEvents);

    const responseDecorator = useCompactResponse
      ? decorateCompactEventForResponse
      : decorateEventForResponse;

    if (!shouldPaginate) {
      return res.json(sortedEvents.map(responseDecorator));
    }

    const totalCount = sortedEvents.length;
    const startIndex = (requestedPage - 1) * requestedLimit;
    const pagedEvents = sortedEvents.slice(
      startIndex,
      startIndex + requestedLimit
    ).map(responseDecorator);
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
      hostUser.isAdmin ||
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
      audience,
      communityTags,
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
      bookingRequired,
      importedBySummitScene,
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
    let normalizedAudience;
    let normalizedCommunityTags;
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
    try {
      normalizedAudience = normalizeEventAudience(audience);
      normalizedCommunityTags = normalizeCommunityTags(communityTags);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    const normalizedLocationName = normalizeOptionalString(
      locationName ?? location
    );
    const canMarkImportedBySummitScene = canUseSummitSceneImportFlag(
      hostUser,
      req.user
    );
    const shouldMarkImportedBySummitScene =
      canMarkImportedBySummitScene && Boolean(importedBySummitScene);
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

    if (bookingRequired && !normalizeOptionalString(bookingUrl)) {
      return res.status(400).json({
        message: "A booking link is required when booking is required.",
      });
    }

    if (shouldMarkImportedBySummitScene && !normalizedLocationName) {
      return res.status(400).json({
        message:
          "Please add the business or venue name so the imported event shows the right host.",
      });
    }

    const moderationIssue = findContentModerationIssue({
      title: normalizedTitle,
      description: normalizeOptionalString(description),
      duration: normalizeOptionalString(duration),
      priceRange: normalizeOptionalString(priceRange),
      locationName: normalizedLocationName,
    });
    if (moderationIssue) {
      return res.status(400).json({ message: moderationIssue.message });
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
      audience: normalizedAudience,
      communityTags: normalizedCommunityTags,
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
      bookingRequired: Boolean(bookingRequired),
      importedBySummitScene: shouldMarkImportedBySummitScene,
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

    return res.json(decorateEventForResponse(eventObject));
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
      event: decorateEventForResponse(populatedObject),
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
//   - Must be the creator (business user who posted it) or an admin.
//
//   1) Find event by ID.
//   2) If not found -> 404.
//   3) Check ownership/admin access.
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

    const editor = await User.findById(userId).select("email isAdmin");
    const isOwner = Boolean(
      event.createdBy && event.createdBy.toString() === userId
    );
    const isAdminEditor = canUseSummitSceneImportFlag(editor, req.user);

    // Check ownership/admin access
    if (!isOwner && !isAdminEditor) {
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
      audience,
      communityTags,
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
      bookingRequired,
      importedBySummitScene,
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
    if (audience !== undefined) {
      try {
        event.audience = normalizeEventAudience(audience);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }
    if (communityTags !== undefined) {
      try {
        event.communityTags = normalizeCommunityTags(communityTags);
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
    if (bookingRequired !== undefined) event.bookingRequired = Boolean(bookingRequired);
    if (event.bookingRequired && !normalizeOptionalString(event.bookingUrl)) {
      return res.status(400).json({
        message: "A booking link is required when booking is required.",
      });
    }
    if (importedBySummitScene !== undefined) {
      if (isAdminEditor) {
        event.importedBySummitScene = Boolean(importedBySummitScene);
      }
    }
    if (event.importedBySummitScene && !event.locationName) {
      return res.status(400).json({
        message:
          "Please add the business or venue name so the imported event shows the right host.",
      });
    }

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

    const moderationIssue = findContentModerationIssue({
      title: event.title,
      description: event.description,
      duration: event.duration,
      priceRange: event.priceRange,
      locationName: event.locationName,
    });
    if (moderationIssue) {
      return res.status(400).json({ message: moderationIssue.message });
    }

    const updated = await event.save();
    const populated = await Event.findById(updated._id).populate(
      "createdBy",
      USER_POPULATE_FIELDS
    );

    return res.json(decorateEventForResponse(populated || updated));
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
//   - Must be the business user that created it or an admin.
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

    const editor = await User.findById(userId).select("email isAdmin");
    const isOwner = Boolean(
      event.createdBy && event.createdBy.toString() === userId
    );
    const isAdminEditor = canUseSummitSceneImportFlag(editor, req.user);

    // Check ownership/admin access
    if (!isOwner && !isAdminEditor) {
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
        "name email role businessVerificationStatus avatarKey profileImageUrl town towns userType languages originallyFrom interests businessVibeTags skillLevel socialAccounts bio lookingFor instagram facebook website googleBusinessUrl phone createdAt"
      );

    return res.json(events.map(decorateEventForResponse));
  } catch (error) {
    console.error("Error in GET /api/events/mine:", error);
    return res.status(500).json({
      message: "Error fetching your events.",
      error: error.message,
    });
  }
}
