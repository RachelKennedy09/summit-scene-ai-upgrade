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
import {
  COMMUNITY_CATEGORY_TAGS,
  COMMUNITY_CATEGORY_GROUPS,
  EVENT_CATEGORY_GROUPS,
  VIBE_TAGS,
  getMainCategoryForTag,
} from "../../constants/eventCategories.js";
import { findContentModerationIssue } from "../utils/contentModeration.js";
import { isAdminEmail } from "../utils/adminAccess.js";
import {
  createAppNotification,
  getActorName,
} from "../services/notificationService.js";

const USER_POPULATE_FIELDS =
  "name email role businessVerificationStatus avatarKey profileImageUrl town towns userType languages originallyFrom interests businessVibeTags skillLevel socialAccounts bio instagram facebook website googleBusinessUrl phone createdAt";
const DATE_EXPIRING_COMMUNITY_TYPES = new Set(["local-plan", "notice", "update"]);
const MAX_BUDDY_POST_LIST_LIMIT = 50;
const COMMUNITY_TYPE_DEFAULTS = {
  "new-in-town": {
    type: "general",
    category: undefined,
    groupSizePreference: "any",
    scheduleType: "single",
  },
  notice: {
    type: "notice",
    groupSizePreference: "any",
    scheduleType: "single",
  },
  jobs: {
    type: "job",
    category: undefined,
    groupSizePreference: "any",
    scheduleType: "single",
  },
  update: {
    type: "general",
    category: undefined,
    groupSizePreference: "any",
    scheduleType: "single",
  },
};

function parsePositiveInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildListFilter(query = {}) {
  const filter = {};
  const { type, category, communityType, town, skillLevel, status, eventId, date, search } = query;

  if (type) filter.type = type;
  if (category) {
    const categoryOptions = getBuddyCategoryFilterOptions(category);
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { category: { $in: categoryOptions } },
          { categories: { $in: categoryOptions } },
          { categoryTags: { $in: categoryOptions } },
        ],
      },
    ];
  }
  if (communityType) filter.communityType = communityType;
  if (town) filter.town = town;
  if (skillLevel) filter.skillLevel = skillLevel;
  filter.status = status || "open";
  if (eventId) filter.eventId = eventId;
  if (date) filter.date = date;
  const searchTerms = buildSearchTerms(search);
  if (searchTerms.length) {
    const searchRegexes = searchTerms.map((term) => new RegExp(escapeRegex(term), "i"));
    filter.$or = [
      { activityText: { $in: searchRegexes } },
      { category: { $in: searchRegexes } },
      { categories: { $in: searchRegexes } },
      { categoryTags: { $in: searchRegexes } },
      { vibeTags: { $in: searchRegexes } },
      { type: { $in: searchRegexes } },
      { communityType: { $in: searchRegexes } },
      { town: { $in: searchRegexes } },
      { businessName: { $in: searchRegexes } },
      { locationName: { $in: searchRegexes } },
      { websiteUrl: { $in: searchRegexes } },
    ];
  }

  return filter;
}
function getBuddyCategoryFilterOptions(category) {
  const normalized = typeof category === "string" ? category.trim() : "";
  if (!normalized) return [];

  const group = [...EVENT_CATEGORY_GROUPS, ...COMMUNITY_CATEGORY_GROUPS].find(
    (item) => item.title === normalized
  );
  if (group) return [group.title, ...group.options];

  const mainCategory = getMainCategoryForTag(normalized);
  return mainCategory ? [normalized, mainCategory] : [normalized];
}
function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSearchTerms(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return [];

  const terms = [normalized];
  const lower = normalized.toLowerCase();
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "at",
    "for",
    "in",
    "of",
    "or",
    "the",
    "to",
    "with",
  ]);

  normalized
    .split(/\s+/)
    .map((term) => term.replace(/^[^\w$]+|[^\w$]+$/g, ""))
    .filter((term) => term.length >= 2 && !stopWords.has(term.toLowerCase()))
    .forEach((term) => terms.push(term));

  if (lower.includes("book club") || lower.includes("bookclub")) {
    terms.push("Book Club", "bookclub", "Local Clubs");
  }

  return [...new Set(terms)];
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDateString(dateString, days) {
  const [year, month, day] = String(dateString || "").split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function canUseSummitSceneImportFlag(user, tokenUser) {
  return Boolean(
    user?.isAdmin || isAdminEmail(user?.email) || isAdminEmail(tokenUser?.email)
  );
}

function isPostOwner(post, userId) {
  if (!post?.createdBy || !userId) return false;
  const creatorId = getUserId(post.createdBy) || post.createdBy.toString();
  return creatorId.toString() === userId.toString();
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

  if (post.communityType === "jobs") {
    const expiryDate = post.expiresAt || post.date;
    return !expiryDate || expiryDate >= today;
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
        ? post.replies
            .filter(
              (reply) =>
                !isBlockedUser(getUserId(reply.createdBy), blockContext)
            )
            .map((reply) => ({
              ...reply,
              likes: Array.isArray(reply.likes)
                ? reply.likes.filter(
                    (user) => !isBlockedUser(getUserId(user), blockContext)
                  )
                : [],
              replies: Array.isArray(reply.replies)
                ? reply.replies
                    .filter(
                      (childReply) =>
                        !isBlockedUser(getUserId(childReply.createdBy), blockContext)
                    )
                    .map((childReply) => ({
                      ...childReply,
                      likes: Array.isArray(childReply.likes)
                        ? childReply.likes.filter(
                            (user) =>
                              !isBlockedUser(getUserId(user), blockContext)
                          )
                        : [],
                    }))
                : [],
            }))
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

function normalizeBuddyCategories({ category, categories, categoryRequired = false } = {}) {
  const rawCategories = Array.isArray(categories) ? categories : [category];
  const normalizedCategories = [
    ...new Set(
      rawCategories
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .map((item) => getMainCategoryForTag(item) || item)
        .filter(Boolean)
    ),
  ];

  if (categoryRequired && !normalizedCategories.length) {
    throw new Error("Please choose at least one category.");
  }

  return normalizedCategories;
}

function normalizeCategoryTags({ categoryTags, category, categories } = {}) {
  const rawCategories = Array.isArray(categories) ? categories : [category];
  const legacyDetailTags = rawCategories
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => COMMUNITY_CATEGORY_TAGS.includes(item));
  const rawTags = Array.isArray(categoryTags) ? categoryTags : [];
  const normalizedTags = [
    ...new Set(
      [...legacyDetailTags, ...rawTags]
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    ),
  ];

  const invalidTag = normalizedTags.find(
    (item) => !COMMUNITY_CATEGORY_TAGS.includes(item)
  );
  if (invalidTag) {
    throw new Error(`"${invalidTag}" is not a valid category tag.`);
  }

  return normalizedTags;
}

function normalizeVibeTags(value) {
  if (!Array.isArray(value)) return [];

  const normalizedTags = [
    ...new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    ),
  ];

  const invalidTag = normalizedTags.find((item) => !VIBE_TAGS.includes(item));
  if (invalidTag) {
    throw new Error(`"${invalidTag}" is not a valid vibe tag.`);
  }

  return normalizedTags;
}

function normalizeCreateBody(body = {}) {
  const scheduleType = normalizeEnum(body.scheduleType, BUDDY_SCHEDULE_TYPES) || "single";
  const communityType =
    normalizeEnum(body.communityType, BUDDY_COMMUNITY_TYPES) || "local-plan";
  const defaults = COMMUNITY_TYPE_DEFAULTS[communityType] || {};
  const rawCategories =
    "category" in defaults
      ? []
      : normalizeBuddyCategories({
          category: body.category,
          categories: body.categories,
          categoryRequired: communityType === "local-plan",
        });

  return {
    type: defaults.type || body.type,
    activityText: typeof body.activityText === "string" ? body.activityText.trim() : body.activityText,
    imageUrl:
      typeof body.imageUrl === "string" && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : undefined,
    businessName:
      typeof body.businessName === "string" && body.businessName.trim()
        ? body.businessName.trim()
        : undefined,
    locationName:
      typeof body.locationName === "string" && body.locationName.trim()
        ? body.locationName.trim()
        : undefined,
    websiteUrl:
      typeof body.websiteUrl === "string" && body.websiteUrl.trim()
        ? body.websiteUrl.trim()
        : undefined,
    applyByDate: isDateString(body.applyByDate) ? body.applyByDate : undefined,
    expiresAt: isDateString(body.expiresAt) ? body.expiresAt : undefined,
    importedBySummitScene: Boolean(body.importedBySummitScene),
    category: "category" in defaults ? defaults.category : rawCategories[0],
    categories: "category" in defaults ? undefined : rawCategories,
    categoryTags:
      "category" in defaults
        ? undefined
        : normalizeCategoryTags({
            categoryTags: body.categoryTags,
            category: body.category,
            categories: body.categories,
          }),
    vibeTags: normalizeVibeTags(body.vibeTags),
    communityType,
    date: body.date,
    time: typeof body.time === "string" ? body.time.trim() : body.time,
    town: body.town,
    skillLevel: body.skillLevel || undefined,
    groupSizePreference: defaults.groupSizePreference || body.groupSizePreference || "any",
    scheduleType: defaults.scheduleType || scheduleType,
    recurrence:
      (defaults.scheduleType || scheduleType) === "recurring"
        ? normalizeRecurrence(body.recurrence)
        : undefined,
    eventId: body.eventId || undefined,
  };
}

function populateBuddyPost(query) {
  return query
    .populate("createdBy", USER_POPULATE_FIELDS)
    .populate("interestedUsers", USER_POPULATE_FIELDS)
    .populate("replies.createdBy", USER_POPULATE_FIELDS)
    .populate("replies.likes", USER_POPULATE_FIELDS)
    .populate("replies.replies.createdBy", USER_POPULATE_FIELDS)
    .populate("replies.replies.likes", USER_POPULATE_FIELDS)
    .populate("eventId", "title date time town category categories categoryTags vibeTags imageUrl");
}

async function validateBuddyPostPayload(payload) {
  const required = ["type", "activityText", "date", "town"];
  const missing = required.filter((field) => !payload[field]);

  if (missing.length) {
    return {
      status: 400,
      body: {
        message: "Type, activity text, date, and town are required.",
        missing,
      },
    };
  }

  if (payload.communityType === "jobs") {
    const today = getTodayDateString();
    const maxExpiryDate = addDaysToDateString(today, 31);
    const expiryDate = payload.expiresAt || payload.date;

    if (expiryDate > maxExpiryDate) {
      return {
        status: 400,
        body: {
          message: "Job and volunteer ads can stay open for up to 1 month.",
        },
      };
    }

    if (payload.applyByDate && payload.applyByDate > expiryDate) {
      return {
        status: 400,
        body: {
          message: "Apply-by date must be on or before the post expiry date.",
        },
      };
    }

    payload.expiresAt = expiryDate;
  }

  const moderationIssue = findContentModerationIssue({
    activityText: payload.activityText,
  });
  if (moderationIssue) {
    return {
      status: 400,
      body: { message: moderationIssue.message },
    };
  }

  if (payload.eventId) {
    if (!mongoose.Types.ObjectId.isValid(payload.eventId)) {
      return { status: 400, body: { message: "Invalid eventId." } };
    }

    const linkedEvent = await Event.findById(payload.eventId).select(
      "_id title date time endTime scheduleType recurrence"
    );
    if (!linkedEvent) {
      return { status: 404, body: { message: "Linked event was not found." } };
    }
    if (!isEventUpcoming(linkedEvent)) {
      return {
        status: 400,
        body: {
          message: "This event has passed, so event buddy posts are closed.",
        },
      };
    }
  }

  if (payload.scheduleType === "recurring") {
    if (!payload.recurrence?.frequency || !payload.recurrence?.weekday) {
      return {
        status: 400,
        body: {
          message: "Recurring buddy posts require a frequency and weekday.",
        },
      };
    }
  }

  return null;
}

export async function getBuddyPosts(req, res) {
  try {
    const blockContext = await getViewerBlockContext(req);
    const requestedLimit = Math.min(
      parsePositiveInt(req.query?.limit, 0),
      MAX_BUDDY_POST_LIST_LIMIT
    );
    let query = populateBuddyPost(
      BuddyPost.find(buildListFilter(req.query))
    ).sort({ date: 1, createdAt: -1 });

    if (requestedLimit) {
      query = query.limit(requestedLimit);
    }

    const posts = await query;

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

    if (payload.importedBySummitScene) {
      const creator = await User.findById(userId).select("email isAdmin");
      payload.importedBySummitScene =
        payload.communityType === "jobs" &&
        canUseSummitSceneImportFlag(creator, req.user);
    }

    const validationError = await validateBuddyPostPayload(payload);
    if (validationError) {
      return res.status(validationError.status).json(validationError.body);
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

    if (/categor/i.test(error.message || "")) {
      return res.status(400).json({ message: error.message });
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

export async function updateBuddyPost(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const post = await BuddyPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Buddy post not found." });
    }

    const editor = await User.findById(userId).select("email isAdmin");
    const isAdminEditor = canUseSummitSceneImportFlag(editor, req.user);
    if (!isPostOwner(post, userId) && !isAdminEditor) {
      return res.status(403).json({ message: "You can only edit your own community posts." });
    }

    const payload = normalizeCreateBody(req.body);
    payload.importedBySummitScene =
      payload.communityType === "jobs" &&
      isAdminEditor &&
      Boolean(req.body?.importedBySummitScene);

    const validationError = await validateBuddyPostPayload(payload);
    if (validationError) {
      return res.status(validationError.status).json(validationError.body);
    }

    const editableFields = [
      "type",
      "activityText",
      "imageUrl",
      "businessName",
      "locationName",
      "websiteUrl",
      "applyByDate",
      "expiresAt",
      "importedBySummitScene",
      "category",
      "categories",
      "categoryTags",
      "vibeTags",
      "communityType",
      "date",
      "time",
      "town",
      "skillLevel",
      "groupSizePreference",
      "scheduleType",
      "recurrence",
      "eventId",
    ];

    editableFields.forEach((field) => {
      if (payload[field] === undefined) {
        post[field] = undefined;
      } else {
        post[field] = payload[field];
      }
    });

    await post.save();

    const populated = await populateBuddyPost(BuddyPost.findById(post._id));
    return res.json(populated);
  } catch (error) {
    console.error("Error in PATCH /api/buddy-posts/:id:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Buddy post validation failed.",
        error: error.message,
      });
    }

    if (/categor/i.test(error.message || "")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Failed to update buddy post.",
      error: error.message,
    });
  }
}

export async function deleteBuddyPost(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const post = await BuddyPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Buddy post not found." });
    }

    const editor = await User.findById(userId).select("email isAdmin");
    const isAdminEditor = canUseSummitSceneImportFlag(editor, req.user);
    if (!isPostOwner(post, userId) && !isAdminEditor) {
      return res.status(403).json({ message: "You can only delete your own community posts." });
    }

    await post.deleteOne();
    return res.json({ message: "Buddy post deleted." });
  } catch (error) {
    console.error("Error in DELETE /api/buddy-posts/:id:", error);
    return res.status(500).json({
      message: "Failed to delete buddy post.",
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

    if (!alreadyInterested) {
      const actorName = await getActorName(userId);
      await createAppNotification({
        recipientId: post.createdBy,
        actorId: userId,
        type: "buddy-post-interest",
        title: "Someone is interested",
        message: `${actorName} is interested in your post.`,
        buddyPostId: post._id,
        data: { screen: "buddy-post" },
        sendPush: false,
      });
    }

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

    const moderationIssue = findContentModerationIssue({ text });
    if (moderationIssue) {
      return res.status(400).json({ message: moderationIssue.message });
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

    const actorName = await getActorName(userId);
    const newReply = post.replies[post.replies.length - 1];
    await createAppNotification({
      recipientId: post.createdBy,
      actorId: userId,
      type: "buddy-post-reply",
      title: "New comment on your post",
      message: `${actorName} commented on your post.`,
      buddyPostId: post._id,
      replyId: newReply?._id?.toString(),
      data: { screen: "buddy-post" },
      sendPush: true,
    });

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

export async function addBuddyPostReplyResponse(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ message: "Reply text is required." });
    }

    const moderationIssue = findContentModerationIssue({ text });
    if (moderationIssue) {
      return res.status(400).json({ message: moderationIssue.message });
    }

    const post = await BuddyPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Buddy post not found." });
    }

    const reply = post.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found." });
    }

    reply.replies.push({
      text,
      createdBy: userId,
    });

    await post.save();

    const actorName = await getActorName(userId);
    const childReply = reply.replies[reply.replies.length - 1];
    const notifyRecipients = [
      reply.createdBy,
      post.createdBy,
    ].filter(
      (recipientId, index, recipients) =>
        recipientId &&
        recipientId.toString() !== userId.toString() &&
        recipients.findIndex(
          (item) => item?.toString() === recipientId.toString()
        ) === index
    );

    await Promise.all(
      notifyRecipients.map((recipientId) =>
        createAppNotification({
          recipientId,
          actorId: userId,
          type: "buddy-reply-response",
          title: "New reply",
          message: `${actorName} replied in a comment thread.`,
          buddyPostId: post._id,
          replyId: childReply?._id?.toString() || reply._id?.toString(),
          data: { screen: "buddy-post" },
          sendPush: true,
        })
      )
    );

    const populated = await populateBuddyPost(BuddyPost.findById(post._id));
    return res.status(201).json(populated);
  } catch (error) {
    console.error("Error in POST /api/buddy-posts/:id/replies/:replyId/replies:", error);

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

export async function toggleBuddyPostReplyLike(req, res) {
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

    const alreadyLiked = (reply.likes || []).some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
      reply.likes = reply.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      reply.likes.push(userId);
    }

    await post.save();

    if (!alreadyLiked) {
      const actorName = await getActorName(userId);
      await createAppNotification({
        recipientId: reply.createdBy,
        actorId: userId,
        type: "buddy-reply-like",
        title: "Someone liked your comment",
        message: `${actorName} liked your comment.`,
        buddyPostId: post._id,
        replyId: reply._id?.toString(),
        data: { screen: "buddy-post" },
        sendPush: false,
      });
    }

    const populated = await populateBuddyPost(BuddyPost.findById(post._id));
    return res.json(populated);
  } catch (error) {
    console.error("Error in POST /api/buddy-posts/:id/replies/:replyId/likes:", error);
    return res.status(500).json({
      message: "Failed to update reply like.",
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

    const moderationIssue = findContentModerationIssue({ text });
    if (moderationIssue) {
      return res.status(400).json({ message: moderationIssue.message });
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
