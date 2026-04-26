// server/routes/users.js
// User-related routes (upgrade account & profile updates)
//  - Upgrade a regular user account to a "business" account
//  - Allow logged-in users to update their own profile fields
//
// All routes in this file:
//  - Require a valid JWT via authMiddleware
//  - Use req.user.userId to identify the current user

import express from "express";
import authMiddleware from "../middleware/auth.js";
import User from "../models/User.js";
import { buildProfileUpdates, buildSafeUser } from "../utils/userProfile.js";

const router = express.Router();

/* -------------------------------------------
   PATCH /api/users/upgrade-to-business
   AUTH: required (must be logged in)
   - Upgrade the current user's role from "local" to "business".

   1) Read userId from JWT (authMiddleware attaches req.user)
   2) Find user in MongoDB
   3) If user not found -> 404
   4) If already business -> 400
   5) Set role = "business", save
   6) Return updated user (no passwordHash)
------------------------------------------- */
router.patch("/upgrade-to-business", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "business") {
      return res
        .status(400)
        .json({ message: "Account is already a business account." });
    }

    user.role = "business";
    await user.save();

    return res.json({
      message: "Account upgraded to business.",
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Error upgrading to business:", error);
    res.status(500).json({ message: "Server error while upgrading account." });
  }
});

/* -------------------------------------------
   PATCH /api/users/me
   AUTH: required (must be logged in)
   - Update the logged-in user's profile fields:
     name, town, userType, languages, interests, skillLevel, socialAccounts,
     bio, lookingFor, instagram, website, avatarKey
   - Only updates fields that are provided and of the correct type.
   - Trims strings before saving.
   - Special handling for avatarKey:
       * If avatarKey exists in body:
           - If null → clear avatar
           - If string → set/replace avatarKey
------------------------------------------- */
router.patch("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const updates = buildProfileUpdates(req.body);

    // Guard: if no valid fields were provided, don't hit the DB
    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided to update." });
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      message: "Profile updated.",
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

export default router;
