import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerPushToken,
  unregisterPushToken,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.patch("/read-all", authMiddleware, markAllNotificationsRead);
router.patch("/:id/read", authMiddleware, markNotificationRead);
router.post("/push-token", authMiddleware, registerPushToken);
router.delete("/push-token", authMiddleware, unregisterPushToken);

export default router;
