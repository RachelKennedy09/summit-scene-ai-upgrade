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
  "discgolf",
  "walking",
  "bookclub",
  "art",
  "bingo",
  "trivia",
  "shopping",
  "notice",
  "general",
  "other",
];

export const BUDDY_POST_CATEGORIES = [
  "Wellness",
  "Live Music",
  "Karaoke",
  "Workshop",
  "Family",
  "Retail",
  "Outdoors",
  "Happy Hour",
  "Specials",
  "Food Trucks",
  "Markets",
  "Vendors",
  "Networking",
  "Fundraiser",
  "Seasonal/Holiday Special",
  "Nightlife",
  "Sports/Watch Party",
  "Community Info Session",
  "Art",
  "Book Club",
  "Ski Hill Events",
  "Disc Golf",
  "Garage Sale",
  "Gear Sale / Swap",
  "Free Stuff",
  "Lost & Found",
  "Community Notice",
  "Volunteer Help",
  "Other",
];

export const BUDDY_POST_TOWNS = ["Banff", "Canmore", "Lake Louise", "All"];

export const BUDDY_COMMUNITY_TYPES = [
  "local-plan",
  "new-in-town",
  "group",
  "notice",
  "update",
];

export const GROUP_SIZE_PREFERENCES = [
  "one-on-one",
  "small-group",
  "large-group",
  "any",
];

export const BUDDY_SCHEDULE_TYPES = ["single", "recurring"];
export const BUDDY_RECURRENCE_FREQUENCIES = ["weekly", "biweekly", "monthly"];
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const buddyRecurrenceSchema = new Schema(
  {
    frequency: {
      type: String,
      enum: BUDDY_RECURRENCE_FREQUENCIES,
    },
    weekday: {
      type: String,
      enum: WEEKDAYS,
    },
    untilDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in format YYYY-MM-DD"],
    },
  },
  { _id: false }
);

const buddyReplySchema = new Schema(
  {
    text: {
      type: String,
      required: [true, "Reply text is required"],
      trim: true,
      maxlength: 500,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
    },
  },
  { _id: true }
);

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

    category: {
      type: String,
      enum: BUDDY_POST_CATEGORIES,
      index: true,
    },

    communityType: {
      type: String,
      enum: BUDDY_COMMUNITY_TYPES,
      default: "local-plan",
      index: true,
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

    scheduleType: {
      type: String,
      enum: BUDDY_SCHEDULE_TYPES,
      default: "single",
      index: true,
    },

    recurrence: {
      type: buddyRecurrenceSchema,
      default: undefined,
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

    interestedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    replies: {
      type: [buddyReplySchema],
      default: [],
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

buddyPostSchema.index({
  communityType: 1,
  category: 1,
  type: 1,
  town: 1,
  date: 1,
  status: 1,
});

buddyPostSchema.pre("validate", function normalizeLegacyCategories(next) {
  if (this.category === "Food & Drink") {
    this.category = "Food Trucks";
  }

  if (this.category === "Market") {
    this.category = "Markets";
  }

  next();
});

buddyPostSchema.virtual("summary").get(function () {
  return `${this.type} buddy post in ${this.town} on ${this.date}`;
});

const BuddyPost = mongoose.model("BuddyPost", buddyPostSchema);

export default BuddyPost;
