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
import { buildProfileUpdates, buildSafeUser } from "../utils/userProfile.js";

function normalizePublicName(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

const router = express.Router();

const BUSINESS_REVIEW_FIELDS =
  "name email role businessVerificationStatus businessVerificationRequestedAt businessVerifiedAt avatarKey profileImageUrl town userType bio lookingFor instagram facebook website googleBusinessUrl phone socialAccounts createdAt";

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
            ? "Verified Local approved."
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
      User.findById(targetUserId).select("_id"),
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
    }

    return res.json({
      message: "User blocked.",
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
      "name role businessVerificationStatus avatarKey profileImageUrl town userType languages originallyFrom interests skillLevel socialAccounts bio lookingFor instagram facebook website googleBusinessUrl phone createdAt"
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
     name, town, userType, languages, interests, skillLevel, socialAccounts,
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

