import { toUserFriendlyError } from "../utils/friendlyErrors";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const REQUEST_TIMEOUT_MS = 15000;
const IMPORT_RUN_TIMEOUT_MS = 90000;

function buildHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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

export async function fetchImportCandidates(token, status = "pending") {
  try {
    const params = new URLSearchParams();
    params.set("status", status);
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/event-import/candidates?${params.toString()}`,
      { headers: buildHeaders(token) }
    );
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(data.message || `Failed to load import candidates (${res.status})`);
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    const normalized =
      error?.name === "AbortError"
        ? new Error("Import candidates timed out. Please try again.")
        : error;
    throw toUserFriendlyError(
      normalized,
      "We couldn't load event import candidates right now."
    );
  }
}

export async function approveImportCandidate(candidateId, token, event = {}) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/event-import/candidates/${candidateId}/approve`,
    {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify({ event }),
    }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw toUserFriendlyError(
      new Error(data.message || `Failed to approve candidate (${res.status})`),
      "We couldn't approve that event right now."
    );
  }

  return data;
}

export async function updateImportCandidate(candidateId, updates, token) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/event-import/candidates/${candidateId}`,
    {
      method: "PATCH",
      headers: buildHeaders(token),
      body: JSON.stringify(updates || {}),
    }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw toUserFriendlyError(
      new Error(data.message || `Failed to update candidate (${res.status})`),
      "We couldn't save that imported event right now."
    );
  }

  return data;
}

export async function rejectImportCandidate(candidateId, token, importNotes = "") {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/event-import/candidates/${candidateId}/reject`,
    {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify({ importNotes }),
    }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw toUserFriendlyError(
      new Error(data.message || `Failed to reject candidate (${res.status})`),
      "We couldn't reject that event right now."
    );
  }

  return data;
}

export async function approveHighConfidenceImportCandidates(token) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/event-import/candidates/approve-high-confidence`,
    {
      method: "POST",
      headers: buildHeaders(token),
    }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw toUserFriendlyError(
      new Error(data.message || `Failed to approve high confidence events (${res.status})`),
      "We couldn't approve high confidence events right now."
    );
  }

  return data;
}

export async function cleanupStaleImportCandidates(token) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/event-import/candidates/cleanup-stale`,
    {
      method: "POST",
      headers: buildHeaders(token),
    }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw toUserFriendlyError(
      new Error(data.message || `Failed to clean stale imports (${res.status})`),
      "We couldn't clean stale imported events right now."
    );
  }

  return data;
}

export async function runEventImporter(token) {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/event-import/run`, {
    method: "POST",
    headers: buildHeaders(token),
  }, IMPORT_RUN_TIMEOUT_MS);
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw toUserFriendlyError(
      new Error(data.message || `Failed to run event importer (${res.status})`),
      "We couldn't run the event importer right now."
    );
  }

  return data;
}

export async function seedStarterEventSources(token) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/event-import/sources/seed-starter`,
    {
      method: "POST",
      headers: buildHeaders(token),
    }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw toUserFriendlyError(
      new Error(data.message || `Failed to seed event sources (${res.status})`),
      "We couldn't add the starter event sources right now."
    );
  }

  return data;
}

export async function fetchEventSources(token) {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/event-import/sources`, {
    headers: buildHeaders(token),
  });
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw toUserFriendlyError(
      new Error(data.message || `Failed to load event sources (${res.status})`),
      "We couldn't load event sources right now."
    );
  }

  return Array.isArray(data) ? data : [];
}

export async function createEventSource(source, token) {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/event-import/sources`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(source || {}),
  });
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw toUserFriendlyError(
      new Error(data.message || `Failed to create event source (${res.status})`),
      "We couldn't create that event source right now."
    );
  }

  return data;
}

export async function updateEventSource(sourceId, updates, token) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/event-import/sources/${sourceId}`,
    {
      method: "PATCH",
      headers: buildHeaders(token),
      body: JSON.stringify(updates || {}),
    }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw toUserFriendlyError(
      new Error(data.message || `Failed to update event source (${res.status})`),
      "We couldn't update that event source right now."
    );
  }

  return data;
}

export async function deleteEventSource(sourceId, token) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/event-import/sources/${sourceId}`,
    {
      method: "DELETE",
      headers: buildHeaders(token),
    }
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw toUserFriendlyError(
      new Error(data.message || `Failed to delete event source (${res.status})`),
      "We couldn't delete that event source right now."
    );
  }

  return data;
}

export async function retryEventSource(sourceId, token) {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/event-import/sources/${sourceId}/retry`,
    {
      method: "POST",
      headers: buildHeaders(token),
    },
    IMPORT_RUN_TIMEOUT_MS
  );
  const data = await readJsonSafely(res);

  if (!res.ok) {
    throw toUserFriendlyError(
      new Error(data.message || `Failed to retry event source (${res.status})`),
      "We couldn't retry that event source right now."
    );
  }

  return data;
}
