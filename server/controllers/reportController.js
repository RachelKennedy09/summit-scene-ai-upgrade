import mongoose from "mongoose";
import BuddyPost from "../models/BuddyPost.js";
import CommunityPost from "../models/CommunityPost.js";
import Event from "../models/Event.js";
import EventPreference from "../models/EventPreference.js";
import Report, {
  REPORT_ACTIONS,
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
} from "../models/Report.js";
import User from "../models/User.js";

const REPORT_POPULATE_FIELDS =
  "name email role avatarKey profileImageUrl town userType businessVerificationStatus";
const REPORT_STATUSES = ["open", "reviewed", "dismissed"];
const MODERATION_ACTIONS = ["delete-content", "delete-user"];
const LEGACY_REASON_MAP = {
  harassment: "inappropriate",
  spam: "scam",
  unsafe: "scam",
};

function normalizeObjectId(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return mongoose.Types.ObjectId.isValid(trimmed) ? trimmed : undefined;
}

export async function createReport(req, res) {
  try {
    const reporter = req.user?.userId;
    if (!reporter) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const targetType = req.body?.targetType;
    const targetId = normalizeObjectId(req.body?.targetId);
    const parentType = req.body?.parentType || undefined;
    const parentId = normalizeObjectId(req.body?.parentId);
    const requestedReason = req.body?.reason;
    const reason = LEGACY_REASON_MAP[requestedReason] || requestedReason;
    const details =
      typeof req.body?.details === "string" ? req.body.details.trim() : "";

    if (!REPORT_TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({ message: "Invalid report target type." });
    }

    if (!targetId) {
      return res.status(400).json({ message: "Invalid report target id." });
    }

    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ message: "Invalid report reason." });
    }

    const report = await Report.create({
      targetType,
      targetId,
      parentType,
      parentId,
      reason,
      details,
      reporter,
    });

    return res.status(201).json({
      message: "Report submitted.",
      report,
    });
  } catch (error) {
    console.error("Error in POST /api/reports:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Report validation failed.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to submit report.",
      error: error.message,
    });
  }
}

export async function getReports(req, res) {
  try {
    const status =
      req.query?.status === "all"
        ? "all"
        : REPORT_STATUSES.includes(req.query?.status)
          ? req.query.status
          : "open";
    const limit = Math.min(Number(req.query?.limit) || 50, 100);

    const reports = await Report.find(status === "all" ? {} : { status })
      .populate("reporter", REPORT_POPULATE_FIELDS)
      .populate("reviewedBy", REPORT_POPULATE_FIELDS)
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json(reports);
  } catch (error) {
    console.error("Error in GET /api/reports:", error);
    return res.status(500).json({
      message: "Failed to load reports.",
      error: error.message,
    });
  }
}

export async function updateReportStatus(req, res) {
  try {
    const reportId = normalizeObjectId(req.params.id);
    if (!reportId) {
      return res.status(400).json({ message: "Invalid report id." });
    }

    const status = req.body?.status;
    if (!REPORT_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid report status." });
    }

    const actionTaken = REPORT_ACTIONS.includes(req.body?.actionTaken)
      ? req.body.actionTaken
      : "none";
    const moderatorNote =
      typeof req.body?.moderatorNote === "string"
        ? req.body.moderatorNote.trim()
        : "";

    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        $set: {
          status,
          actionTaken,
          moderatorNote,
          reviewedBy: req.user.userId,
          reviewedAt: new Date(),
        },
      },
      { new: true }
    )
      .populate("reporter", REPORT_POPULATE_FIELDS)
      .populate("reviewedBy", REPORT_POPULATE_FIELDS);

    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    return res.json(report);
  } catch (error) {
    console.error("Error in PATCH /api/reports/:id:", error);
    return res.status(500).json({
      message: "Failed to update report.",
      error: error.message,
    });
  }
}

async function deleteUserCascade(userId) {
  const ownedEvents = await Event.find({ createdBy: userId }).select("_id");
  const ownedEventIds = ownedEvents.map((event) => event._id);

  await Promise.all([
    EventPreference.deleteMany({
      $or: [{ userId }, { eventId: { $in: ownedEventIds } }],
    }),
    Event.deleteMany({ createdBy: userId }),
    Event.updateMany({ attendees: userId }, { $pull: { attendees: userId } }),
    CommunityPost.deleteMany({ user: userId }),
    CommunityPost.updateMany(
      {},
      {
        $pull: {
          replies: { user: userId },
          likes: userId,
        },
      }
    ),
    BuddyPost.deleteMany({ createdBy: userId }),
    BuddyPost.updateMany(
      {},
      {
        $pull: {
          interestedUsers: userId,
          replies: { createdBy: userId },
        },
      }
    ),
    User.updateMany(
      { blockedUsers: userId },
      { $pull: { blockedUsers: userId } }
    ),
    Report.updateMany(
      {
        $or: [
          { reporter: userId },
          { reviewedBy: userId },
          { targetType: "user", targetId: userId },
          { targetType: "event", targetId: { $in: ownedEventIds } },
          { parentType: "event", parentId: { $in: ownedEventIds } },
        ],
      },
      {
        $set: {
          status: "reviewed",
          actionTaken: "user_deleted",
        },
      }
    ),
  ]);

  await User.deleteOne({ _id: userId });
}

async function removeReportedContent(report) {
  if (report.targetType === "communityReply") {
    if (!report.parentId) {
      throw new Error("Community reply reports need a parent post id.");
    }

    const result = await CommunityPost.updateOne(
      { _id: report.parentId },
      { $pull: { replies: { _id: report.targetId } } }
    );
    return result.modifiedCount > 0;
  }

  if (report.targetType === "buddyReply") {
    if (!report.parentId) {
      throw new Error("Buddy reply reports need a parent post id.");
    }

    const result = await BuddyPost.updateOne(
      { _id: report.parentId },
      { $pull: { replies: { _id: report.targetId } } }
    );
    return result.modifiedCount > 0;
  }

  if (report.targetType === "communityPost") {
    const result = await CommunityPost.deleteOne({ _id: report.targetId });
    return result.deletedCount > 0;
  }

  if (report.targetType === "buddyPost") {
    const result = await BuddyPost.deleteOne({ _id: report.targetId });
    return result.deletedCount > 0;
  }

  if (report.targetType === "event") {
    const result = await Event.deleteOne({ _id: report.targetId });
    return result.deletedCount > 0;
  }

  throw new Error("This report type does not support content deletion.");
}

async function getReportedUserId(report) {
  if (report.targetType === "user") {
    return report.targetId;
  }

  if (report.targetType === "communityReply") {
    const post = await CommunityPost.findById(report.parentId).select("replies");
    return post?.replies?.id(report.targetId)?.user;
  }

  if (report.targetType === "buddyReply") {
    const post = await BuddyPost.findById(report.parentId).select("replies");
    return post?.replies?.id(report.targetId)?.createdBy;
  }

  if (report.targetType === "communityPost") {
    const post = await CommunityPost.findById(report.targetId).select("user");
    return post?.user;
  }

  if (report.targetType === "buddyPost") {
    const post = await BuddyPost.findById(report.targetId).select("createdBy");
    return post?.createdBy;
  }

  if (report.targetType === "event") {
    const event = await Event.findById(report.targetId).select("createdBy");
    return event?.createdBy;
  }

  return null;
}

export async function applyReportAction(req, res) {
  try {
    const reportId = normalizeObjectId(req.params.id);
    if (!reportId) {
      return res.status(400).json({ message: "Invalid report id." });
    }

    const action = req.body?.action;
    if (!MODERATION_ACTIONS.includes(action)) {
      return res.status(400).json({ message: "Invalid moderation action." });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    if (action === "delete-content") {
      const removed = await removeReportedContent(report);
      if (!removed) {
        return res.status(404).json({ message: "Reported content was not found." });
      }
    }

    if (action === "delete-user") {
      const targetUserId = await getReportedUserId(report);
      if (!targetUserId) {
        return res.status(404).json({ message: "Reported user was not found." });
      }

      await deleteUserCascade(targetUserId);
    }

    report.status = "reviewed";
    report.actionTaken =
      action === "delete-user" ? "user_deleted" : "content_removed";
    report.reviewedBy = req.user.userId;
    report.reviewedAt = new Date();
    report.moderatorNote =
      typeof req.body?.moderatorNote === "string"
        ? req.body.moderatorNote.trim()
        : report.moderatorNote;
    await report.save();

    return res.json(report);
  } catch (error) {
    console.error("Error in POST /api/reports/:id/actions:", error);
    return res.status(500).json({
      message: error.message || "Failed to apply moderation action.",
    });
  }
}

