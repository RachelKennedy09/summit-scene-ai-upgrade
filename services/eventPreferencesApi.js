import { toUserFriendlyError } from "../utils/friendlyErrors";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const REQUEST_TIMEOUT_MS = 15000;

function buildHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
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

function normalizeError(error, fallbackMessage) {
  if (error?.name === "AbortError") return new Error(fallbackMessage);
  return error;
}

export async function fetchEventPreferences(token) {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/event-preferences`, {
      headers: buildHeaders(token),
    });
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to load preferences (${res.status})`
      );
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    const normalized = normalizeError(
      error,
      "Event preferences request timed out. Please try again."
    );
    throw toUserFriendlyError(
      normalized,
      "We couldn't load your saved events right now. Please try again."
    );
  }
}

export async function fetchEventPreference(eventId, token) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/event-preferences/${eventId}`,
      { headers: buildHeaders(token) }
    );
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to load preference (${res.status})`
      );
    }

    return data || null;
  } catch (error) {
    const normalized = normalizeError(
      error,
      "Event preference request timed out. Please try again."
    );
    throw toUserFriendlyError(
      normalized,
      "We couldn't load this event's reminder settings right now."
    );
  }
}

export async function updateEventPreference(eventId, updates, token) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/event-preferences/${eventId}`,
      {
        method: "PATCH",
        headers: buildHeaders(token),
        body: JSON.stringify(updates),
      }
    );
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to update preference (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalized = normalizeError(
      error,
      "Event preference update timed out. Please try again."
    );
    throw toUserFriendlyError(
      normalized,
      "We couldn't update this event setting right now. Please try again."
    );
  }
}

export async function fetchNotifications(token) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/event-preferences/notifications`,
      { headers: buildHeaders(token) }
    );
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to load notifications (${res.status})`
      );
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    const normalized = normalizeError(
      error,
      "Notifications request timed out. Please try again."
    );
    throw toUserFriendlyError(
      normalized,
      "We couldn't load reminders right now. Please try again."
    );
  }
}
