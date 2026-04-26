// server/models/User.js
// User model for SummitScene
//  - A registered user in the SummitScene ecosystem
//  - Handles login credentials, roles (local vs business), and profile fields
//
// WHERE IT IS USED:
//  - Auth system (register/login/token payload)
//  - Community posts (name snapshots, replies, likes)
//  - Event creation (business role only)
//  - Account screen (profile updates)

import mongoose from "mongoose";

export const PROFILE_TOWNS = ["Banff", "Canmore", "Lake Louise", "LL", "All"];
export const USER_TYPES = ["local", "seasonal", "visitor"];
export const ACTIVITY_SKILL_LEVELS = ["beginner", "casual", "experienced"];
export const SOCIAL_PROVIDERS = [
  "instagram",
  "tiktok",
  "facebook",
  "linkedin",
  "website",
];

const skillLevelSchema = new mongoose.Schema(
  {
    hiking: {
      type: String,
      enum: ACTIVITY_SKILL_LEVELS,
    },
    skiing: {
      type: String,
      enum: ACTIVITY_SKILL_LEVELS,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // -------------------------------------------
    // AUTH / LOGIN FIELDS
    // -------------------------------------------
    // Unique email for each user
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    // Hashed password (never store plain text)
    passwordHash: {
      type: String,
      required: true,
    },

    // Display name shown throughout the app
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Role affects permissions:
    //  - local: standard user
    //  - business: can create/update/delete events
    role: {
      type: String,
      enum: ["local", "business"],
      default: "local",
      required: true,
    },

    // -------------------------------------------
    // PROFILE FIELDS VISIBLE ON ACCOUNT SCREEN
    // -------------------------------------------

    town: {
      type: String,
      enum: PROFILE_TOWNS,
      trim: true,
    },

    // Social profile type. Separate from role, which controls permissions.
    userType: {
      type: String,
      enum: USER_TYPES,
      default: "local",
    },

    languages: {
      type: [String],
      default: [],
    },

    interests: {
      type: [String],
      default: [],
    },

    skillLevel: {
      type: skillLevelSchema,
      default: {},
    },

    // Short personal description ("I love markets and open mic nights")
    bio: {
      type: String,
      maxlength: 300,
    },

    // What experiences the user is looking for
    lookingFor: {
      type: String,
      maxlength: 200,
    },

    // Instagram handle (optional)
    instagram: {
      type: String,
    },

    // Website for business users
    website: {
      type: String,
    },

    socialAccounts: {
      type: [
        {
          provider: {
            type: String,
            enum: SOCIAL_PROVIDERS,
            required: true,
          },
          handle: {
            type: String,
            trim: true,
          },
          url: {
            type: String,
            trim: true,
          },
          providerUserId: {
            type: String,
            trim: true,
          },
          verified: {
            type: Boolean,
            default: false,
          },
          connectedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    // Avatar key used to render one of the 16 preset avatars
    avatarKey: {
      type: String,
      default: null,
    },
  },
  {
    // Automatically create createdAt / updatedAt timestamps
    timestamps: true,

    // Include virtuals when returning JSON to the client
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// -------------------------------------------
// VIRTUALS
// -------------------------------------------
// safeProfile:
//   A lightweight profile object without sensitive info.
//   Useful for embedding inside other documents (posts, events)
//   or returning as part of auth endpoints.
//
userSchema.virtual("safeProfile").get(function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    avatarKey: this.avatarKey,
    town: this.town,
    userType: this.userType,
    languages: this.languages,
    interests: this.interests,
    skillLevel: this.skillLevel,
    lookingFor: this.lookingFor,
    socialAccounts: this.socialAccounts,
  };
});

// -------------------------------------------
// MODEL EXPORT
// -------------------------------------------
// Creates/uses the "users" collection in MongoDB.
const User = mongoose.model("User", userSchema);

export default User;
