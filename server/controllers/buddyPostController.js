// server/controllers/buddyPostController.js
// API behavior for structured buddy posts.

import mongoose from "mongoose";
import BuddyPost, {
  BUDDY_COMMUNITY_TYPES,
  BUDDY_RECURRENCE_FREQUENCIES,
  BUDDY_SCHEDULE_TYPES,
  WEEKDAYS,
} from "../models/BuddyPost.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { isEventUpcoming } from "../../utils/eventSchedule.js";

const USER_POPULATE_FIELDS =
  "name email role businessVerificationStatus avatarKey profileImageUrl town userType languages originallyFrom interests skillLevel socialAccounts bio instagram website createdAt";
const DATE_EXPIRING_COMMUNITY_TYPES = new Set(["local-plan", "notice", "update"]);

function buildListFilter(query = {}) {
  const filter = {};
  const { type, category, communityType, town, skillLevel, status, eventId, date } = query;

  if (type) filter.type = type;
  if (category) filter.category = category;
  if (communityType) filter.communityType = communityType;
  if (town) filter.town = town;
  if (skillLevel) filter.skillLevel = skillLevel;
  filter.status = status || "open";
  if (eventId) filter.eventId = eventId;
  if (date) filter.date = date;

  return filter;
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function shouldIncludeExpiredPosts(value) {
  return value === "true" || value === true;
}

function isFreshBuddyPost(post, today = getTodayDateString()) {
  if (!post || post.status === "closed") return false;

  if (post.scheduleType === "recurring") {
    const untilDate = post.recurrence?.untilDate;
    return !untilDate || untilDate >= today;
  }

  if (DATE_EXPIRING_COMMUNITY_TYPES.has(post.communityType)) {
    return !post.date || post.date >= today;
  }

  return true;
}

function filterByLanguage(posts, language) {
  if (!language || typeof language !== "string") return posts;

  const normalizedLanguage = language.trim().toLowerCase();
  if (!normalizedLanguage) return posts;

  return posts.filter((post) => {
    const languages = Array.isArray(post.createdBy?.languages)
      ? post.createdBy.languages
      : [];

    return languages.some((item) =>
      String(item || "").toLowerCase().includes(normalizedLanguage)
    );
  });
}

function getUserId(value) {
  if (!value) return "";
  return typeof value === "string"
    ? value
    : value._id?.toString() || value.id?.toString() || "";
}

async function getViewerBlockContext(req) {
  const viewerId = req.user?.userId;
  if (!viewerId) {
    return {
      viewerId: "",
      blockedIds: new Set(),
      blockedByIds: new Set(),
    };
  }

  const [viewer, usersBlockingViewer] = await Promise.all([
    User.findById(viewerId).select("blockedUsers"),
    User.find({ blockedUsers: viewerId }).select("_id"),
  ]);

  return {
    viewerId: viewerId.toString(),
    blockedIds: new Set(
      (viewer?.blockedUsers || []).map((id) => id.toString())
    ),
    blockedByIds: new Set(
      usersBlockingViewer.map((user) => user._id.toString())
    ),
  };
}

function isBlockedUser(userId, blockContext) {
  if (!userId) return false;
  return (
    blockContext.blockedIds.has(userId) ||
    blockContext.blockedByIds.has(userId)
  );
}

function filterBlockedUsers(posts, blockContext) {
  return posts
    .map((post) => (typeof post.toObject === "function" ? post.toObject() : post))
    .filter((post) => !isBlockedUser(getUserId(post.createdBy), blockContext))
    .map((post) => ({
      ...post,
      interestedUsers: Array.isArray(post.interestedUsers)
        ? post.interestedUsers.filter(
            (user) => !isBlockedUser(getUserId(user), blockContext)
          )
        : [],
      replies: Array.isArray(post.replies)
        ? post.replies.filter(
            (reply) =>
              !isBlockedUser(getUserId(reply.createdBy), blockContext)
          )
        : [],
    }));
}

function normalizeEnum(value, allowedValues) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return allowedValues.includes(trimmed) ? trimmed : undefined;
}

function normalizeDateString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

function normalizeRecurrence(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const frequency = normalizeEnum(
    value.frequency,
    BUDDY_RECURRENCE_FREQUENCIES
  );
  const weekday = normalizeEnum(value.weekday, WEEKDAYS);
  const untilDate = normalizeDateString(value.untilDate);

  const recurrence = {};
  if (frequency) recurrence.frequency = frequency;
  if (weekday) recurrence.weekday = weekday;
  if (untilDate) recurrence.untilDate = untilDate;

  return Object.keys(recurrence).length ? recurrence : undefined;
}

function normalizeCreateBody(body = {}) {
  const scheduleType = normalizeEnum(body.scheduleType, BUDDY_SCHEDULE_TYPES) || "single";

  return {
    type: body.type,
    activityText: typeof body.activityText === "string" ? body.activityText.trim() : body.activityText,
    category: typeof body.category === "string" ? body.category.trim() : body.category,
    communityType:
      normalizeEnum(body.communityType, BUDDY_COMMUNITY_TYPES) || "local-plan",
    date: body.date,
    time: typeof body.time === "string" ? body.time.trim() : body.time,
    town: body.town,
    skillLevel: body.skillLevel || undefined,
    groupSizePreference: body.groupSizePreference || "any",
    scheduleType,
    recurrence:
      scheduleType === "recurring" ? normalizeRecurrence(body.recurrence) : undefined,
    eventId: body.eventId || undefined,
  };
}

function populateBuddyPost(query) {
  return query
    .populate("createdBy", USER_POPULATE_FIELDS)
    .populate("interestedUsers", USER_POPULATE_FIELDS)
    .populate("replies.createdBy", USER_POPULATE_FIELDS)
    .populate("eventId", "title date time town category imageUrl");
}

export async function getBuddyPosts(req, res) {
  try {
    const blockContext = await getViewerBlockContext(req);
    const posts = await populateBuddyPost(
      BuddyPost.find(buildListFilter(req.query))
    ).sort({ date: 1, createdAt: -1 });

    const freshPosts = shouldIncludeExpiredPosts(req.query.includeExpired)
      ? posts
      : posts.filter((post) => isFreshBuddyPost(post));

    const visiblePosts = filterBlockedUsers(freshPosts, blockContext);

    return res.json(filterByLanguage(visiblePosts, req.query.language));
  } catch (error) {
    console.error("Error in GET /api/buddy-posts:", error);
    return res.status(500).json({
      message: "Failed to load buddy posts.",
      error: error.message,
    });
  }
}

export async function createBuddyPost(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const payload = normalizeCreateBody(req.body);
    const required = ["type", "activityText", "date", "town"];
    const missing = required.filter((field) => !payload[field]);

    if (missing.length) {
      return res.status(400).json({
        message: "Type, activity text, date, and town are required.",
        missing,
      });
    }

    if (payload.eventId) {
      if (!mongoose.Types.ObjectId.isValid(payload.eventId)) {
        return res.status(400).json({ message: "Invalid eventId." });
      }

      const linkedEvent = await Event.findById(payload.eventId).select(
        "_id title date time endTime scheduleType recurrence"
      );
      if (!linkedEvent) {
        return res.status(404).json({ message: "Linked event was not found." });
      }
      if (!isEventUpcoming(linkedEvent)) {
        return res.status(400).json({
          message: "This event has passed, so event buddy posts are closed.",
        });
      }
    }

    if (payload.scheduleType === "recurring") {
      if (!payload.recurrence?.frequency || !payload.recurrence?.weekday) {
        return res.status(400).json({
          message:
            "Recurring buddy posts require a frequency and weekday.",
        });
      }
    }

    const post = await BuddyPost.create({
      ...payload,
      createdBy: userId,
    });

    const populated = await populateBuddyPost(BuddyPost.findById(post._id));

    return res.status(201).json(populated);
  } catch (error) {
    console.error("Error in POST /api/buddy-posts:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Buddy post validation failed.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create buddy post.",
      error: error.message,
    });
  }
}

export async function getBuddyPostById(req, res) {
  try {
    const post = await populateBuddyPost(BuddyPost.findById(req.params.id));

    if (!post) {
      return res.status(404).json({ message: "Buddy post not found." });
    }

    return res.json(post);
  } catch (error) {
    console.error("Error in GET /api/buddy-posts/:id:", error);
    return res.status(500).json({
      message: "Failed to load buddy post.",
      error: error.message,
    });
  }
}

export async function toggleBuddyPostInterest(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const post = await BuddyPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Buddy post not found." });
    }

    const alreadyInterested = post.interestedUsers.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyInterested) {
      post.interestedUsers = post.interestedUsers.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      post.interestedUsers.push(userId);
    }

    await post.save();

    const populated = await populateBuddyPost(BuddyPost.findById(post._id));
    return res.json(populated);
  } catch (error) {
    console.error("Error in POST /api/buddy-posts/:id/interested:", error);
    return res.status(500).json({
      message: "Failed to update interest.",
      error: error.message,
    });
  }
}

export async function addBuddyPostReply(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ message: "Reply text is required." });
    }

    const post = await BuddyPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Buddy post not found." });
    }

    post.replies.push({
      text,
      createdBy: userId,
    });

    await post.save();

    const populated = await populateBuddyPost(BuddyPost.findById(post._id));
    return res.status(201).json(populated);
  } catch (error) {
    console.error("Error in POST /api/buddy-posts/:id/replies:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Buddy reply validation failed.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to add reply.",
      error: error.message,
    });
  }
}

export async function updateBuddyPostReply(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ message: "Reply text is required." });
    }

    const post = await BuddyPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Buddy post not found." });
    }

    const reply = post.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found." });
    }

    if (reply.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You can only edit your own replies." });
    }

    reply.text = text;
    reply.updatedAt = new Date();

    await post.save();

    const populated = await populateBuddyPost(BuddyPost.findById(post._id));
    return res.json(populated);
  } catch (error) {
    console.error("Error in PATCH /api/buddy-posts/:id/replies/:replyId:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Buddy reply validation failed.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to update reply.",
      error: error.message,
    });
  }
}

export async function deleteBuddyPostReply(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const post = await BuddyPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Buddy post not found." });
    }

    const reply = post.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found." });
    }

    if (reply.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You can only delete your own replies." });
    }

    reply.deleteOne();
    await post.save();

    const populated = await populateBuddyPost(BuddyPost.findById(post._id));
    return res.json(populated);
  } catch (error) {
    console.error("Error in DELETE /api/buddy-posts/:id/replies/:replyId:", error);
    return res.status(500).json({
      message: "Failed to delete reply.",
      error: error.message,
    });
  }
}

