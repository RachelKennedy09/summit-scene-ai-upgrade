// server/models/BuddyPost.js
// Structured posts for finding event, hiking, skiing/snowboarding, and general buddies.

import mongoose from "mongoose";
import { ACTIVITY_SKILL_LEVELS } from "./User.js";
import {
  COMMUNITY_CATEGORY_TAGS,
  COMMUNITY_FORM_CATEGORIES,
  EVENT_CATEGORY_GROUPS,
  MAX_VIBE_TAGS,
  VIBE_TAGS,
  getMainCategoryForTag,
} from "../../constants/eventCategories.js";

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
  ...new Set([
    ...EVENT_CATEGORY_GROUPS.map((group) => group.title),
    ...COMMUNITY_FORM_CATEGORIES,
  ]),
];
export const BUDDY_POST_CATEGORY_TAGS = COMMUNITY_CATEGORY_TAGS;

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

    categories: {
      type: [
        {
          type: String,
          enum: BUDDY_POST_CATEGORIES,
          trim: true,
        },
      ],
      default: undefined,
      validate: {
        validator(value) {
          return !value || value.length <= 3;
        },
        message: "Choose up to 3 categories.",
      },
    },

    categoryTags: {
      type: [
        {
          type: String,
          enum: BUDDY_POST_CATEGORY_TAGS,
          trim: true,
        },
      ],
      default: undefined,
      validate: {
        validator(value) {
          return !value || value.length <= 8;
        },
        message: "Choose up to 8 category tags.",
      },
    },

    vibeTags: {
      type: [
        {
          type: String,
          enum: VIBE_TAGS,
          trim: true,
        },
      ],
      default: undefined,
      validate: {
        validator(value) {
          return !value || value.length <= MAX_VIBE_TAGS;
        },
        message: `Choose up to ${MAX_VIBE_TAGS} vibe tags.`,
      },
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
  categories: 1,
  type: 1,
  town: 1,
  date: 1,
  status: 1,
});

buddyPostSchema.pre("validate", function normalizeLegacyCategories(next) {
  const legacyCategoryMap = {
    Market: "Farmers Markets",
    Markets: "Farmers Markets",
    "Outdoor Yoga": "Yoga",
    "Seasonal & Tourism": "Tours & Experiences",
  };
  const normalizeCategory = (category) => {
    const normalized = legacyCategoryMap[category] || category;
    return getMainCategoryForTag(normalized) || normalized;
  };

  if (this.category) {
    this.category = normalizeCategory(this.category);
  }

  if (Array.isArray(this.categories)) {
    this.categories = [
      ...new Set(this.categories.map(normalizeCategory).filter(Boolean)),
    ].slice(0, 3);
  }

  if (!this.categories?.length && this.category) {
    this.categories = [this.category];
  }

  if (this.categories?.length) {
    this.category = this.categories[0];
  }

  next();
});

buddyPostSchema.virtual("summary").get(function () {
  return `${this.type} buddy post in ${this.town} on ${this.date}`;
});

const BuddyPost = mongoose.model("BuddyPost", buddyPostSchema);

export default BuddyPost;
