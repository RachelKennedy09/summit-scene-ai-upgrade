// server/models/Event.js
// Event model for SummitScene
//  - A single event created by a business user
//  - Used on the Hub, Map, My Events, and Event Detail screens
//
// KEY FEATURES:
//  - Supports category filtering
//  - Uses a string date ("YYYY-MM-DD") to avoid timezone issues
//  - Stores creator reference (business user)
//  - Includes optional fields: time, endTime, venue/address, imageUrl, coordinates

import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema(
  {
    startTime: {
      type: String,
      trim: true,
    },
    endTime: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const recurrenceSchema = new mongoose.Schema(
  {
    frequency: {
      type: String,
      enum: ["daily", "weekly", "selected_weekdays"],
    },
    weekdays: {
      type: [String],
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      default: undefined,
    },
    untilDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in format YYYY-MM-DD"],
    },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    // -------------------------------------------
    // BASIC EVENT DETAILS
    // -------------------------------------------
    // Short title displayed on event cards
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },

    // Longer description shown on Event Detail screen
    description: {
      type: String,
      trim: true,
    },

    // Which mountain town this event belongs to (used for filtering)
    town: {
      type: String,
      required: [true, "Town is required"],
      trim: true,
      enum: ["Banff", "Canmore", "Lake Louise"],
    },

    // Event category used for filtering chips
    category: {
      type: String,
      trim: true,
      enum: [
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
        "Other",
      ],
      default: "Other",
    },

    // -------------------------------------------
    // DATE & TIME
    // -------------------------------------------
    // Event date stored as a string to avoid timezone shifting.
    // Ex: "2025-12-06"
    date: {
      type: String,
      required: [true, "Event date is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in format YYYY-MM-DD"],
    },

    // Optional start time (e.g., "7:00 PM")
    time: {
      type: String,
      trim: true,
    },

    // Optional end time (e.g., "9:00 PM")
    endTime: {
      type: String,
      trim: true,
    },

    scheduleType: {
      type: String,
      enum: ["single", "recurring"],
      default: "single",
    },

    isAllDay: {
      type: Boolean,
      default: false,
    },

    recurrence: recurrenceSchema,

    timeSlots: {
      type: [timeSlotSchema],
      default: undefined,
    },

    // -------------------------------------------
    // LOCATION & IMAGES
    // -------------------------------------------
    // Venue or meeting place (used in card + detail view)
    locationName: {
      type: String,
      trim: true,
    },

    // Full address used for exact map placement and external maps links
    address: {
      type: String,
      trim: true,
    },

    // Legacy display field kept for backward compatibility with older clients
    location: {
      type: String,
      trim: true,
    },

    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },

    // Optional image poster for event card / detail hero
    imageUrl: {
      type: String,
      trim: true,
    },

    // -------------------------------------------
    // CREATOR INFO
    // -------------------------------------------
    // Business user who created this event
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    attendees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    // Automatically add createdAt / updatedAt timestamps
    timestamps: true,

    // Include virtuals when converting to JSON / plain objects
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

eventSchema.pre("validate", function normalizeLegacyCategories(next) {
  if (this.category === "Food & Drink") {
    this.category = "Happy Hour";
  }

  if (this.category === "Market") {
    this.category = "Markets";
  }

  next();
});

// -------------------------------------------
// VIRTUALS
// -------------------------------------------
// Quick string used for debugging logs.
// Example: "Open Mic Night (Banff) on 2025-12-10"
eventSchema.virtual("summary").get(function () {
  return `${this.title} (${this.town}) on ${this.date}`;
});

// -------------------------------------------
// MODEL EXPORT
// -------------------------------------------
// Creates/uses the "events" collection in MongoDB.
const Event = mongoose.model("Event", eventSchema);

export default Event;
