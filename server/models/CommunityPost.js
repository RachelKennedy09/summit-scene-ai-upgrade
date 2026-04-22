// server/models/CommunityPost.js
// Defines the CommunityPost collection structure in MongoDB.
// Used for the Community tab:
//  - Highway Conditions
//  - Ride Shares
//  - Event Buddies

import mongoose from "mongoose";

const { Schema } = mongoose;

// -------------------------------------------
// REPLY SUBDOCUMENT SCHEMA
// -------------------------------------------
// Each reply is embedded inside a CommunityPost document.
// This keeps the conversation thread together with its post.

const communityReplySchema = new Schema(
  {
    // Reference to the user who wrote the reply
    user: { type: Schema.Types.ObjectId, ref: "User" },

    // Snapshot of the user's display name at the time of reply
    name: { type: String, trim: true },

    // Actual text content of the reply
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true } // adds createdAt / updatedAt for each reply
);

// -------------------------------------------
// MAIN COMMUNITY POST SCHEMA
// -------------------------------------------
// Represents a single community post in the SummitScene app.
// Examples:
//  - A ride share request from Banff to Calgary
//  - An "Event Buddy" post for a concert
//  - Highway condition updates between Banff and Lake Louise

const communityPostSchema = new Schema(
  {
    // Reference to the user who created the post
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Post type controls which community section it appears in
    // (Roads, Ride Share, Event Buddy)
    type: {
      type: String,
      enum: ["highwayconditions", "rideshare", "eventbuddy"],
      required: true,
    },

    // Mountain town this post is about
    town: {
      type: String,
      enum: ["Banff", "Canmore", "Lake Louise"],
      required: true,
    },

    // Display name shown in the UI (can match account name or be custom)
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Short headline shown in the Community list
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Full text body of the post
    body: {
      type: String,
      required: true,
      trim: true,
    },

    // The date this post is about (e.g., travel date, event date).
    // Stored as a real Date object to allow filtering/sorting.
    targetDate: {
      type: Date,
      required: true,
    },

    // Replies embedded directly under the post
    replies: [communityReplySchema],

    // Array of user IDs who liked this post
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    // Automatically adds createdAt / updatedAt fields on the post
    timestamps: true,

    // Include virtuals when converting documents to JSON / plain objects
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// -------------------------------------------
// VIRTUALS
// -------------------------------------------
// Simple summary field for logging/debugging.
// Example: "rideshare in Banff on 2025-12-06"
communityPostSchema.virtual("summary").get(function () {
  const dateStr = this.targetDate?.toISOString().slice(0, 10);
  return `${this.type} in ${this.town} on ${dateStr}`;
});

// -------------------------------------------
// MODEL EXPORT
// -------------------------------------------
// This creates/uses the "communityposts" collection in MongoDB.
const CommunityPost = mongoose.model("CommunityPost", communityPostSchema);

export default CommunityPost;
