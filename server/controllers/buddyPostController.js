// server/controllers/buddyPostController.js
// API behavior for structured buddy posts.

import mongoose from "mongoose";
import BuddyPost from "../models/BuddyPost.js";
import Event from "../models/Event.js";

const USER_POPULATE_FIELDS =
  "name email role avatarKey town userType languages interests skillLevel socialAccounts bio instagram website";

function buildListFilter(query = {}) {
  const filter = {};
  const { type, town, skillLevel, status, eventId } = query;

  if (type) filter.type = type;
  if (town) filter.town = town;
  if (skillLevel) filter.skillLevel = skillLevel;
  if (status) filter.status = status;
  if (eventId) filter.eventId = eventId;

  return filter;
}

function normalizeCreateBody(body = {}) {
  return {
    type: body.type,
    activityText: typeof body.activityText === "string" ? body.activityText.trim() : body.activityText,
    date: body.date,
    time: typeof body.time === "string" ? body.time.trim() : body.time,
    town: body.town,
    skillLevel: body.skillLevel || undefined,
    groupSizePreference: body.groupSizePreference || "any",
    eventId: body.eventId || undefined,
  };
}

export async function getBuddyPosts(req, res) {
  try {
    const posts = await BuddyPost.find(buildListFilter(req.query))
      .populate("createdBy", USER_POPULATE_FIELDS)
      .populate("eventId", "title date time town category imageUrl")
      .sort({ date: 1, createdAt: -1 });

    return res.json(posts);
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

      const linkedEvent = await Event.findById(payload.eventId).select("_id");
      if (!linkedEvent) {
        return res.status(404).json({ message: "Linked event was not found." });
      }
    }

    const post = await BuddyPost.create({
      ...payload,
      createdBy: userId,
    });

    const populated = await BuddyPost.findById(post._id)
      .populate("createdBy", USER_POPULATE_FIELDS)
      .populate("eventId", "title date time town category imageUrl");

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
    const post = await BuddyPost.findById(req.params.id)
      .populate("createdBy", USER_POPULATE_FIELDS)
      .populate("eventId", "title date time town category imageUrl");

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
