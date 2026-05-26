// components/cards/CommunityPostCard.js
// Card for a single Community post.
// Shows author info, post body, likes, and a link to the author's profile.
// Also renders the replies section via CommunityRepliesSection.

import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";

import { colors } from "../../theme/colors";
import { AVATARS } from "../../assets/avatars/avatarConfig";
import TrustBadgeRow from "../common/TrustBadges";
import CommunityRepliesSection from "./CommunityRepliesSection";

// ----- Helpers -----
// Derive author identity info from post.user + top-level post fields.
// Normalizes older posts that may not have full user objects.
function getPostAuthor(post) {
  const userObj =
    typeof post.user === "object" && post.user !== null ? post.user : null;

  const name = userObj?.name || post.name || "SummitScene member";
  const email = userObj?.email || "";
  const role = userObj?.role || "local"; // e.g. "local" or "business"
  const businessVerificationStatus =
    userObj?.businessVerificationStatus || "none";

  // avatarKey maps into our premade avatar set
  const avatarKey = userObj?.avatarKey || post.avatarKey || null;
  const profileImageUrl = userObj?.profileImageUrl || post.profileImageUrl || "";

  const town = userObj?.town || post.town || "";
  const userType = userObj?.userType || "";
  const originallyFrom = userObj?.originallyFrom || "";
  const interests = userObj?.interests || [];
  const languages = userObj?.languages || [];
  const skillLevel = userObj?.skillLevel || {};
  const socialAccounts = userObj?.socialAccounts || [];
  const lookingFor = userObj?.lookingFor || "";
  const instagram = userObj?.instagram || "";
  const facebook = userObj?.facebook || "";
  const bio = userObj?.bio || "";
  const website = userObj?.website || "";
  const googleBusinessUrl = userObj?.googleBusinessUrl || "";
  const phone = userObj?.phone || "";

  return {
    _id: userObj?._id || userObj?.id || post.user || "",
    id: userObj?._id || userObj?.id || post.user || "",
    name,
    email,
    role,
    businessVerificationStatus,
    avatarKey,
    profileImageUrl,
    town,
    userType,
    originallyFrom,
    interests,
    languages,
    skillLevel,
    socialAccounts,
    lookingFor,
    instagram,
    facebook,
    bio,
    website,
    googleBusinessUrl,
    phone,
  };
}

function getAvatarSource(avatarKey, profileImageUrl) {
  if (avatarKey && AVATARS[avatarKey]) return AVATARS[avatarKey];
  if (profileImageUrl) return { uri: profileImageUrl };
  return null;
}

// ----- Main Card Component -----

export default function CommunityPostCard({
  post,
  user,
  theme,
  isReplyOpen,
  replyText,
  submittingReply,
  onToggleReply,
  onChangeReplyText,
  onSubmitReply,
  onDelete,
  onEdit,
  onToggleLike,
  onOpenProfile,
  onBlockProfile,
  onReport,
}) {
  const {
    name,
    email,
    role,
    businessVerificationStatus,
    avatarKey,
    profileImageUrl,
    town,
    userType,
    originallyFrom,
    interests,
    languages,
    skillLevel,
    socialAccounts,
    lookingFor,
    instagram,
    bio,
    website,
  } = getPostAuthor(post);

  const createdDate = post.createdAt ? new Date(post.createdAt) : null;

  // Map avatarKey -> local image asset
  const avatarSource = getAvatarSource(avatarKey, profileImageUrl);

  // Likes
  const likesArray = Array.isArray(post.likes) ? post.likes : [];
  const likesCount = likesArray.length;
  const replyCount = Array.isArray(post.replies) ? post.replies.length : 0;

  const userId = user?._id || user?.id;

  const isLikedByMe =
    !!userId &&
    likesArray.some((like) => {
      if (typeof like === "string") return like === userId;
      if (like && typeof like === "object" && like._id) {
        return like._id === userId;
      }
      return false;
    });

  // Is this post owned by the logged-in user?
  const isOwner = (() => {
    if (!userId) return false;

    const postUserId =
      typeof post.user === "string" ? post.user : post.user?._id;

    if (!postUserId) return false;
    return postUserId === userId;
  })();

  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Identity row (avatar, name, timestamp, email, town, role) */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.authorRow}>
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: theme.cardDark || colors.cardDark },
            ]}
          >
            {avatarSource ? (
              <Image source={avatarSource} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitial, { color: theme.textMain }]}>
                {name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <View style={styles.authorTextCol}>
            <Text style={[styles.authorNameText, { color: theme.textMain }]}>
              {name}
            </Text>

            {createdDate && (
              <Text style={[styles.timestampText, { color: theme.textMuted }]}>
                {createdDate.toLocaleDateString()} |{" "}
                {createdDate.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            )}

            {email ? (
              <Text
                style={[styles.authorEmailText, { color: theme.textMuted }]}
              >
                {email}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.badgeColumn}>
          <Text style={[styles.townTag, { color: theme.textMuted }]}>
            {town || "Rockies local"}
          </Text>

          {/* Role Pill  */}
          <TrustBadgeRow
            profile={{
              role,
              businessVerificationStatus,
              userType,
            }}
            theme={theme}
            compact
            align="flex-end"
          />

          {post.targetDate ? (
            <Text style={[styles.dateBadge, { color: theme.textMuted }]}>
              For: {new Date(post.targetDate).toLocaleDateString()}
            </Text>
          ) : null}

          {isOwner && (
            <Text style={[styles.ownerBadge, { color: theme.accent }]}>
              You
            </Text>
          )}
        </View>
      </View>

      {/* Title + body */}
      <Text style={[styles.sectionTitle, { color: theme.textMain }]}>
        {post.title}
      </Text>
      <Text style={[styles.sectionText, { color: theme.textMuted }]}>
        {post.body}
      </Text>

      {/* Likes */}
      <View style={styles.likesRow}>
        <Pressable
          style={[
            styles.likeButton,
            { borderColor: theme.border },
            isLikedByMe && {
              borderColor: theme.accent,
              backgroundColor: theme.accentSoft || colors.tealTint,
            },
          ]}
          onPress={onToggleLike}
        >
          <Text style={[styles.likeButtonText, { color: theme.textMain }]}>
            {isLikedByMe ? "♥ Liked" : "♡ Like"}
          </Text>
        </Pressable>

        <Text style={[styles.likesCountText, { color: theme.textMuted }]}>
          {likesCount === 0
            ? "No likes yet"
            : likesCount === 1
            ? "1 like"
            : `${likesCount} likes`}{" "}
          | {replyCount} comment{replyCount === 1 ? "" : "s"}
        </Text>
      </View>

      {/* Owner-only edit/delete buttons */}
      {isOwner && (
        <View style={styles.ownerActionsRow}>
          <Pressable
            style={[styles.editButton, { backgroundColor: theme.accent }]}
            onPress={onEdit}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            style={[
              styles.deleteButton,
              { backgroundColor: theme.accentWarm || colors.accentWarm },
            ]}
            onPress={onDelete}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      )}

      {/* Profile and safety actions */}
      <View style={styles.profileRow}>
        {!isOwner ? (
          <>
            <Pressable
              style={[styles.profileButton, { borderColor: theme.accent }]}
              onPress={() =>
                onOpenProfile &&
                onOpenProfile({
                  name,
                  _id: post.user?._id || post.user?.id || post.user || "",
                  id: post.user?._id || post.user?.id || post.user || "",
                  role,
                  town,
                  userType,
                  originallyFrom,
                  interests,
                  languages,
                  skillLevel,
                  socialAccounts,
                  avatarKey,
                  profileImageUrl,
                  lookingFor,
                  instagram,
                  facebook,
                  bio,
                  website,
                  googleBusinessUrl,
                  phone,
                  businessVerificationStatus,
                  createdAt: post.user?.createdAt,
                })
              }
            >
              <Text style={[styles.profileButtonText, { color: theme.accent }]}>
                View profile
              </Text>
            </Pressable>
            <Pressable
              style={styles.reportButton}
              onPress={() =>
                onReport?.({
                  targetType: "communityPost",
                  targetId: post._id || post.id,
                })
              }
            >
              <Text style={[styles.reportButtonText, { color: theme.textMuted }]}>
                Report
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={[styles.reportButtonText, { color: theme.textMuted }]}>
            Your post
          </Text>
        )}
      </View>

      {/* Divider before replies */}
      <View style={[styles.replyDivider, { backgroundColor: theme.border }]} />

      {/* Replies + reply composer (separate component) */}
      <CommunityRepliesSection
        replies={post.replies}
        theme={theme}
        isReplyOpen={isReplyOpen}
        replyText={replyText}
        submittingReply={submittingReply}
        onToggleReply={onToggleReply}
        onChangeReplyText={onChangeReplyText}
        onSubmitReply={onSubmitReply}
        onOpenProfile={onOpenProfile}
        onBlockProfile={onBlockProfile}
        currentUserId={userId}
        onReport={(reply) =>
          onReport?.({
            targetType: "communityReply",
            targetId: reply._id || reply.id,
            parentType: "communityPost",
            parentId: post._id || post.id,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cardDark,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textLight,
  },
  authorTextCol: {
    flexShrink: 1,
  },
  authorNameText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textLight,
  },
  authorEmailText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  timestampText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgeColumn: {
    alignItems: "flex-end",
    gap: 4,
  },
  townTag: {
    fontSize: 12,
    color: colors.textMuted,
  },
  dateBadge: {
    fontSize: 12,
    color: colors.textMuted,
  },
  ownerBadge: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textLight,
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  ownerActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  editButtonText: {
    color: colors.textLight,
    fontWeight: "600",
    fontSize: 13,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: colors.textLight,
    fontWeight: "600",
    fontSize: 13,
  },
  profileRow: {
    marginTop: 8,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  profileButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  profileButtonText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: "600",
  },
  reportButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  reportButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  replyDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 12,
    marginBottom: 8,
  },
  likesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  likeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  likeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textLight,
  },
  likesCountText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});

