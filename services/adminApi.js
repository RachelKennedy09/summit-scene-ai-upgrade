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
    if (/^\s*<!doctype|^\s*<html/i.test(text)) {
      return { message: `Unexpected server response (${response.status})` };
    }

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

export async function fetchAdminDashboardStats(token) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/users/admin/dashboard-stats`,
      { headers: buildHeaders(token) }
    );
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          `Failed to load admin dashboard stats (${res.status})`
      );
    }

    return data && typeof data === "object" ? data : {};
  } catch (error) {
    const normalized =
      error?.name === "AbortError"
        ? new Error("Admin dashboard stats timed out. Please try again.")
        : error;

    throw toUserFriendlyError(
      normalized,
      "Dashboard stats are temporarily unavailable."
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

export async function fetchAdminAccounts(token) {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/users/admin/admins`, {
      headers: buildHeaders(token),
    });
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          `Failed to load admin accounts (${res.status})`
      );
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    const normalized =
      error?.name === "AbortError"
        ? new Error("Admin accounts request timed out. Please try again.")
        : error;

    throw toUserFriendlyError(
      normalized,
      "We couldn't load admin accounts right now. Please try again."
    );
  }
}

export async function updateAdminAccount(email, isAdmin, token) {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/users/admin/admins`, {
      method: "PATCH",
      headers: buildHeaders(token),
      body: JSON.stringify({ email, isAdmin }),
    });
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          `Failed to update admin account (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalized =
      error?.name === "AbortError"
        ? new Error("Admin account update timed out. Please try again.")
        : error;

    throw toUserFriendlyError(
      normalized,
      "We couldn't update admin access right now. Please try again."
    );
  }
}
