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
    email: "apple-review-local@summitscene.ca",
    name: "Apple Review Local",
    role: "local",
    town: "Banff",
    userType: "local",
    bio: "Demo local account for App Review. Can browse events, save events, reply, like comments, report content, and test community features.",
    languages: ["English"],
    interests: ["Food & drink", "Wellness", "Arts & creativity"],
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

  console.log("App Review demo accounts are ready:");
  for (const demoUser of demoUsers) {
    console.log(`- ${demoUser.email}`);
  }
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log(
    "Optional admin testing: add apple-review-admin@summitscene.ca to ADMIN_EMAILS before creating that account."
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
