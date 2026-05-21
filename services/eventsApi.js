// services/eventsApi.js
// Centralized helper functions for interacting with the Events API.

import { getNextOccurrenceDateString } from "../utils/eventSchedule";
import { toUserFriendlyError } from "../utils/friendlyErrors";
//
// Endpoints used:
//   GET    /api/events                     → fetch all events
//   GET    /api/events/:id                 → fetch one event
//   POST   /api/events                     → create event  (business only)
//   PUT    /api/events/:id                 → update event  (business only)
//   DELETE /api/events/:id                 → delete event  (business only)

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const EVENTS_REQUEST_TIMEOUT_MS = 15000;

// Build headers helper (optional token)
function buildHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = EVENTS_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function normalizeEventsError(error, fallbackMessage) {
  if (error?.name === "AbortError") {
    return new Error(fallbackMessage);
  }

  if (
    typeof error?.message === "string" &&
    error.message.toLowerCase().includes("aborted")
  ) {
    return new Error(fallbackMessage);
  }

  return error;
}

function toSortableEventTime(event) {
  const sortableDate = getNextOccurrenceDateString(event) || event?.date;

  if (!sortableDate || typeof sortableDate !== "string") {
    return Number.MAX_SAFE_INTEGER;
  }

  const [year, month, day] = sortableDate.split("-").map(Number);
  if (!year || !month || !day) {
    return Number.MAX_SAFE_INTEGER;
  }

  let hours = 23;
  let minutes = 59;

  if (event.time && typeof event.time === "string") {
    const match = event.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      hours = Number(match[1]) % 12;
      minutes = Number(match[2]);
      const meridiem = match[3].toUpperCase();
      if (meridiem === "PM") {
        hours += 12;
      }
    }
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
}

export function sortEventsByUpcomingDate(events) {
  return (Array.isArray(events) ? events : []).slice().sort((a, b) => {
    return toSortableEventTime(a) - toSortableEventTime(b);
  });
}

function buildEventsQueryString(options = {}) {
  const params = new URLSearchParams();

  if (options.page) {
    params.set("page", String(options.page));
  }
  if (options.limit) {
    params.set("limit", String(options.limit));
  }
  if (options.town && options.town !== "All") {
    params.set("town", options.town);
  }
  if (options.category && options.category !== "All") {
    params.set("category", options.category);
  }
  if (
    options.dateFilter &&
    options.dateFilter !== "All" &&
    options.dateFilter !== "All dates"
  ) {
    params.set("dateFilter", options.dateFilter);
  }
  if (
    Number.isFinite(options.nearLat) &&
    Number.isFinite(options.nearLng)
  ) {
    params.set("nearLat", String(options.nearLat));
    params.set("nearLng", String(options.nearLng));
  }
  if (Number.isFinite(options.radiusKm)) {
    params.set("radiusKm", String(options.radiusKm));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

//    FETCH ALL EVENTS
//    GET /api/events
//    Returns: array of event objects

export async function fetchEvents(options = {}) {
  const queryString = buildEventsQueryString(options);
  const url = `${BASE_URL}/api/events${queryString}`;
  const expectsPaginatedResponse = Boolean(options.page || options.limit);

  try {
    const res = await fetchWithTimeout(url);
    const data = await readJsonSafely(res);

    if (!res.ok) {
      console.error("fetchEvents backend failure:", {
        url,
        status: res.status,
        message: data.message || data.error || "Unknown backend error",
      });
      throw new Error(
        data.message || data.error || `Failed to fetch events (${res.status})`
      );
    }

    if (expectsPaginatedResponse) {
      return {
        events: sortEventsByUpcomingDate(data.events),
        page: data.page || options.page || 1,
        limit: data.limit || options.limit || 20,
        totalCount: Number.isFinite(data.totalCount) ? data.totalCount : 0,
        totalPages: Number.isFinite(data.totalPages) ? data.totalPages : 1,
        hasMore: Boolean(data.hasMore),
      };
    }

    return sortEventsByUpcomingDate(data);
  } catch (error) {
    const normalizedError = normalizeEventsError(
      error,
      "Events request timed out. Check the backend and try again."
    );
    console.error("fetchEvents load failure:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't load events right now. Please try again."
    );
  }
}

//    FETCH MY EVENTS
//    GET /api/mine

export async function fetchMyEvents(token) {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/events/mine`, {
      headers: buildHeaders(token),
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      console.error("fetchMyEvents backend failure:", {
        url: `${BASE_URL}/api/events/mine`,
        status: res.status,
        message: data.message || data.error || "Unknown backend error",
      });
      const message =
        data.message ||
        data.error ||
        `Failed to fetch my events (${res.status})`;
      throw new Error(message);
    }

    return sortEventsByUpcomingDate(data);
  } catch (error) {
    const normalizedError = normalizeEventsError(
      error,
      "My Events request timed out. Check the backend and try again."
    );
    console.error("fetchMyEvents load failure:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't load your events right now. Please try again."
    );
  }
}

//    CREATE EVENT (Business only)
//    POST /api/events
//    Body: eventData
//    Returns: { ok, status, data } structure for easier screen-side handling

export async function createEvent(eventData, token) {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/events`, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify(eventData),
    });

    const data = await readJsonSafely(res);

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (error) {
    const normalizedError = normalizeEventsError(
      error,
      "Create event request timed out. Check the backend and try again."
    );
    console.warn("createEvent issue:", normalizedError.message);
    return {
      ok: false,
      status: 0,
      data: {
        message: toUserFriendlyError(
          normalizedError,
          "We couldn't publish your event. Please try again."
        ).message,
      },
    };
  }
}

//    DELETE EVENT (Business only)
//    DELETE /api/events/:eventId
//    Returns: true if success

export async function deleteEvent(eventId, token) {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/events/${eventId}`, {
      method: "DELETE",
      headers: buildHeaders(token),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed to delete event (${res.status})`);
    }

    return true;
  } catch (error) {
    const normalizedError = normalizeEventsError(
      error,
      "Delete event request timed out. Check the backend and try again."
    );
    console.warn("deleteEvent issue:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't delete this event right now. Please try again."
    );
  }
}

//    UPDATE EVENT (Business only)
//    PUT /api/events/:eventId
//    Body: updated event data
//    Returns: updated event object

export async function updateEvent(eventId, eventData, token) {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/events/${eventId}`, {
      method: "PUT",
      headers: buildHeaders(token),
      body: JSON.stringify(eventData),
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      const message =
        data.message || `Failed to update event (status ${res.status})`;
      throw new Error(message);
    }

    return data;
  } catch (error) {
    const normalizedError = normalizeEventsError(
      error,
      "Update event request timed out. Check the backend and try again."
    );
    console.warn("updateEvent issue:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't save your event changes. Please try again."
    );
  }
}

//    FETCH SINGLE EVENT
//    GET /api/events/:eventId
//    Returns: single event object

export async function fetchEventById(eventId, token) {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/events/${eventId}`, {
      headers: buildHeaders(token),
    });
    const data = await readJsonSafely(res);

    if (!res.ok) {
      console.error("fetchEventById backend failure:", {
        url: `${BASE_URL}/api/events/${eventId}`,
        status: res.status,
        message: data.message || data.error || "Unknown backend error",
      });
      throw new Error(
        data.message || data.error || `Failed to fetch event (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalizedError = normalizeEventsError(
      error,
      "Event details request timed out. Check the backend and try again."
    );
    console.error("fetchEventById load failure:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't load this event right now. Please try again."
    );
  }
}

export async function toggleEventAttendance(eventId, token) {
  try {
    const res = await fetchWithTimeout(
      `${BASE_URL}/api/events/${eventId}/attendance`,
      {
        method: "POST",
        headers: buildHeaders(token),
      }
    );
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.message ||
          data.error ||
          `Failed to update attendance (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalizedError = normalizeEventsError(
      error,
      "Attendance request timed out. Check the backend and try again."
    );
    console.warn("toggleEventAttendance issue:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't update whether you're going. Please try again."
    );
  }
}
