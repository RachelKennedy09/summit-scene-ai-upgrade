// server/models/Event.js
// Event model for SummitScene
//  - A single event created by a business user
//  - Used on the Hub, Map, My Events, and Event Detail screens
//
// KEY FEATURES:
//  - Supports category filtering
//  - Uses a string date ("YYYY-MM-DD") to avoid timezone issues
//  - Stores creator reference (business user)
//  - Includes optional fields: time, endTime, location, imageUrl

import mongoose from "mongoose";

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
        "Market",
        "Wellness",
        "Music",
        "Workshop",
        "Family",
        "Retail",
        "Outdoors",
        "Food & Drink",
        "Art",
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

    // -------------------------------------------
    // LOCATION & IMAGES
    // -------------------------------------------
    // Venue or meeting place (used in card + detail view)
    location: {
      type: String,
      trim: true,
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
  },
  {
    // Automatically add createdAt / updatedAt timestamps
    timestamps: true,

    // Include virtuals when converting to JSON / plain objects
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

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
