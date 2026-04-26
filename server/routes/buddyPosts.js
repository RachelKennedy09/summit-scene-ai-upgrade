// server/routes/buddyPosts.js
// Authenticated routes for creating and browsing buddy posts.

import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  createBuddyPost,
  getBuddyPostById,
  getBuddyPosts,
} from "../controllers/buddyPostController.js";

const router = express.Router();

router.get("/", authMiddleware, getBuddyPosts);
router.post("/", authMiddleware, createBuddyPost);
router.get("/:id", authMiddleware, getBuddyPostById);

export default router;
