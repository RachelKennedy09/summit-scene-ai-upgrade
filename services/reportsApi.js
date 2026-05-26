import { toUserFriendlyError } from "../utils/friendlyErrors";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const REPORT_REQUEST_TIMEOUT_MS = 15000;

function buildHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REPORT_REQUEST_TIMEOUT_MS);

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

export async function submitReport(reportData, token) {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/reports`, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify(reportData),
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to submit report (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalizedError =
      error?.name === "AbortError"
        ? new Error("Report request timed out. Please try again.")
        : error;

    console.warn("submitReport issue:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't submit that report right now. Please try again."
    );
  }
}

export async function fetchReports(token, status = "open") {
  try {
    const params = new URLSearchParams();
    if (status) params.set("status", status);

    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/reports?${params.toString()}`,
      {
        method: "GET",
        headers: buildHeaders(token),
      }
    );

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to load reports (${res.status})`
      );
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    const normalizedError =
      error?.name === "AbortError"
        ? new Error("Reports request timed out. Please try again.")
        : error;

    throw toUserFriendlyError(
      normalizedError,
      "We couldn't load reports right now. Please try again."
    );
  }
}

export async function updateReport(reportId, updates, token) {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/reports/${reportId}`, {
      method: "PATCH",
      headers: buildHeaders(token),
      body: JSON.stringify(updates),
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to update report (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalizedError =
      error?.name === "AbortError"
        ? new Error("Update report request timed out. Please try again.")
        : error;

    throw toUserFriendlyError(
      normalizedError,
      "We couldn't update that report right now. Please try again."
    );
  }
}

export async function applyReportAction(reportId, action, token) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/reports/${reportId}/actions`,
      {
        method: "POST",
        headers: buildHeaders(token),
        body: JSON.stringify({ action }),
      }
    );

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error ||
          data.message ||
          `Failed to apply moderation action (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalizedError =
      error?.name === "AbortError"
        ? new Error("Moderation action timed out. Please try again.")
        : error;

    throw toUserFriendlyError(
      normalizedError,
      "We couldn't apply that moderation action right now. Please try again."
    );
  }
}
