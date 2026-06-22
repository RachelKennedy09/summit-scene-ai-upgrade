import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";

dotenv.config();

const targetEmail = String(process.env.TARGET_EMAIL || "")
  .trim()
  .toLowerCase();
const confirmEmail = String(process.env.CONFIRM_EMAIL || "")
  .trim()
  .toLowerCase();
const newPassword = String(process.env.NEW_PASSWORD || "");

if (!targetEmail || !confirmEmail || !newPassword) {
  console.error(
    "Usage: set TARGET_EMAIL, CONFIRM_EMAIL, and NEW_PASSWORD environment variables."
  );
  process.exit(1);
}

if (targetEmail !== confirmEmail) {
  console.error("TARGET_EMAIL and CONFIRM_EMAIL must match.");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);

const user = await User.findOne({ email: targetEmail }).select(
  "_id email role isAdmin"
);

if (!user) {
  console.log(
    JSON.stringify(
      {
        updated: false,
        reason: "User not found",
        email: targetEmail,
        database: mongoose.connection.name,
      },
      null,
      2
    )
  );
  await mongoose.disconnect();
  process.exit(0);
}

user.passwordHash = await bcrypt.hash(newPassword, 10);
user.passwordChangedAt = new Date();
user.passwordResetTokenHash = undefined;
user.passwordResetExpiresAt = undefined;

await user.save();

console.log(
  JSON.stringify(
    {
      updated: true,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      database: mongoose.connection.name,
      passwordChangedAt: user.passwordChangedAt,
    },
    null,
    2
  )
);

await mongoose.disconnect();
