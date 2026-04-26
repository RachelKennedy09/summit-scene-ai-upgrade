// server/models/BuddyPost.js
// Structured posts for finding event, hiking, skiing/snowboarding, and general buddies.

import mongoose from "mongoose";
import { ACTIVITY_SKILL_LEVELS } from "./User.js";

const { Schema } = mongoose;

export const BUDDY_POST_TYPES = [
  "event",
  "hiking",
  "skiing",
  "snowboarding",
  "walking",
  "bookclub",
  "art",
  "bingo",
  "trivia",
  "shopping",
  "general",
  "other",
];

export const BUDDY_POST_TOWNS = ["Banff", "Canmore", "Lake Louise", "All"];

export const GROUP_SIZE_PREFERENCES = [
  "one-on-one",
  "small-group",
  "any",
];

const buddyPostSchema = new Schema(
  {
    type: {
      type: String,
      enum: BUDDY_POST_TYPES,
      required: [true, "Buddy post type is required"],
      index: true,
    },

    activityText: {
      type: String,
      required: [true, "Activity text is required"],
      trim: true,
      maxlength: 500,
    },

    date: {
      type: String,
      required: [true, "Date is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in format YYYY-MM-DD"],
      index: true,
    },

    time: {
      type: String,
      trim: true,
    },

    town: {
      type: String,
      enum: BUDDY_POST_TOWNS,
      required: [true, "Town is required"],
      index: true,
    },

    skillLevel: {
      type: String,
      enum: ACTIVITY_SKILL_LEVELS,
    },

    groupSizePreference: {
      type: String,
      enum: GROUP_SIZE_PREFERENCES,
      default: "any",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
    },

    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

buddyPostSchema.index({ type: 1, town: 1, date: 1, status: 1 });

buddyPostSchema.virtual("summary").get(function () {
  return `${this.type} buddy post in ${this.town} on ${this.date}`;
});

const BuddyPost = mongoose.model("BuddyPost", buddyPostSchema);

export default BuddyPost;
