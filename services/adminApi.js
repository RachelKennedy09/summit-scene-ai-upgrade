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

export async function fetchBusinessRequests(token, status = "pending") {
  try {
    const params = new URLSearchParams();
    params.set("status", status);

    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/users/admin/business-requests?${params.toString()}`,
      { headers: buildHeaders(token) }
    );
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          `Failed to load business requests (${res.status})`
      );
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    const normalized =
      error?.name === "AbortError"
        ? new Error("Business requests timed out. Please try again.")
        : error;

    throw toUserFriendlyError(
      normalized,
      "We couldn't load business requests right now. Please try again."
    );
  }
}

export async function updateBusinessRequest(userId, status, token) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/users/admin/business-requests/${userId}`,
      {
        method: "PATCH",
        headers: buildHeaders(token),
        body: JSON.stringify({ status }),
      }
    );
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          `Failed to update business request (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalized =
      error?.name === "AbortError"
        ? new Error("Business request update timed out. Please try again.")
        : error;

    throw toUserFriendlyError(
      normalized,
      "We couldn't update that business request right now. Please try again."
    );
  }
}
