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

// Helper to build headers conditionally (token optional)
function buildHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

//  FETCH COMMUNITY POSTS
//  GET /api/community?type=highwayconditions | eventbuddy | rideshare
//  Returns: array of posts

export async function fetchCommunityPosts(type, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/community?type=${type}`, {
      method: "GET",
      headers: buildHeaders(token),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Failed to load posts (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error("fetchCommunityPosts error:", error);
    throw error;
  }
}

//    DELETE COMMUNITY POST
//    DELETE /api/community/:postId
//    Returns: true if deletion succeeded

export async function deleteCommunityPost(postId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/community/${postId}`, {
      method: "DELETE",
      headers: buildHeaders(token),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Failed to delete post (${res.status})`);
    }

    return true;
  } catch (error) {
    console.error("deleteCommunityPost error:", error);
    throw error;
  }
}

// CREATE REPLY
// POST /api/community/:postId/replies
//  Body: { body: "text" }
//  Returns: created reply OR updated post depending on backend

export async function createCommunityReply(postId, replyText, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/community/${postId}/replies`, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify({ body: replyText }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Failed to send reply (${res.status})`);
    }

    return await res.json();
  } catch (error) {
    console.error("createCommunityReply error:", error);
    throw error;
  }
}

//
//    TOGGLE LIKE
//    POST /api/community/:postId/likes
//    Returns: updated likes info (backend-defined)
//
export async function toggleCommunityLike(postId, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/community/${postId}/likes`, {
      method: "POST",
      headers: buildHeaders(token),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || `Failed to update like (${res.status})`);
    }

    return data;
  } catch (error) {
    console.error("toggleCommunityLike error:", error);
    throw error;
  }
}
