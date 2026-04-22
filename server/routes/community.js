// server/routes/community.js
// Routes for the SummitScene Community Tab
//  - Fetch community posts (highway conditions, ride shares, event buddies)
//  - Create new posts
//  - Update or delete posts (with auth + owner checks handled in controller)
//  - Add replies to posts
//  - Like / unlike posts
//
// All routes in this file require:
//  - A valid JWT (checked by authMiddleware)
//  - req.user populated with { userId, name, role }

import express from "express";
import authMiddleware from "../middleware/auth.js";

import {
  getCommunityPosts,
  createCommunityPost,
  deleteCommunityPost,
  updateCommunityPost,
  addCommunityReply,
  toggleLike,
} from "../controllers/communityController.js";

const router = express.Router();

// -------------------------------------------
// GLOBAL RULE FOR THIS ROUTER
// Every route below requires authentication.
// The authMiddleware validates the token and
// attaches the user info onto req.user
// -------------------------------------------

// -------------------------------------------
// GET /api/community
//   Fetch all community posts.
//   Can filter with ?type=highwayconditions or ?town=Canmore
//   Allows feed-style viewing of posts specific to interests or local towns
// -------------------------------------------
router.get("/", authMiddleware, getCommunityPosts);

// -------------------------------------------
// POST /api/community
//   Create a new community post.
//   Uses req.user.userId as the author.
//   Request body should include fields like:
//     { type, text, town, imageUrl? }
// -------------------------------------------
router.post("/", authMiddleware, createCommunityPost);

// -------------------------------------------
// DELETE /api/community/:id
//   Delete a post (only if the logged-in user is the owner).
//   Prevent users from deleting/editing other people's posts.
//   Ownership check is done inside the controller.
// -------------------------------------------
router.delete("/:id", authMiddleware, deleteCommunityPost);

// -------------------------------------------
// PUT /api/community/:id
//   Update an existing post by ID.
//   Allows users to fix typos, update ride availability, etc.
//   Controller ensures only the owner can edit.
// -------------------------------------------
router.put("/:id", authMiddleware, updateCommunityPost);

// -------------------------------------------
// POST /api/community/:postId/replies
//   Add a reply/comment under a community post.
//   Enables conversational threads (especially for ride shares & event buddies).
// -------------------------------------------
router.post("/:postId/replies", authMiddleware, addCommunityReply);

// -------------------------------------------
// POST /api/community/:id/likes
//   Toggle a like on/off for a post.
//   Acts like Instagram-style likes:
//     - If liked → remove like
//     - If not liked → add like
// -------------------------------------------
router.post("/:id/likes", authMiddleware, toggleLike);

export default router;
