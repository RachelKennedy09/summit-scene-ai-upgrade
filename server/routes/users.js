// server/routes/users.js
// User-related routes (profile updates, safety tools, and admin review)
//  - Allow logged-in users to update their own profile fields
//
// All routes in this file:
//  - Require a valid JWT via authMiddleware
//  - Use req.user.userId to identify the current user

import express from "express";
import authMiddleware from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import User from "../models/User.js";
import BuddyPost from "../models/BuddyPost.js";
import CommunityPost from "../models/CommunityPost.js";
import Event from "../models/Event.js";
import EventPreference from "../models/EventPreference.js";
import Report from "../models/Report.js";
import AppNotification from "../models/AppNotification.js";
import PushToken from "../models/PushToken.js";
import { sendModerationReportNotification } from "../services/emailService.js";
import { buildProfileUpdates, buildSafeUser } from "../utils/userProfile.js";
import { findContentModerationIssue } from "../utils/contentModeration.js";
import { GENERATED_TEST_USER_QUERY } from "../utils/generatedTestDataCleanup.js";

function normalizePublicName(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

const router = express.Router();

const BUSINESS_REVIEW_FIELDS =
  "name email role businessVerificationStatus businessVerificationRequestedAt businessVerifiedAt avatarKey profileImageUrl town towns userType bio interests businessVibeTags lookingFor instagram facebook website googleBusinessUrl phone socialAccounts createdAt";

function getAggregateCount(result, key = "count") {
  return Number(result?.[0]?.[key] || 0);
}

const REAL_USER_QUERY = GENERATED_TEST_USER_QUERY.$or?.length
  ? { $nor: GENERATED_TEST_USER_QUERY.$or }
  : {};

function realUserQuery(query = {}) {
  return { ...REAL_USER_QUERY, ...query };
}

/* -------------------------------------------
   PATCH /api/users/revert-to-local
   AUTH: required
   - Temporary self-serve testing path for switching a business profile back to
     a community/local profile.
------------------------------------------- */
router.patch("/revert-to-local", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.role = "local";
    user.businessVerificationStatus = "none";
    user.businessVerificationRequestedAt = undefined;
    user.businessVerifiedAt = undefined;
    await user.save();

    return res.json({
      message: "Account switched back to community profile.",
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Error reverting to local profile:", error);
    res
      .status(500)
      .json({ message: "Server error while switching back to community profile." });
  }
});

router.get("/admin/dashboard-stats", authMiddleware, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalDatabaseUsers,
      generatedTestUsers,
      newUsersThisWeek,
      activeUsersThisWeek,
      totalBusinesses,
      newBusinessesThisMonth,
      totalEventsPosted,
      eventsPostedThisWeek,
      totalCommunityPosts,
      totalBuddyPosts,
      communityEngagement,
      buddyEngagement,
      banffUsers,
      canmoreUsers,
      lakeLouiseUsers,
      openReports,
      pendingBusinesses,
    ] = await Promise.all([
      User.countDocuments(REAL_USER_QUERY),
      User.countDocuments({}),
      User.countDocuments(GENERATED_TEST_USER_QUERY),
      User.countDocuments(realUserQuery({ createdAt: { $gte: weekStart } })),
      User.countDocuments({
        ...REAL_USER_QUERY,
        $or: [
          { lastActiveAt: { $gte: weekStart } },
          { updatedAt: { $gte: weekStart } },
        ],
      }),
      User.countDocuments(realUserQuery({ role: "business" })),
      User.countDocuments(realUserQuery({
        role: "business",
        createdAt: { $gte: monthStart },
      })),
      Event.countDocuments({}),
      Event.countDocuments({ createdAt: { $gte: weekStart } }),
      CommunityPost.countDocuments({}),
      BuddyPost.countDocuments({}),
      CommunityPost.aggregate([
        {
          $group: {
            _id: null,
            replies: { $sum: { $size: { $ifNull: ["$replies", []] } } },
            likes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
          },
        },
      ]),
      BuddyPost.aggregate([
        {
          $project: {
            replies: { $ifNull: ["$replies", []] },
          },
        },
        {
          $group: {
            _id: null,
            topLevelReplies: { $sum: { $size: "$replies" } },
            nestedReplies: {
              $sum: {
                $sum: {
                  $map: {
                    input: "$replies",
                    as: "reply",
                    in: { $size: { $ifNull: ["$$reply.replies", []] } },
                  },
                },
              },
            },
            replyLikes: {
              $sum: {
                $sum: {
                  $map: {
                    input: "$replies",
                    as: "reply",
                    in: { $size: { $ifNull: ["$$reply.likes", []] } },
                  },
                },
              },
            },
            nestedReplyLikes: {
              $sum: {
                $sum: {
                  $map: {
                    input: "$replies",
                    as: "reply",
                    in: {
                      $sum: {
                        $map: {
                          input: { $ifNull: ["$$reply.replies", []] },
                          as: "childReply",
                          in: {
                            $size: { $ifNull: ["$$childReply.likes", []] },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ]),
      User.countDocuments(realUserQuery({ town: "Banff" })),
      User.countDocuments(realUserQuery({ town: "Canmore" })),
      User.countDocuments(realUserQuery({ town: { $in: ["Lake Louise", "LL"] } })),
      Report.countDocuments({ status: "open" }),
      User.countDocuments(realUserQuery({
        role: "business",
        businessVerificationStatus: "pending",
      })),
    ]);

    const communityReplies = getAggregateCount(communityEngagement, "replies");
    const communityLikes = getAggregateCount(communityEngagement, "likes");
    const buddyReplies =
      getAggregateCount(buddyEngagement, "topLevelReplies") +
      getAggregateCount(buddyEngagement, "nestedReplies");
    const buddyLikes =
      getAggregateCount(buddyEngagement, "replyLikes") +
      getAggregateCount(buddyEngagement, "nestedReplyLikes");

    return res.json({
      totalUsers,
      totalDatabaseUsers,
      generatedTestUsers,
      newUsersThisWeek,
      activeUsersThisWeek,
      totalBusinesses,
      newBusinessesThisMonth,
      totalEventsPosted,
      eventsPostedThisWeek,
      totalCommunityPosts: totalCommunityPosts + totalBuddyPosts,
      replies: communityReplies + buddyReplies,
      likes: communityLikes + buddyLikes,
      locations: {
        banffUsers,
        canmoreUsers,
        lakeLouiseUsers,
      },
      openReports,
      pendingBusinesses,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Error loading admin dashboard stats:", error);
    return res
      .status(500)
      .json({ message: "Server error while loading admin dashboard stats." });
  }
});

router.get("/admin/business-requests", authMiddleware, isAdmin, async (req, res) => {
  try {
    const status = ["pending", "verified", "rejected"].includes(req.query?.status)
      ? req.query.status
      : "pending";

    const users = await User.find({
      role: "business",
      businessVerificationStatus: status,
    })
      .select(BUSINESS_REVIEW_FIELDS)
      .sort({ businessVerificationRequestedAt: -1, createdAt: -1 })
      .limit(100);

    return res.json(users.map(buildSafeUser));
  } catch (error) {
    console.error("Error loading business requests:", error);
    return res
      .status(500)
      .json({ message: "Server error while loading business requests." });
  }
});

router.patch(
  "/admin/business-requests/:id",
  authMiddleware,
  isAdmin,
  async (req, res) => {
    try {
      const status = req.body?.status;
      if (!["verified", "rejected", "pending"].includes(status)) {
        return res
          .status(400)
          .json({ message: "Invalid business verification status." });
      }

      const user = await User.findById(req.params.id);
      if (!user || user.role !== "business") {
        return res.status(404).json({ message: "Business profile not found." });
      }

      user.businessVerificationStatus = status;
      user.businessVerifiedAt = status === "verified" ? new Date() : undefined;
      if (!user.businessVerificationRequestedAt) {
        user.businessVerificationRequestedAt = new Date();
      }

      await user.save();

      return res.json({
        message:
          status === "verified"
            ? "Verified Business approved."
            : status === "rejected"
              ? "Organizer profile rejected."
              : "Organizer profile moved back to pending review.",
        user: buildSafeUser(user),
      });
    } catch (error) {
      console.error("Error updating business request:", error);
      return res.status(500).json({
        message: "Server error while updating business request.",
      });
    }
  }
);

router.get("/admin/admins", authMiddleware, isAdmin, async (req, res) => {
  try {
    const admins = await User.find({ isAdmin: true })
      .select("name email role isAdmin createdAt")
      .sort({ email: 1 });

    return res.json(admins.map(buildSafeUser));
  } catch (error) {
    console.error("Error loading admins:", error);
    return res
      .status(500)
      .json({ message: "Server error while loading admin accounts." });
  }
});

router.patch("/admin/admins", authMiddleware, isAdmin, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const makeAdmin = req.body?.isAdmin !== false;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "A valid email is required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message:
          "No account exists with that email yet. Ask them to sign up first.",
      });
    }

    user.isAdmin = makeAdmin;
    await user.save();

    return res.json({
      message: makeAdmin ? "Admin access granted." : "Admin access removed.",
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Error updating admin account:", error);
    return res
      .status(500)
      .json({ message: "Server error while updating admin access." });
  }
});

router.patch("/me/safety-tips-seen", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.hasSeenSafetyTips = true;
    await user.save();

    return res.json({
      message: "Safety tips marked as seen.",
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Error marking safety tips seen:", error);
    return res
      .status(500)
      .json({ message: "Server error while saving safety tips state." });
  }
});

/* -------------------------------------------
   POST /api/users/:id/block
   AUTH: required
   - Block another user. Their posts/replies are hidden from the blocker.
------------------------------------------- */
router.post("/:id/block", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const targetUserId = req.params.id;

    if (userId === targetUserId) {
      return res.status(400).json({ message: "You cannot block yourself." });
    }

    const [user, targetUser] = await Promise.all([
      User.findById(userId),
      User.findById(targetUserId).select("_id name email"),
    ]);

    if (!user || !targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const alreadyBlocked = (user.blockedUsers || []).some(
      (id) => id.toString() === targetUserId
    );

    if (!alreadyBlocked) {
      user.blockedUsers.push(targetUserId);
      await user.save();

      const report = await Report.create({
        targetType: "user",
        targetId: targetUserId,
        parentType: "user",
        parentId: targetUserId,
        reason: "harassment",
        details: "User blocked from the app. Review for abusive behavior.",
        reporter: userId,
      });

      sendModerationReportNotification({
        report,
        reporter: user,
        targetUser,
        source: "block",
      }).catch((notificationError) => {
        console.warn(
          "Block moderation notification failed:",
          notificationError.message
        );
      });
    }

    return res.json({
      message: "User blocked and reported for moderation review.",
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Error blocking user:", error);
    return res.status(500).json({ message: "Server error while blocking user." });
  }
});

router.delete("/:id/block", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const targetUserId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.blockedUsers = (user.blockedUsers || []).filter(
      (id) => id.toString() !== targetUserId
    );
    await user.save();

    return res.json({
      message: "User unblocked.",
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Error unblocking user:", error);
    return res.status(500).json({ message: "Server error while unblocking user." });
  }
});

router.get("/me/blocked-users", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate(
      "blockedUsers",
      "name role businessVerificationStatus avatarKey profileImageUrl town towns userType languages originallyFrom interests businessVibeTags skillLevel socialAccounts bio lookingFor instagram facebook website googleBusinessUrl phone createdAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ blockedUsers: user.blockedUsers || [] });
  } catch (error) {
    console.error("Error loading blocked users:", error);
    return res
      .status(500)
      .json({ message: "Server error while loading blocked users." });
  }
});

/* -------------------------------------------
   DELETE /api/users/me
   AUTH: required
   - Permanently delete the logged-in account.
   - Removes user-owned posts/events and clears user references from shared data.
------------------------------------------- */
router.delete("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const ownedEvents = await Event.find({ createdBy: userId }).select("_id");
    const ownedEventIds = ownedEvents.map((event) => event._id);

    await Promise.all([
      EventPreference.deleteMany({
        $or: [{ userId }, { eventId: { $in: ownedEventIds } }],
      }),
      Event.deleteMany({ createdBy: userId }),
      Event.updateMany(
        { attendees: userId },
        { $pull: { attendees: userId } }
      ),
      CommunityPost.deleteMany({ user: userId }),
      CommunityPost.updateMany(
        {},
        {
          $pull: {
            replies: { user: userId },
            likes: userId,
          },
        }
      ),
      BuddyPost.deleteMany({ createdBy: userId }),
      BuddyPost.updateMany(
        {},
        {
          $pull: {
            interestedUsers: userId,
            replies: { createdBy: userId },
          },
        }
      ),
      User.updateMany(
        { blockedUsers: userId },
        { $pull: { blockedUsers: userId } }
      ),
      Report.deleteMany({
        $or: [
          { reporter: userId },
          { reviewedBy: userId },
          { targetType: "user", targetId: userId },
          { targetType: "event", targetId: { $in: ownedEventIds } },
          { parentType: "event", parentId: { $in: ownedEventIds } },
        ],
      }),
      AppNotification.deleteMany({
        $or: [{ recipient: userId }, { actor: userId }],
      }),
      PushToken.deleteMany({ user: userId }),
    ]);

    await User.deleteOne({ _id: userId });

    return res.json({ message: "Account deleted." });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res
      .status(500)
      .json({ message: "Server error while deleting account." });
  }
});

/* -------------------------------------------
   PATCH /api/users/me
   AUTH: required (must be logged in)
   - Update the logged-in user's profile fields:
     name, town, towns, userType, languages, interests, skillLevel, socialAccounts,
     bio, lookingFor, instagram, website, phone, avatarKey
   - Only updates fields that are provided and of the correct type.
   - Trims strings before saving.
   - Special handling for avatarKey:
       * If avatarKey exists in body:
           - If null → clear avatar
           - If string → set/replace avatarKey
------------------------------------------- */
router.patch("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const updates = buildProfileUpdates(req.body);

    if (updates.name) {
      updates.name = normalizePublicName(updates.name);
    }

    if (req.body?.onboardingCompleted === true) {
      updates.onboardingCompleted = true;
      updates.onboardingCompletedAt = new Date();
    }

    const moderationIssue = findContentModerationIssue({
      name: updates.name,
      bio: updates.bio,
      lookingFor: updates.lookingFor,
      originallyFrom: updates.originallyFrom,
    });
    if (moderationIssue) {
      return res.status(400).json({ message: moderationIssue.message });
    }

    // Guard: if no valid fields were provided, don't hit the DB
    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided to update." });
    }

    if (updates.socialAccounts) {
      const currentUser = await User.findById(userId).select("socialAccounts");
      if (!currentUser) {
        return res.status(404).json({ message: "User not found." });
      }

      const verifiedAccountsByProvider = new Map(
        (currentUser.socialAccounts || [])
          .filter((account) => account.verified)
          .map((account) => [account.provider, account])
      );

      updates.socialAccounts = updates.socialAccounts.map((account) => {
        const verifiedAccount = verifiedAccountsByProvider.get(
          account.provider
        );

        if (!verifiedAccount) {
          return account;
        }

        return {
          ...account,
          providerUserId: verifiedAccount.providerUserId,
          verified: true,
          connectedAt: verifiedAccount.connectedAt,
          profileImageUrl:
            verifiedAccount.profileImageUrl || account.profileImageUrl,
        };
      });
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      message: "Profile updated.",
      user: buildSafeUser(user),
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

export default router;
