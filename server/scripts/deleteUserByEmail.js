import dotenv from "dotenv";
import mongoose from "mongoose";

import BuddyPost from "../models/BuddyPost.js";
import CommunityPost from "../models/CommunityPost.js";
import Event from "../models/Event.js";
import EventPreference from "../models/EventPreference.js";
import Report from "../models/Report.js";
import User from "../models/User.js";

dotenv.config();

const email = String(process.argv[2] || "").trim().toLowerCase();

if (!email) {
  console.error("Usage: node scripts/deleteUserByEmail.js <email>");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);

const user = await User.findOne({ email }).select("_id email name role").lean();

if (!user) {
  console.log(JSON.stringify({ deleted: false, reason: "User not found", email }));
  await mongoose.disconnect();
  process.exit(0);
}

const userId = user._id;
const ownedEvents = await Event.find({ createdBy: userId }).select("_id").lean();
const ownedEventIds = ownedEvents.map((event) => event._id);

const results = await Promise.all([
  EventPreference.deleteMany({
    $or: [{ userId }, { eventId: { $in: ownedEventIds } }],
  }),
  Event.deleteMany({ createdBy: userId }),
  Event.updateMany({ attendees: userId }, { $pull: { attendees: userId } }),
  CommunityPost.deleteMany({ user: userId }),
  CommunityPost.updateMany(
    {},
    { $pull: { replies: { user: userId }, likes: userId } }
  ),
  BuddyPost.deleteMany({ createdBy: userId }),
  BuddyPost.updateMany(
    {},
    { $pull: { interestedUsers: userId, replies: { createdBy: userId } } }
  ),
  User.updateMany({ blockedUsers: userId }, { $pull: { blockedUsers: userId } }),
  Report.deleteMany({
    $or: [
      { reporter: userId },
      { reviewedBy: userId },
      { targetType: "user", targetId: userId },
      { targetType: "event", targetId: { $in: ownedEventIds } },
      { parentType: "event", parentId: { $in: ownedEventIds } },
    ],
  }),
]);

await User.deleteOne({ _id: userId });

console.log(
  JSON.stringify(
    {
      deleted: true,
      user,
      ownedEventCount: ownedEventIds.length,
      cleanupDeletedCounts: results.map((result) => result.deletedCount || 0),
      cleanupModifiedCounts: results.map((result) => result.modifiedCount || 0),
    },
    null,
    2
  )
);

await mongoose.disconnect();
