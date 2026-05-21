import "dotenv/config";
import mongoose from "mongoose";

import BuddyPost from "../models/BuddyPost.js";
import CommunityPost from "../models/CommunityPost.js";
import Event from "../models/Event.js";
import EventPreference from "../models/EventPreference.js";
import Report from "../models/Report.js";
import User from "../models/User.js";

const GENERATED_TEST_USER_QUERY = {
  $or: [
    { email: /^(testuser|business|blocker|blocked)_\d+@example\.com$/i },
    {
      name: /^(Test User|Pending Business|Blocker User|Bloker User|Blocked User)\s*\d*$/i,
    },
  ],
};

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find(GENERATED_TEST_USER_QUERY)
    .select("_id email name role businessVerificationStatus")
    .lean();
  const userIds = users.map((user) => user._id);
  const ownedEvents = await Event.find({ createdBy: { $in: userIds } })
    .select("_id")
    .lean();
  const ownedEventIds = ownedEvents.map((event) => event._id);

  if (!userIds.length) {
    console.log("No generated test users found.");
    return;
  }

  const [
    deletedPreferences,
    deletedEvents,
    updatedEventAttendees,
    deletedBuddyPosts,
    updatedBuddyPosts,
    deletedLegacyCommunityPosts,
    updatedLegacyCommunityPosts,
    deletedReports,
    updatedBlockLists,
    deletedUsers,
  ] = await Promise.all([
    EventPreference.deleteMany({
      $or: [
        { userId: { $in: userIds } },
        { eventId: { $in: ownedEventIds } },
      ],
    }),
    Event.deleteMany({ createdBy: { $in: userIds } }),
    Event.updateMany(
      { attendees: { $in: userIds } },
      { $pull: { attendees: { $in: userIds } } }
    ),
    BuddyPost.deleteMany({ createdBy: { $in: userIds } }),
    BuddyPost.updateMany(
      {},
      {
        $pull: {
          interestedUsers: { $in: userIds },
          replies: { createdBy: { $in: userIds } },
        },
      }
    ),
    CommunityPost.deleteMany({ user: { $in: userIds } }),
    CommunityPost.updateMany(
      {},
      {
        $pull: {
          likes: { $in: userIds },
          replies: { user: { $in: userIds } },
        },
      }
    ),
    Report.deleteMany({
      $or: [
        { reporter: { $in: userIds } },
        { reviewedBy: { $in: userIds } },
        { targetType: "user", targetId: { $in: userIds } },
        { targetType: "event", targetId: { $in: ownedEventIds } },
        { parentType: "event", parentId: { $in: ownedEventIds } },
      ],
    }),
    User.updateMany(
      { blockedUsers: { $in: userIds } },
      { $pull: { blockedUsers: { $in: userIds } } }
    ),
    User.deleteMany({ _id: { $in: userIds } }),
  ]);

  const remaining = {
    pendingBusinesses: await User.countDocuments({
      role: "business",
      businessVerificationStatus: "pending",
    }),
    buddyPosts: await BuddyPost.countDocuments({}),
    legacyCommunityPosts: await CommunityPost.countDocuments({}),
  };

  console.log(
    JSON.stringify(
      {
        matchedUsers: users.length,
        matchedSamples: users.slice(0, 10),
        ownedEventCount: ownedEventIds.length,
        deleted: {
          eventPreferences: deletedPreferences.deletedCount,
          events: deletedEvents.deletedCount,
          eventAttendeeUpdates: updatedEventAttendees.modifiedCount,
          buddyPosts: deletedBuddyPosts.deletedCount,
          buddyPostUpdates: updatedBuddyPosts.modifiedCount,
          legacyCommunityPosts: deletedLegacyCommunityPosts.deletedCount,
          legacyCommunityUpdates: updatedLegacyCommunityPosts.modifiedCount,
          reports: deletedReports.deletedCount,
          blockListUpdates: updatedBlockLists.modifiedCount,
          users: deletedUsers.deletedCount,
        },
        remaining,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Generated test data cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
