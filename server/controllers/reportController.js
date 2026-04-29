import mongoose from "mongoose";
import Report, {
  REPORT_ACTIONS,
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
} from "../models/Report.js";

const REPORT_POPULATE_FIELDS =
  "name email role avatarKey profileImageUrl town userType businessVerificationStatus";
const REPORT_STATUSES = ["open", "reviewed", "dismissed"];

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
    const reason = req.body?.reason;
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

