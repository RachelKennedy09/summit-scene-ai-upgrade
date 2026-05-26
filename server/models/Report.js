import mongoose from "mongoose";

const REPORT_TARGET_TYPES = [
  "buddyPost",
  "buddyReply",
  "communityPost",
  "communityReply",
  "event",
  "user",
];

const REPORT_REASONS = [
  "fake_event",
  "misleading_business",
  "harassment",
  "spam",
  "unsafe",
  "scam",
  "inappropriate",
  "other",
];

const REPORT_ACTIONS = [
  "none",
  "warning",
  "content_removed",
  "user_blocked",
  "user_deleted",
  "business_review",
  "other",
];

const reportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: REPORT_TARGET_TYPES,
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    parentType: {
      type: String,
      enum: ["buddyPost", "communityPost", "event", "user"],
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: true,
      index: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "reviewed", "dismissed"],
      default: "open",
      index: true,
    },
    moderatorNote: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    actionTaken: {
      type: String,
      enum: REPORT_ACTIONS,
      default: "none",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

reportSchema.index({ targetType: 1, targetId: 1, reporter: 1 });

const Report = mongoose.model("Report", reportSchema);

export { REPORT_ACTIONS, REPORT_REASONS, REPORT_TARGET_TYPES };
export default Report;
