import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const DEMO_PASSWORD =
  process.env.APP_REVIEW_DEMO_PASSWORD || "SummitApple2026!";

const demoUsers = [
  {
    email: "admin@summitscene.ca",
    name: "Summit Scene Admin",
    role: "local",
    town: "Banff",
    userType: "local",
    bio: "Main admin account for Summit Scene operations and moderation.",
    languages: ["English"],
    interests: ["Food & drink", "Live music", "Tours & experiences"],
    businessVerificationStatus: "none",
    businessVerificationRequestedAt: null,
    businessVerifiedAt: null,
    isAdmin: true,
    hasSeenSafetyTips: true,
  },
  {
    email: "reviewer@summitscene.ca",
    name: "Summit Scene Reviewer",
    role: "business",
    town: "Banff",
    lookingFor: "Tours & experiences",
    bio: "App Review account for testing normal member features and verified organizer event posting flows.",
    languages: ["English"],
    interests: ["Food & drink", "Live music", "Tours & experiences"],
    instagram: "https://www.instagram.com/summitscene.ca",
    website: "https://summitscene.ca/business",
    phone: "403-555-0102",
    businessVerificationStatus: "verified",
    businessVerificationRequestedAt: new Date(),
    businessVerifiedAt: new Date(),
    isAdmin: false,
    hasSeenSafetyTips: true,
  },
  {
    email: "apple-review-local@summitscene.ca",
    name: "Apple Review Local",
    role: "local",
    town: "Banff",
    userType: "local",
    bio: "Demo local account for App Review. Can browse events, save events, reply, like comments, report content, and test community features.",
    languages: ["English"],
    interests: ["Food & drink", "Wellness", "Arts & creativity"],
    businessVerificationStatus: "none",
    businessVerificationRequestedAt: null,
    businessVerifiedAt: null,
    hasSeenSafetyTips: true,
  },
  {
    email: "apple-review-organizer@summitscene.ca",
    name: "Summit Scene Review Tours",
    role: "business",
    town: "Banff",
    lookingFor: "Tours & experiences",
    bio: "Demo verified organizer account for App Review. Used to test official event and tour creation flows.",
    instagram: "https://www.instagram.com/summitscene.ca",
    website: "https://summitscene.ca/business",
    phone: "403-555-0198",
    businessVerificationStatus: "verified",
    businessVerificationRequestedAt: new Date(),
    businessVerifiedAt: new Date(),
    hasSeenSafetyTips: true,
  },
];

async function upsertDemoUser(userSeed) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const email = userSeed.email.toLowerCase();

  await User.findOneAndUpdate(
    { email },
    {
      $set: {
        ...userSeed,
        email,
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        avatarKey: null,
        profileImageUrl: "",
      },
      $unset: {
        emailVerificationTokenHash: "",
        emailVerificationExpiresAt: "",
        pendingEmail: "",
        pendingEmailVerificationTokenHash: "",
        pendingEmailVerificationExpiresAt: "",
        passwordResetTokenHash: "",
        passwordResetExpiresAt: "",
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

async function main() {
  await connectDB();

  for (const demoUser of demoUsers) {
    await upsertDemoUser(demoUser);
  }

  const seededUsers = await User.find({
    email: { $in: demoUsers.map((demoUser) => demoUser.email) },
  })
    .select("email role isAdmin businessVerificationStatus emailVerified")
    .sort({ email: 1 })
    .lean();

  console.log("App Review demo accounts are ready:");
  for (const user of seededUsers) {
    console.log(
      `- ${user.email} | role=${user.role} | isAdmin=${Boolean(
        user.isAdmin
      )} | businessStatus=${user.businessVerificationStatus || "none"} | emailVerified=${Boolean(
        user.emailVerified
      )}`
    );
  }
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log("admin@summitscene.ca is the main admin account.");
  console.log(
    "reviewer@summitscene.ca is a verified organizer account for App Review."
  );
}

main()
  .catch((error) => {
    console.error("Failed to create App Review demo accounts:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
