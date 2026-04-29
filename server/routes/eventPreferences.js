import express from "express";
import {
  getEventPreferenceByEvent,
  getEventPreferences,
  getNotifications,
  updateEventPreference,
} from "../controllers/eventPreferenceController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/", authMiddleware, getEventPreferences);
router.get("/notifications", authMiddleware, getNotifications);
router.get("/:eventId", authMiddleware, getEventPreferenceByEvent);
router.patch("/:eventId", authMiddleware, updateEventPreference);

export default router;
