import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getNotificationPreferences,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerPushToken,
  unregisterPushToken,
  updateNotificationPreferences,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.get("/preferences", authMiddleware, getNotificationPreferences);
router.patch("/preferences", authMiddleware, updateNotificationPreferences);
router.patch("/read-all", authMiddleware, markAllNotificationsRead);
router.patch("/:id/read", authMiddleware, markNotificationRead);
router.post("/push-token", authMiddleware, registerPushToken);
router.delete("/push-token", authMiddleware, unregisterPushToken);

export default router;
