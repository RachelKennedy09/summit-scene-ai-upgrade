import BuddyPost from "../models/BuddyPost.js";
import CommunityPost from "../models/CommunityPost.js";
import Event from "../models/Event.js";
import EventPreference from "../models/EventPreference.js";
import Report from "../models/Report.js";
import User from "../models/User.js";

export const GENERATED_TEST_USER_QUERY = {
  $or: [
    {
      email:
        /^(testuser|business|blocker|blocked|duplicate_name|reset|change|changed|delete_me|import_source)_\d+@example\.com$/i,
    },
    { email: /^(weak_password|missing_age|available)_\d+@example\.com$/i },
    { email: /@business-seed\.summitscene\.test$/i },
    { email: /@community-seed\.summitscene\.test$/i },
    { email: /@attendee-demo\.summitscene\.test$/i },
    {
      email: {
        $in: [
          "reviewer@summitscene.ca",
          "apple-review-local@summitscene.ca",
          "apple-review-organizer@summitscene.ca",
        ],
      },
    },
    {
      name: /^(Test User|Pending Business|Blocker User|Bloker User|Blocked User|Reset User|Change Email User|Delete Me|Import Source Business|Duplicate Email|Weak Password|Missing Age Agreement)\s*\d*$/i,
    },
  ],
};

export async function cleanupGeneratedTestData() {
  const users = await User.find(GENERATED_TEST_USER_QUERY)
    .select("_id email name role businessVerificationStatus")
    .lean();
  const userIds = users.map((user) => user._id);
  const ownedEvents = await Event.find({ createdBy: { $in: userIds } })
    .select("_id")
    .lean();
  const ownedEventIds = ownedEvents.map((event) => event._id);

  if (!userIds.length) {
    return {
      matchedUsers: 0,
      matchedSamples: [],
      ownedEventCount: 0,
      deleted: {},
      remaining: {
        pendingBusinesses: await User.countDocuments({
          role: "business",
          businessVerificationStatus: "pending",
        }),
        buddyPosts: await BuddyPost.countDocuments({}),
        legacyCommunityPosts: await CommunityPost.countDocuments({}),
      },
    };
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

  return {
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
    remaining: {
      pendingBusinesses: await User.countDocuments({
        role: "business",
        businessVerificationStatus: "pending",
      }),
      buddyPosts: await BuddyPost.countDocuments({}),
      legacyCommunityPosts: await CommunityPost.countDocuments({}),
    },
  };
}
