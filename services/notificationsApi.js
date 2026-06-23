import { toUserFriendlyError } from "../utils/friendlyErrors";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const NOTIFICATION_REQUEST_TIMEOUT_MS = 15000;

function buildHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    NOTIFICATION_REQUEST_TIMEOUT_MS
  );

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
  if (error?.name === "AbortError") {
    return new Error(fallbackMessage);
  }

  return error;
}

export async function fetchNotifications(token) {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/notifications`, {
      headers: buildHeaders(token),
    });
    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || "Could not load notifications.");
    }

    return {
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
      unreadCount: Number(data.unreadCount) || 0,
    };
  } catch (error) {
    throw toUserFriendlyError(
      normalizeError(error, "Notifications request timed out."),
      "We couldn't load notifications right now. Please try again."
    );
  }
}

export async function markNotificationRead(notificationId, token) {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: buildHeaders(token),
      }
    );
    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || "Could not update notification.");
    }

    return data;
  } catch (error) {
    throw toUserFriendlyError(
      normalizeError(error, "Notification update timed out."),
      "We couldn't update that notification right now. Please try again."
    );
  }
}

export async function markAllNotificationsRead(token) {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/notifications/read-all`,
      {
        method: "PATCH",
        headers: buildHeaders(token),
      }
    );
    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || "Could not update notifications.");
    }

    return data;
  } catch (error) {
    throw toUserFriendlyError(
      normalizeError(error, "Notification update timed out."),
      "We couldn't update notifications right now. Please try again."
    );
  }
}

export async function registerPushToken({ token: pushToken, platform }, authToken) {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/notifications/push-token`,
      {
        method: "POST",
        headers: buildHeaders(authToken),
        body: JSON.stringify({ token: pushToken, platform }),
      }
    );
    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || "Could not register push token.");
    }

    return data;
  } catch (error) {
    throw toUserFriendlyError(
      normalizeError(error, "Push token registration timed out."),
      "We couldn't register notifications on this device right now."
    );
  }
}

export async function unregisterPushToken({ token: pushToken }, authToken) {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/notifications/push-token`,
      {
        method: "DELETE",
        headers: buildHeaders(authToken),
        body: JSON.stringify({ token: pushToken }),
      }
    );
    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || "Could not unregister push token.");
    }

    return data;
  } catch (error) {
    throw toUserFriendlyError(
      normalizeError(error, "Push token unregister request timed out."),
      "We couldn't unregister notifications on this device right now."
    );
  }
}
