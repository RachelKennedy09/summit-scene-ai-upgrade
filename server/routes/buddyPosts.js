// server/routes/buddyPosts.js
// Authenticated routes for creating and browsing buddy posts.

import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  addBuddyPostReply,
  createBuddyPost,
  deleteBuddyPostReply,
  getBuddyPostById,
  getBuddyPosts,
  toggleBuddyPostInterest,
  updateBuddyPostReply,
} from "../controllers/buddyPostController.js";

const router = express.Router();

router.get("/", authMiddleware, getBuddyPosts);
router.post("/", authMiddleware, createBuddyPost);
router.post("/:id/interested", authMiddleware, toggleBuddyPostInterest);
router.post("/:id/replies", authMiddleware, addBuddyPostReply);
router.patch("/:id/replies/:replyId", authMiddleware, updateBuddyPostReply);
router.delete("/:id/replies/:replyId", authMiddleware, deleteBuddyPostReply);
router.get("/:id", authMiddleware, getBuddyPostById);

export default router;
