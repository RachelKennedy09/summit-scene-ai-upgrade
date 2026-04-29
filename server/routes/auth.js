// server/routes/auth.js
// Auth routes for SummitScene
//  - Register new users (local + business)
//  - Log users in and issue JWT tokens
//  - Return the current logged-in user's info (session restore)

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import { buildProfileUpdates, buildSafeUser } from "../utils/userProfile.js";

// Load environment variables (JWT_SECRET, etc.)
dotenv.config();

const router = express.Router();

// ---------------------------
// HELPER: JWT CREATION
// ---------------------------

// Create a signed JWT token for the client to store.
// The token allows the app to prove who the user is on each request.
function createToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }

  // Handle older users that might not have a role yet
  const role = user.role || "local";

  return jwt.sign(
    {
      userId: user._id.toString(),
      role,
      name: user.name,
      email: user.email,
      // NOTE: We keep the payload minimal. Extra fields can be added later if needed.
    },
    secret,
    { expiresIn: "1h" }
  );
}

/* -------------------------------------------
   POST /api/auth/register
   BODY:
     {
       email,
       password,
       name,
       role?, town?, userType?, languages?, interests?, skillLevel?,
       socialAccounts?, bio?, lookingFor?, instagram?, website?, avatarKey?
     }

   - Create a new user account and return a JWT + basic profile.

   1) Validate required fields
   2) Normalize email and check if user already exists
   3) Decide a safe final role (local | business)
   4) Hash password and store user in DB
   5) Return token + "safe" user info (no password)
------------------------------------------- */
router.post("/register", async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      role,
    } = req.body || {};

    // Basic validation for required fields
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ message: "Name, Email, and password are required." });
    }

    // Normalize email to avoid case sensitivity issues
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    // Decide finalRole safely (only allow known values)
    const allowedRoles = ["local", "business"];
    let finalRole = "local";

    if (role && allowedRoles.includes(role)) {
      finalRole = role;
    }
    // If something weird is sent, we fall back to "local"

    if (finalRole === "business") {
      const hasBusinessType =
        typeof req.body?.lookingFor === "string" &&
        req.body.lookingFor.trim().length > 0;
      const hasProofLink =
        (typeof req.body?.website === "string" &&
          req.body.website.trim().length > 0) ||
        (typeof req.body?.instagram === "string" &&
          req.body.instagram.trim().length > 0);

      if (!hasBusinessType || !hasProofLink) {
        return res.status(400).json({
          message:
            "Business profile requests require a business type and either a website or Instagram.",
        });
      }
    }

    // Hash password using bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const businessVerificationStatus =
      finalRole === "business" ? "pending" : "none";

    // Create user document in MongoDB
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      name,
      role: finalRole,
      businessVerificationStatus,
      businessVerificationRequestedAt:
        finalRole === "business" ? new Date() : undefined,
      ...buildProfileUpdates(req.body),
    });

    // Create JWT token for the new user
    const token = createToken(user);

    // Send minimal, safe user data back (no passwordHash)
    res.status(201).json({
      token,
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Error in POST /api/auth/register:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
});

/* -------------------------------------------
   POST /api/auth/login
   BODY: { email, password }
   - Log an existing user in and return a JWT + profile.

   1) Validate email + password
   2) Normalize email and find user
   3) Compare plaintext password with stored hash
   4) If match, return token + safe user
------------------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = createToken(user);

    res.json({
      token,
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Error in POST /api/auth/login:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});

/* -------------------------------------------
   GET /api/auth/me
   AUTH: Requires a valid JWT (authMiddleware)

   - Return the currently logged-in user's profile.
   - Used by the app to restore sessions from a stored token.
------------------------------------------- */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user: buildSafeUser(user) });
  } catch (error) {
    console.error("Error in GET /api/auth/me:", error);
    res.status(500).json({ message: "Server error while fetching user." });
  }
});

export default router;
