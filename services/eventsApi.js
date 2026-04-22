// services/eventsApi.js
// Centralized helper functions for interacting with the Events API.
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

// Build headers helper (optional token)
function buildHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

//    FETCH ALL EVENTS
//    GET /api/events
//    Returns: array of event objects

export async function fetchEvents() {
  try {
    const res = await fetch(`${BASE_URL}/api/events`);

    if (!res.ok) {
      throw new Error(`Failed to fetch events (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error("fetchEvents error:", error);
    throw error;
  }
}

//    FETCH MY EVENTS
//    GET /api/mine

export async function fetchMyEvents(token) {
  try {
    const res = await fetch(`${BASE_URL}/api/events/mine`, {
      headers: buildHeaders(token),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        data.message ||
        data.error ||
        `Failed to fetch my events (${res.status})`;
      throw new Error(message);
    }

    return data; // array of events
  } catch (error) {
    console.error("fetchMyEvents error:", error);
    throw error;
  }
}

//    CREATE EVENT (Business only)
//    POST /api/events
//    Body: eventData
//    Returns: { ok, status, data } structure for easier screen-side handling

export async function createEvent(eventData, token) {
  try {
    const res = await fetch(`${BASE_URL}/api/events`, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify(eventData),
    });

    const data = await res.json().catch(() => ({}));

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (error) {
    console.error("createEvent error:", error);
    return {
      ok: false,
      status: 0,
      data: { message: error.message || "Network error" },
    };
  }
}

//    DELETE EVENT (Business only)
//    DELETE /api/events/:eventId
//    Returns: true if success

export async function deleteEvent(eventId, token) {
  try {
    const res = await fetch(`${BASE_URL}/api/events/${eventId}`, {
      method: "DELETE",
      headers: buildHeaders(token),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed to delete event (${res.status})`);
    }

    return true;
  } catch (error) {
    console.error("deleteEvent error:", error);
    throw error;
  }
}

//    UPDATE EVENT (Business only)
//    PUT /api/events/:eventId
//    Body: updated event data
//    Returns: updated event object

export async function updateEvent(eventId, eventData, token) {
  try {
    const res = await fetch(`${BASE_URL}/api/events/${eventId}`, {
      method: "PUT",
      headers: buildHeaders(token),
      body: JSON.stringify(eventData),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("updateEvent error response:", data);
      const message =
        data.message || `Failed to update event (status ${res.status})`;
      throw new Error(message);
    }

    return data;
  } catch (error) {
    console.error("updateEvent error:", error);
    throw error;
  }
}

//    FETCH SINGLE EVENT
//    GET /api/events/:eventId
//    Returns: single event object

export async function fetchEventById(eventId) {
  try {
    const res = await fetch(`${BASE_URL}/api/events/${eventId}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch event (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error("fetchEventById error:", error);
    throw error;
  }
}
