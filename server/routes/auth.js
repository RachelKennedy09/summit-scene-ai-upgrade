// server/routes/auth.js
// Auth routes for SummitScene
//  - Register new users (local + business)
//  - Log users in and issue JWT tokens
//  - Return the current logged-in user's info (session restore)

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";

import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";
import { buildProfileUpdates, buildSafeUser } from "../utils/userProfile.js";
import {
  sendEmailChangeConfirmation,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/emailService.js";

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
      passwordChangedAt: user.passwordChangedAt
        ? user.passwordChangedAt.getTime()
        : null,
      // NOTE: We keep the payload minimal. Extra fields can be added later if needed.
    },
    secret,
    { expiresIn: "1h" }
  );
}

function createPlainToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isTokenStillValid(expiresAt) {
  return Boolean(expiresAt) && new Date(expiresAt).getTime() > Date.now();
}

function addHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function includeDevToken(token) {
  return ["development", "test"].includes(process.env.NODE_ENV)
    ? token
    : undefined;
}

function validatePasswordStrength(password) {
  const value = String(password || "");

  if (value.length < 10) {
    return "Password must be at least 10 characters.";
  }

  if (!/[A-Za-z]/.test(value)) {
    return "Password must include at least one letter.";
  }

  if (!/\d/.test(value)) {
    return "Password must include at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    return "Password must include at least one symbol.";
  }

  return "";
}

async function sendEmailSafely(task) {
  try {
    await task();
  } catch (error) {
    console.error("Email send failed:", error.message);
  }
}

async function prepareEmailVerification(user) {
  const token = createPlainToken();
  user.emailVerificationTokenHash = hashToken(token);
  user.emailVerificationExpiresAt = addHours(24);
  await user.save();
  await sendEmailSafely(() =>
    sendVerificationEmail({ to: user.email, token })
  );
  return token;
}

function normalizePublicName(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

function getVerifiedFacebookSignup(body = {}) {
  if (!body.facebookConnectToken) {
    return null;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }

  const payload = jwt.verify(body.facebookConnectToken, secret);
  if (payload?.provider !== "facebook" || !payload.providerUserId) {
    return null;
  }

  return {
    provider: "facebook",
    handle: payload.name,
    providerUserId: payload.providerUserId,
    verified: true,
    connectedAt: new Date(),
    profileImageUrl: payload.profileImageUrl || "",
  };
}

router.get("/email-availability", async (req, res) => {
  try {
    const email =
      typeof req.query?.email === "string"
        ? req.query.email.trim().toLowerCase()
        : "";

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email address." });
    }

    const existing = await User.findOne({ email }).select("_id").lean();
    res.json({ available: !existing });
  } catch (error) {
    console.error("Error in GET /api/auth/email-availability:", error);
    res.status(500).json({ message: "Server error checking email." });
  }
});

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
      acceptedAgeTerms,
    } = req.body || {};

    // Basic validation for required fields
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ message: "Name, Email, and password are required." });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    if (acceptedAgeTerms !== true) {
      return res.status(400).json({
        message:
          "You must confirm you are at least 18 years old to create a Summit Scene account.",
      });
    }

    // Normalize email to avoid case sensitivity issues
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = normalizePublicName(name);

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

    const profileUpdates = buildProfileUpdates(req.body);
    const verifiedFacebook = getVerifiedFacebookSignup(req.body);

    if (verifiedFacebook) {
      profileUpdates.profileImageUrl =
        verifiedFacebook.profileImageUrl || profileUpdates.profileImageUrl;
      profileUpdates.avatarKey = null;
      profileUpdates.socialAccounts = [
        ...(profileUpdates.socialAccounts || []).filter(
          (account) => account.provider !== "facebook"
        ),
        verifiedFacebook,
      ];
    }

    // Create user document in MongoDB
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      name: normalizedName,
      role: finalRole,
      businessVerificationStatus,
      businessVerificationRequestedAt:
        finalRole === "business" ? new Date() : undefined,
      ...profileUpdates,
    });

    const emailVerificationToken = await prepareEmailVerification(user);

    // Create JWT token for the new user
    const token = createToken(user);

    // Send minimal, safe user data back (no passwordHash)
    res.status(201).json({
      token,
      user: buildSafeUser(user),
      emailVerificationToken: includeDevToken(emailVerificationToken),
    });
  } catch (error) {
    console.error("Error in POST /api/auth/register:", error);
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ message: "Email is already registered." });
    }

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

router.post("/resend-verification", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.emailVerified) {
      return res.json({
        message: "Email is already verified.",
        user: buildSafeUser(user),
      });
    }

    const emailVerificationToken = await prepareEmailVerification(user);
    res.json({
      message: "Verification email sent.",
      user: buildSafeUser(user),
      emailVerificationToken: includeDevToken(emailVerificationToken),
    });
  } catch (error) {
    console.error("Error in POST /api/auth/resend-verification:", error);
    res.status(500).json({ message: "Server error sending verification email." });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ message: "Verification token is required." });
    }

    const user = await User.findOne({
      emailVerificationTokenHash: hashToken(token),
    });

    if (!user || !isTokenStillValid(user.emailVerificationExpiresAt)) {
      return res
        .status(400)
        .json({ message: "Verification link is invalid or expired." });
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    res.json({
      message: "Email verified.",
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Error in POST /api/auth/verify-email:", error);
    res.status(500).json({ message: "Server error verifying email." });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const genericMessage =
      "If that email exists, password reset instructions have been sent.";

    if (!normalizedEmail) {
      return res.json({ message: genericMessage });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.json({ message: genericMessage });
    }

    const resetToken = createPlainToken();
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpiresAt = addHours(1);
    await user.save();

    await sendEmailSafely(() =>
      sendPasswordResetEmail({ to: user.email, token: resetToken })
    );

    res.json({
      message: genericMessage,
      passwordResetToken: includeDevToken(resetToken),
    });
  } catch (error) {
    console.error("Error in POST /api/auth/forgot-password:", error);
    res.status(500).json({ message: "Server error requesting password reset." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Reset token and new password are required." });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
    });

    if (!user || !isTokenStillValid(user.passwordResetExpiresAt)) {
      return res
        .status(400)
        .json({ message: "Reset link is invalid or expired." });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordChangedAt = new Date();
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    res.json({ message: "Password reset successful." });
  } catch (error) {
    console.error("Error in POST /api/auth/reset-password:", error);
    res.status(500).json({ message: "Server error resetting password." });
  }
});

router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required." });
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!passwordMatches) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    res.json({ message: "Password changed." });
  } catch (error) {
    console.error("Error in POST /api/auth/change-password:", error);
    res.status(500).json({ message: "Server error changing password." });
  }
});

router.post("/request-email-change", authMiddleware, async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body || {};
    const normalizedEmail =
      typeof newEmail === "string" ? newEmail.trim().toLowerCase() : "";

    if (!normalizedEmail || !currentPassword) {
      return res
        .status(400)
        .json({ message: "New email and current password are required." });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!passwordMatches) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    if (normalizedEmail === user.email) {
      return res.status(400).json({ message: "That is already your email." });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const emailChangeToken = createPlainToken();
    user.pendingEmail = normalizedEmail;
    user.pendingEmailVerificationTokenHash = hashToken(emailChangeToken);
    user.pendingEmailVerificationExpiresAt = addHours(24);
    await user.save();

    await sendEmailSafely(() =>
      sendEmailChangeConfirmation({ to: normalizedEmail, token: emailChangeToken })
    );

    res.json({
      message: "Confirmation email sent to the new address.",
      user: buildSafeUser(user),
      emailChangeToken: includeDevToken(emailChangeToken),
    });
  } catch (error) {
    console.error("Error in POST /api/auth/request-email-change:", error);
    res.status(500).json({ message: "Server error requesting email change." });
  }
});

router.post("/confirm-email-change", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ message: "Email change token is required." });
    }

    const user = await User.findOne({
      pendingEmailVerificationTokenHash: hashToken(token),
    });

    if (
      !user ||
      !user.pendingEmail ||
      !isTokenStillValid(user.pendingEmailVerificationExpiresAt)
    ) {
      return res
        .status(400)
        .json({ message: "Email change link is invalid or expired." });
    }

    const existing = await User.findOne({ email: user.pendingEmail });
    if (existing && existing._id.toString() !== user._id.toString()) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.pendingEmailVerificationTokenHash = undefined;
    user.pendingEmailVerificationExpiresAt = undefined;
    await user.save();

    res.json({
      message: "Email changed.",
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Error in POST /api/auth/confirm-email-change:", error);
    res.status(500).json({ message: "Server error confirming email change." });
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
