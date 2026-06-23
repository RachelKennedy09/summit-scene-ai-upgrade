import mongoose from "mongoose";

const { Schema } = mongoose;

export const APP_NOTIFICATION_TYPES = [
  "buddy-post-interest",
  "buddy-post-reply",
  "buddy-reply-response",
  "buddy-reply-like",
  "community-post-reply",
  "community-post-like",
];

const appNotificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    type: {
      type: String,
      enum: APP_NOTIFICATION_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    buddyPost: {
      type: Schema.Types.ObjectId,
      ref: "BuddyPost",
      index: true,
    },
    communityPost: {
      type: Schema.Types.ObjectId,
      ref: "CommunityPost",
      index: true,
    },
    replyId: {
      type: String,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

appNotificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

const AppNotification = mongoose.model(
  "AppNotification",
  appNotificationSchema
);

export default AppNotification;
