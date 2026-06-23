import AppNotification from "../models/AppNotification.js";
import PushToken from "../models/PushToken.js";
import User from "../models/User.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const PUSH_ENABLED =
  process.env.NODE_ENV !== "test" &&
  process.env.PUSH_NOTIFICATIONS_ENABLED !== "false";

function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id?.toString() || value.id?.toString() || value.toString?.() || "";
}

function isExpoPushToken(value) {
  return /^ExponentPushToken\[[^\]]+\]$/.test(String(value || ""));
}

export function getDisplayName(user) {
  return user?.name || user?.email || "Someone";
}

async function sendExpoPushNotifications({ recipientId, title, message, data }) {
  if (!PUSH_ENABLED || typeof fetch !== "function") return;

  const tokens = await PushToken.find({
    user: recipientId,
    enabled: true,
  }).select("token");

  const messages = tokens
    .map((item) => item.token)
    .filter(isExpoPushToken)
    .map((to) => ({
      to,
      sound: "default",
      title,
      body: message,
      data,
    }));

  if (!messages.length) return;

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.warn("Expo push send failed:", response.status);
    }
  } catch (error) {
    console.warn("Expo push send issue:", error.message);
  }
}

export async function createAppNotification({
  recipientId,
  actorId,
  type,
  title,
  message,
  buddyPostId,
  communityPostId,
  replyId,
  data = {},
  sendPush = false,
}) {
  const recipient = getId(recipientId);
  const actor = getId(actorId);

  if (!recipient || (actor && recipient === actor)) {
    return null;
  }

  const notification = await AppNotification.create({
    recipient,
    actor: actor || undefined,
    type,
    title,
    message,
    buddyPost: buddyPostId || undefined,
    communityPost: communityPostId || undefined,
    replyId: replyId || undefined,
    data,
  });

  if (sendPush) {
    sendExpoPushNotifications({
      recipientId: recipient,
      title,
      message,
      data: {
        notificationId: notification._id.toString(),
        type,
        buddyPostId: buddyPostId?.toString?.() || buddyPostId || "",
        communityPostId: communityPostId?.toString?.() || communityPostId || "",
        replyId: replyId || "",
        ...data,
      },
    }).catch((error) => {
      console.warn("Push notification delivery issue:", error.message);
    });
  }

  return notification;
}

export async function getActorName(actorId) {
  if (!actorId) return "Someone";
  const actor = await User.findById(actorId).select("name email");
  return getDisplayName(actor);
}
