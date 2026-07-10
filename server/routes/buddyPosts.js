// server/routes/buddyPosts.js
// Public browsing plus authenticated write routes for buddy posts.

import express from "express";
import authMiddleware from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import {
  addBuddyPostReply,
  addBuddyPostReplyResponse,
  createBuddyPost,
  deleteBuddyPost,
  deleteBuddyPostReply,
  getBuddyPostById,
  getBuddyPosts,
  toggleBuddyPostInterest,
  toggleBuddyPostReplyLike,
  updateBuddyPost,
  updateBuddyPostReply,
} from "../controllers/buddyPostController.js";

const router = express.Router();

router.get("/", optionalAuth, getBuddyPosts);
router.post("/", authMiddleware, createBuddyPost);
router.patch("/:id", authMiddleware, updateBuddyPost);
router.delete("/:id", authMiddleware, deleteBuddyPost);
router.post("/:id/interested", authMiddleware, toggleBuddyPostInterest);
router.post("/:id/replies", authMiddleware, addBuddyPostReply);
router.post("/:id/replies/:replyId/likes", authMiddleware, toggleBuddyPostReplyLike);
router.post("/:id/replies/:replyId/replies", authMiddleware, addBuddyPostReplyResponse);
router.patch("/:id/replies/:replyId", authMiddleware, updateBuddyPostReply);
router.delete("/:id/replies/:replyId", authMiddleware, deleteBuddyPostReply);
router.get("/:id", optionalAuth, getBuddyPostById);

export default router;
