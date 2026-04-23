// services/communityApi.js
// Centralized helper functions for interacting with the Community API.
// All fetch logic is isolated here so screens stay clean and readable.
//
// Endpoints used:
//   GET    /api/community?type=...         → fetch posts
//   DELETE /api/community/:postId          → delete a post
//   POST   /api/community/:postId/replies  → create a reply
//   POST   /api/community/:postId/likes    → toggle like/unlike

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://summit-scene-backend.onrender.com";
const COMMUNITY_REQUEST_TIMEOUT_MS = 15000;

// Helper to build headers conditionally (token optional)
function buildHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = COMMUNITY_REQUEST_TIMEOUT_MS
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

function normalizeCommunityError(error, fallbackMessage) {
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

//  FETCH COMMUNITY POSTS
//  GET /api/community?type=highwayconditions | eventbuddy | rideshare
//  Returns: array of posts

export async function fetchCommunityPosts(type, token) {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/community?type=${type}`, {
      method: "GET",
      headers: buildHeaders(token),
    });
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(data.message || `Failed to load posts (${res.status})`);
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    const normalizedError = normalizeCommunityError(
      error,
      "Community posts request timed out. Check the backend and try again."
    );
    console.warn("fetchCommunityPosts issue:", normalizedError.message);
    throw normalizedError;
  }
}

//    DELETE COMMUNITY POST
//    DELETE /api/community/:postId
//    Returns: true if deletion succeeded

export async function deleteCommunityPost(postId, token) {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/community/${postId}`, {
      method: "DELETE",
      headers: buildHeaders(token),
    });
    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(data.message || `Failed to delete post (${res.status})`);
    }

    return true;
  } catch (error) {
    const normalizedError = normalizeCommunityError(
      error,
      "Delete post request timed out. Check the backend and try again."
    );
    console.warn("deleteCommunityPost issue:", normalizedError.message);
    throw normalizedError;
  }
}

// CREATE REPLY
// POST /api/community/:postId/replies
//  Body: { body: "text" }
//  Returns: created reply OR updated post depending on backend

export async function createCommunityReply(postId, replyText, token) {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/api/community/${postId}/replies`,
      {
        method: "POST",
        headers: buildHeaders(token),
        body: JSON.stringify({ body: replyText }),
      }
    );

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(data.message || `Failed to send reply (${res.status})`);
    }

    return data;
  } catch (error) {
    const normalizedError = normalizeCommunityError(
      error,
      "Reply request timed out. Check the backend and try again."
    );
    console.warn("createCommunityReply issue:", normalizedError.message);
    throw normalizedError;
  }
}

export async function createCommunityPost(postData, token) {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/community`, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify(postData),
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(data.error || data.message || `Failed to create post (${res.status})`);
    }

    return data;
  } catch (error) {
    const normalizedError = normalizeCommunityError(
      error,
      "Create post request timed out. Check the backend and try again."
    );
    console.warn("createCommunityPost issue:", normalizedError.message);
    throw normalizedError;
  }
}

export async function updateCommunityPost(postId, postData, token) {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/community/${postId}`, {
      method: "PUT",
      headers: buildHeaders(token),
      body: JSON.stringify(postData),
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(data.error || data.message || `Failed to update post (${res.status})`);
    }

    return data;
  } catch (error) {
    const normalizedError = normalizeCommunityError(
      error,
      "Update post request timed out. Check the backend and try again."
    );
    console.warn("updateCommunityPost issue:", normalizedError.message);
    throw normalizedError;
  }
}

export async function toggleCommunityLike(postId, token) {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/community/${postId}/likes`, {
      method: "POST",
      headers: buildHeaders(token),
    });

    const data = await readJsonSafely(res);

    if (!res.ok) {
      throw new Error(data.message || `Failed to update like (${res.status})`);
    }

    return data;
  } catch (error) {
    const normalizedError = normalizeCommunityError(
      error,
      "Like request timed out. Check the backend and try again."
    );
    console.warn("toggleCommunityLike issue:", normalizedError.message);
    throw normalizedError;
  }
}
