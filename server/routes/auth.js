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
import { findContentModerationIssue } from "../utils/contentModeration.js";
import { buildProfileUpdates, buildSafeUser } from "../utils/userProfile.js";
import {
  sendEmailChangeConfirmation,
  sendEmailChangedSecurityAlert,
  sendEmailChangeRequestedSecurityAlert,
  sendPasswordChangedSecurityAlert,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../services/emailService.js";

// Load environment variables (JWT_SECRET, etc.)
dotenv.config();

const router = express.Router();
const DEFAULT_JWT_EXPIRES_IN = "90d";
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

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
    { expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN }
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
  const nodeEnv = process.env.NODE_ENV || "production";
  return ["development", "test"].includes(nodeEnv)
    ? token
    : undefined;
}

const rateLimitBuckets = new Map();

function cleanupRateLimitBucket(key, now) {
  const bucket = rateLimitBuckets.get(key);
  if (bucket && bucket.resetAt <= now) {
    rateLimitBuckets.delete(key);
  }
}

function createRateLimiter({
  windowMs,
  max,
  message,
  keyGenerator,
}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req);

    cleanupRateLimitBucket(key, now);

    const bucket =
      rateLimitBuckets.get(key) || {
        count: 0,
        resetAt: now + windowMs,
      };

    bucket.count += 1;
    rateLimitBuckets.set(key, bucket);

    if (bucket.count > max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000)
      );

      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message });
    }

    return next();
  };
}

function getClientIp(req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "");
  return (
    forwardedFor.split(",")[0].trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeTokenPrefix(value) {
  return typeof value === "string" ? value.trim().slice(0, 16) : "";
}

const sensitiveAccountChangeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many account security attempts. Please wait and try again.",
  keyGenerator: (req) =>
    [
      req.route?.path || req.path,
      getClientIp(req),
      req.user?.userId || "anonymous",
      normalizeEmail(req.body?.newEmail),
    ].join(":"),
});

const tokenConfirmLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: "Too many confirmation attempts. Please wait and try again.",
  keyGenerator: (req) =>
    [
      req.route?.path || req.path,
      getClientIp(req),
      normalizeTokenPrefix(req.body?.token),
    ].join(":"),
});

async function verifyAppleIdentityToken(identityToken) {
  if (!identityToken || typeof identityToken !== "string") {
    throw new Error("Apple identity token is required.");
  }

  const decoded = jwt.decode(identityToken, { complete: true });
  const keyId = decoded?.header?.kid;
  if (!keyId) {
    throw new Error("Apple identity token is invalid.");
  }

  const response = await fetch("https://appleid.apple.com/auth/keys");
  if (!response.ok) {
    throw new Error("Could not load Apple sign-in keys.");
  }

  const data = await response.json();
  const jwk = (data.keys || []).find((key) => key.kid === keyId);
  if (!jwk) {
    throw new Error("Apple sign-in key was not found.");
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const audience =
    process.env.APPLE_BUNDLE_ID ||
    process.env.EXPO_PUBLIC_APPLE_CLIENT_ID ||
    "com.rachellauren.summitscene";

  return jwt.verify(identityToken, publicKey, {
    algorithms: ["RS256"],
    issuer: "https://appleid.apple.com",
    audience,
  });
}

function normalizeAppleName(fullName = {}) {
  const parts = [
    fullName.givenName,
    fullName.middleName,
    fullName.familyName,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return parts.length ? parts.join(" ") : "";
}

function isProviderEmailVerified(value) {
  return value === true || value === "true";
}

async function verifyGoogleIdentityToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Google ID token is required.");
  }

  const decoded = jwt.decode(idToken, { complete: true });
  const keyId = decoded?.header?.kid;
  if (!keyId) {
    throw new Error("Google ID token is invalid.");
  }

  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok) {
    throw new Error("Could not load Google sign-in keys.");
  }

  const data = await response.json();
  const jwk = (data.keys || []).find((key) => key.kid === keyId);
  if (!jwk) {
    throw new Error("Google sign-in key was not found.");
  }

  const audience =
    process.env.GOOGLE_WEB_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!audience) {
    throw new Error("Google sign-in is not configured on the server.");
  }

  const payload = jwt.verify(
    idToken,
    crypto.createPublicKey({ key: jwk, format: "jwk" }),
    {
      algorithms: ["RS256"],
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience,
    }
  );

  if (!payload.email_verified) {
    throw new Error("Google account email is not verified.");
  }

  return payload;
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

router.post("/apple", async (req, res) => {
  try {
    const { identityToken, fullName, acceptedAgeTerms } = req.body || {};

    if (acceptedAgeTerms !== true) {
      return res.status(400).json({
        message:
          "You must confirm you are at least 18 years old to create a Summit Scene account.",
      });
    }

    const appleProfile = await verifyAppleIdentityToken(identityToken);
    const appleUserId = appleProfile.sub;
    const email = String(appleProfile.email || "").trim().toLowerCase();
    const appleEmailVerified = isProviderEmailVerified(
      appleProfile.email_verified
    );

    if (!appleUserId) {
      return res.status(400).json({ message: "Apple account was not found." });
    }

    let user = await User.findOne({
      "socialAccounts.provider": "apple",
      "socialAccounts.providerUserId": appleUserId,
    });

    if (!user && email && appleEmailVerified) {
      user = await User.findOne({ email });
    }

    let isNewUser = false;

    if (!user) {
      if (!email) {
        return res.status(400).json({
          message:
            "Apple did not share an email address. Please use email signup.",
        });
      }

      const fallbackPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(fallbackPassword, 10);
      const displayName =
        normalizeAppleName(fullName) ||
        email.split("@")[0] ||
        "Summit Scene member";

      user = await User.create({
        email,
        passwordHash,
        name: normalizePublicName(displayName),
        role: "local",
        emailVerified: appleEmailVerified,
        emailVerifiedAt: appleEmailVerified ? new Date() : undefined,
        onboardingCompleted: false,
        socialAccounts: [
          {
            provider: "apple",
            providerUserId: appleUserId,
            handle: email,
            verified: true,
            connectedAt: new Date(),
          },
        ],
      });
      isNewUser = true;
    } else {
      const accounts = Array.isArray(user.socialAccounts)
        ? user.socialAccounts
        : [];
      const appleAccountIndex = accounts.findIndex(
        (account) => account.provider === "apple"
      );
      const appleAccount = {
        provider: "apple",
        providerUserId: appleUserId,
        handle: email || user.email,
        verified: true,
        connectedAt:
          appleAccountIndex >= 0
            ? accounts[appleAccountIndex].connectedAt || new Date()
            : new Date(),
      };

      if (appleAccountIndex >= 0) {
        accounts[appleAccountIndex] = {
          ...accounts[appleAccountIndex],
          ...appleAccount,
        };
      } else {
        accounts.push(appleAccount);
      }

      user.socialAccounts = accounts;
      if (appleEmailVerified) {
        user.emailVerified = true;
        user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      }
      await user.save();
    }

    return res.json({
      token: createToken(user),
      user: buildSafeUser(user),
      isNewUser,
      authProvider: "apple",
    });
  } catch (error) {
    console.error("Error in POST /api/auth/apple:", error);
    return res.status(401).json({
      message: error.message || "Could not sign in with Apple.",
    });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { idToken, acceptedAgeTerms } = req.body || {};

    if (acceptedAgeTerms !== true) {
      return res.status(400).json({
        message:
          "You must confirm you are at least 18 years old to create a Summit Scene account.",
      });
    }

    const googleProfile = await verifyGoogleIdentityToken(idToken);
    const googleUserId = googleProfile.sub;
    const email = String(googleProfile.email || "").trim().toLowerCase();

    if (!googleUserId || !email) {
      return res.status(400).json({ message: "Google account was not found." });
    }

    let user = await User.findOne({
      "socialAccounts.provider": "google",
      "socialAccounts.providerUserId": googleUserId,
    });

    if (!user) {
      user = await User.findOne({ email });
    }

    let isNewUser = false;

    if (!user) {
      const fallbackPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(fallbackPassword, 10);
      const displayName =
        normalizePublicName(googleProfile.name) ||
        email.split("@")[0] ||
        "Summit Scene member";

      user = await User.create({
        email,
        passwordHash,
        name: displayName,
        role: "local",
        emailVerified: true,
        emailVerifiedAt: new Date(),
        onboardingCompleted: false,
        profileImageUrl: googleProfile.picture || "",
        socialAccounts: [
          {
            provider: "google",
            providerUserId: googleUserId,
            handle: email,
            verified: true,
            connectedAt: new Date(),
            profileImageUrl: googleProfile.picture || "",
          },
        ],
      });
      isNewUser = true;
    } else {
      const accounts = Array.isArray(user.socialAccounts)
        ? user.socialAccounts
        : [];
      const googleAccountIndex = accounts.findIndex(
        (account) => account.provider === "google"
      );
      const googleAccount = {
        provider: "google",
        providerUserId: googleUserId,
        handle: email || user.email,
        verified: true,
        connectedAt:
          googleAccountIndex >= 0
            ? accounts[googleAccountIndex].connectedAt || new Date()
            : new Date(),
        profileImageUrl: googleProfile.picture || "",
      };

      if (googleAccountIndex >= 0) {
        accounts[googleAccountIndex] = {
          ...accounts[googleAccountIndex],
          ...googleAccount,
        };
      } else {
        accounts.push(googleAccount);
      }

      user.socialAccounts = accounts;
      user.emailVerified = true;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      if (!user.profileImageUrl && googleProfile.picture) {
        user.profileImageUrl = googleProfile.picture;
      }
      await user.save();
    }

    return res.json({
      token: createToken(user),
      user: buildSafeUser(user),
      isNewUser,
      authProvider: "google",
    });
  } catch (error) {
    console.error("Error in POST /api/auth/google:", error);
    return res.status(401).json({
      message: error.message || "Could not sign in with Google.",
    });
  }
});

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
      const hasLegacyBusinessType =
        typeof req.body?.lookingFor === "string" &&
        req.body.lookingFor.trim().length > 0;
      const hasBusinessCategories =
        Array.isArray(req.body?.interests) &&
        req.body.interests.some(
          (interest) =>
            typeof interest === "string" && interest.trim().length > 0
        );
      const hasDescription =
        typeof req.body?.bio === "string" && req.body.bio.trim().length > 0;
      const hasTown =
        (typeof req.body?.town === "string" && req.body.town.trim().length > 0) ||
        (Array.isArray(req.body?.towns) &&
          req.body.towns.some(
            (town) => typeof town === "string" && town.trim().length > 0
          ));
      const hasSocialProof =
        Array.isArray(req.body?.socialAccounts) &&
        req.body.socialAccounts.some(
          (account) =>
            account &&
            typeof account === "object" &&
            ((typeof account.handle === "string" &&
              account.handle.trim().length > 0) ||
              (typeof account.url === "string" &&
                account.url.trim().length > 0))
        );
      const hasProofLink =
        (typeof req.body?.website === "string" &&
          req.body.website.trim().length > 0) ||
        (typeof req.body?.instagram === "string" &&
          req.body.instagram.trim().length > 0) ||
        (typeof req.body?.facebook === "string" &&
          req.body.facebook.trim().length > 0) ||
        (typeof req.body?.googleBusinessUrl === "string" &&
          req.body.googleBusinessUrl.trim().length > 0) ||
        hasSocialProof;

      if (
        !hasTown ||
        (!hasBusinessCategories && !hasLegacyBusinessType) ||
        !hasDescription ||
        !hasProofLink
      ) {
        return res.status(400).json({
          message:
            "Business profile requests require a town, business categories or tags, short description, and one proof link or connected social profile.",
        });
      }
    }

    // Hash password using bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const businessVerificationStatus =
      finalRole === "business" ? "pending" : "none";

    const profileUpdates = buildProfileUpdates(req.body);
    const moderationIssue = findContentModerationIssue({
      name: normalizedName,
      bio: profileUpdates.bio,
      lookingFor: profileUpdates.lookingFor,
      originallyFrom: profileUpdates.originallyFrom,
    });
    if (moderationIssue) {
      return res.status(400).json({ message: moderationIssue.message });
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

    if (error?.name === "ValidationError") {
      const firstError = Object.values(error.errors || {})[0];
      return res.status(400).json({
        message:
          firstError?.message ||
          "Some profile details are too long or invalid. Please review your information and try again.",
      });
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

    user.lastActiveAt = new Date();
    await user.save();

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

router.post("/reset-password", tokenConfirmLimiter, async (req, res) => {
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

    await sendEmailSafely(() =>
      sendPasswordChangedSecurityAlert({
        to: user.email,
        name: user.name,
      })
    );

    res.json({ message: "Password reset successful." });
  } catch (error) {
    console.error("Error in POST /api/auth/reset-password:", error);
    res.status(500).json({ message: "Server error resetting password." });
  }
});

router.post(
  "/change-password",
  authMiddleware,
  sensitiveAccountChangeLimiter,
  async (req, res) => {
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

    await sendEmailSafely(() =>
      sendPasswordChangedSecurityAlert({
        to: user.email,
        name: user.name,
      })
    );

    res.json({ message: "Password changed." });
  } catch (error) {
    console.error("Error in POST /api/auth/change-password:", error);
    res.status(500).json({ message: "Server error changing password." });
  }
});

router.post(
  "/request-email-change",
  authMiddleware,
  sensitiveAccountChangeLimiter,
  async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body || {};
    const normalizedEmail = normalizeEmail(newEmail);

    if (!normalizedEmail || !currentPassword) {
      return res
        .status(400)
        .json({ message: "New email and current password are required." });
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email address." });
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
    await sendEmailSafely(() =>
      sendEmailChangeRequestedSecurityAlert({
        to: user.email,
        name: user.name,
        newEmail: normalizedEmail,
      })
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

router.post("/confirm-email-change", tokenConfirmLimiter, async (req, res) => {
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

    const oldEmail = user.email;
    const newEmail = user.pendingEmail;

    user.email = newEmail;
    user.pendingEmail = undefined;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.pendingEmailVerificationTokenHash = undefined;
    user.pendingEmailVerificationExpiresAt = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    await sendEmailSafely(() =>
      sendEmailChangedSecurityAlert({
        to: oldEmail,
        name: user.name,
        newEmail,
      })
    );

    res.json({
      message: "Email changed. Please log in again with your new email.",
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

    user.lastActiveAt = new Date();
    await user.save();

    res.json({ user: buildSafeUser(user) });
  } catch (error) {
    console.error("Error in GET /api/auth/me:", error);
    res.status(500).json({ message: "Server error while fetching user." });
  }
});

export default router;

