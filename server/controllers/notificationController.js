import AppNotification from "../models/AppNotification.js";
import PushToken from "../models/PushToken.js";

const NOTIFICATION_POPULATE_FIELDS =
  "name email role businessVerificationStatus avatarKey profileImageUrl";

function getUserId(req) {
  return req.user?.userId;
}

export async function getNotifications(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Not authorized." });

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const notifications = await AppNotification.find({ recipient: userId })
      .populate("actor", NOTIFICATION_POPULATE_FIELDS)
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await AppNotification.countDocuments({
      recipient: userId,
      readAt: null,
    });

    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Error in GET /api/notifications:", error);
    return res.status(500).json({
      message: "Failed to load notifications.",
      error: error.message,
    });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Not authorized." });

    const notification = await AppNotification.findOneAndUpdate(
      { _id: req.params.id, recipient: userId },
      { $set: { readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    return res.json(notification);
  } catch (error) {
    console.error("Error in PATCH /api/notifications/:id/read:", error);
    return res.status(500).json({
      message: "Failed to update notification.",
      error: error.message,
    });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Not authorized." });

    await AppNotification.updateMany(
      { recipient: userId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    return res.json({ message: "Notifications marked read." });
  } catch (error) {
    console.error("Error in PATCH /api/notifications/read-all:", error);
    return res.status(500).json({
      message: "Failed to update notifications.",
      error: error.message,
    });
  }
}

export async function registerPushToken(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Not authorized." });

    const token =
      typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const platform =
      typeof req.body?.platform === "string" ? req.body.platform : "unknown";

    if (!token) {
      return res.status(400).json({ message: "Push token is required." });
    }

    const pushToken = await PushToken.findOneAndUpdate(
      { token },
      {
        $set: {
          user: userId,
          platform: ["ios", "android", "web"].includes(platform)
            ? platform
            : "unknown",
          enabled: true,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ registered: true, pushTokenId: pushToken._id });
  } catch (error) {
    console.error("Error in POST /api/notifications/push-token:", error);
    return res.status(500).json({
      message: "Failed to register push token.",
      error: error.message,
    });
  }
}

export async function unregisterPushToken(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Not authorized." });

    const token =
      typeof req.body?.token === "string" ? req.body.token.trim() : "";

    if (!token) {
      return res.status(400).json({ message: "Push token is required." });
    }

    await PushToken.updateOne(
      { user: userId, token },
      { $set: { enabled: false, lastSeenAt: new Date() } }
    );

    return res.json({ unregistered: true });
  } catch (error) {
    console.error("Error in DELETE /api/notifications/push-token:", error);
    return res.status(500).json({
      message: "Failed to unregister push token.",
      error: error.message,
    });
  }
}
