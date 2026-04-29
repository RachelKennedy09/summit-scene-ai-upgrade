// services/buddyPostsApi.js
// API helpers for structured buddy posts.

import { toUserFriendlyError } from "../utils/friendlyErrors";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const BUDDY_POST_REQUEST_TIMEOUT_MS = 15000;

function buildHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = BUDDY_POST_REQUEST_TIMEOUT_MS
) {
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

function normalizeBuddyPostError(error, fallbackMessage) {
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

export async function createBuddyPost(postData, token) {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/buddy-posts`, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify(postData),
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to create buddy post (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalizedError = normalizeBuddyPostError(
      error,
      "Create buddy post request timed out. Check the backend and try again."
    );
    console.warn("createBuddyPost issue:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't share your buddy post right now. Please try again."
    );
  }
}

export async function fetchBuddyPosts(filters = {}, token) {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const query = params.toString();
    const url = `${API_BASE_URL}/api/buddy-posts${query ? `?${query}` : ""}`;
    const res = await fetchWithTimeout(url, {
      method: "GET",
      headers: buildHeaders(token),
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to load buddy posts (${res.status})`
      );
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    const normalizedError = normalizeBuddyPostError(
      error,
      "Buddy posts request timed out. Check the backend and try again."
    );
    console.warn("fetchBuddyPosts issue:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't load buddy posts right now. Please try again."
    );
  }
}

export async function toggleBuddyPostInterest(postId, token) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/buddy-posts/${postId}/interested`,
      {
        method: "POST",
        headers: buildHeaders(token),
      }
    );

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to update interest (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalizedError = normalizeBuddyPostError(
      error,
      "Interest request timed out. Check the backend and try again."
    );
    console.warn("toggleBuddyPostInterest issue:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't update your interest right now. Please try again."
    );
  }
}

export async function createBuddyPostReply(postId, text, token) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/buddy-posts/${postId}/replies`,
      {
        method: "POST",
        headers: buildHeaders(token),
        body: JSON.stringify({ text }),
      }
    );

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to add reply (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalizedError = normalizeBuddyPostError(
      error,
      "Reply request timed out. Check the backend and try again."
    );
    console.warn("createBuddyPostReply issue:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't add your reply right now. Please try again."
    );
  }
}

export async function updateBuddyPostReply(postId, replyId, text, token) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/buddy-posts/${postId}/replies/${replyId}`,
      {
        method: "PATCH",
        headers: buildHeaders(token),
        body: JSON.stringify({ text }),
      }
    );

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to update reply (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalizedError = normalizeBuddyPostError(
      error,
      "Update reply request timed out. Check the backend and try again."
    );
    console.warn("updateBuddyPostReply issue:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't update your reply right now. Please try again."
    );
  }
}

export async function deleteBuddyPostReply(postId, replyId, token) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/buddy-posts/${postId}/replies/${replyId}`,
      {
        method: "DELETE",
        headers: buildHeaders(token),
      }
    );

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(
        data.error || data.message || `Failed to delete reply (${res.status})`
      );
    }

    return data;
  } catch (error) {
    const normalizedError = normalizeBuddyPostError(
      error,
      "Delete reply request timed out. Check the backend and try again."
    );
    console.warn("deleteBuddyPostReply issue:", normalizedError.message);
    throw toUserFriendlyError(
      normalizedError,
      "We couldn't delete your reply right now. Please try again."
    );
  }
}
