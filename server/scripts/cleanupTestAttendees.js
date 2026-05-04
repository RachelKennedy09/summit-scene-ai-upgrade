import "dotenv/config";
import mongoose from "mongoose";

import Event from "../models/Event.js";
import User from "../models/User.js";

const TEST_NAME_PATTERNS = [/^Blocker User$/i, /^Bloker User$/i, /^Blocked User$/i];
const TEST_EMAIL_PATTERNS = [/^blocker_\d+@example\.com$/i, /^blocked_\d+@example\.com$/i];

function isTestUser(user) {
  const name = String(user?.name || "").trim();
  const email = String(user?.email || "").trim();

  return (
    TEST_NAME_PATTERNS.some((pattern) => pattern.test(name)) ||
    TEST_EMAIL_PATTERNS.some((pattern) => pattern.test(email))
  );
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const testUsers = await User.find({
    $or: [
      { name: { $in: ["Blocker User", "Bloker User", "Blocked User"] } },
      { email: /^blocker_\d+@example\.com$/i },
      { email: /^blocked_\d+@example\.com$/i },
    ],
  }).select("_id name email");

  const testUserIds = testUsers.filter(isTestUser).map((user) => user._id);

  if (!testUserIds.length) {
    console.log("No test attendee users found.");
    return;
  }

  const eventUpdate = await Event.updateMany(
    { attendees: { $in: testUserIds } },
    { $pull: { attendees: { $in: testUserIds } } }
  );

  const userDelete = await User.deleteMany({ _id: { $in: testUserIds } });

  console.log("Test attendee cleanup complete.");
  console.log(`Removed from events: ${eventUpdate.modifiedCount}`);
  console.log(`Deleted test users: ${userDelete.deletedCount}`);
}

main()
  .catch((error) => {
    console.error("Test attendee cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
