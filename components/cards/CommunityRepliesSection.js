// components/cards/CommunityRepliesSection.js
// Handles the "conversation" part of a community post:
// - shows existing replies
// - lets the user toggle the reply box
// - lets the user type and send a reply
// Also wires replies to the porfile modal when a reply author is tapped.

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
} from "react-native";

import { colors } from "../../theme/colors";
import { AVATARS } from "../../assets/avatars/avatarConfig";
import TrustBadgeRow from "../common/TrustBadges";

// Map avatarKey -> local image source for replies
function getAvatarSource(avatarKey, profileImageUrl) {
  if (avatarKey && AVATARS[avatarKey]) return AVATARS[avatarKey];
  if (profileImageUrl) return { uri: profileImageUrl };
  return null;
}

export default function CommunityRepliesSection({
  replies,
  theme,
  isReplyOpen,
  replyText,
  submittingReply,
  onToggleReply,
  onChangeReplyText,
  onSubmitReply,
  onOpenProfile,
  onBlockProfile,
  onReport,
  currentUserId,
}) {
  const trimmed = replyText?.trim?.() ?? "";
  const disabled = !trimmed || submittingReply;
  const replyCount = Array.isArray(replies) ? replies.length : 0;
  const [isThreadOpen, setIsThreadOpen] = useState(false);

  useEffect(() => {
    if (replyCount === 0 && isThreadOpen) {
      setIsThreadOpen(false);
    }
  }, [isThreadOpen, replyCount]);

  return (
    <View>
      {replyCount > 0 ? (
        <Pressable
          style={styles.threadToggleButton}
          onPress={() => setIsThreadOpen((current) => !current)}
        >
          <Text style={[styles.threadToggleText, { color: theme.accent }]}>
            {isThreadOpen
              ? "Hide reply thread"
              : `Show reply thread (${replyCount})`}
          </Text>
        </Pressable>
      ) : null}

      {/* Existing replies */}
      {isThreadOpen && replyCount > 0 && (
        <View style={styles.repliesContainer}>
          {replies.map((reply) => {
            const replyCreated = reply.createdAt
              ? new Date(reply.createdAt)
              : new Date();
            const replyKey = reply._id ?? replyCreated.getTime().toString();

            const replyUserObj =
              typeof reply.user === "object" && reply.user !== null
                ? reply.user
                : null;

            const replyName = replyUserObj?.name || reply.name || "Member";

            const replyAvatarKey =
              replyUserObj?.avatarKey || reply.avatarKey || null;
            const replyProfileImageUrl =
              replyUserObj?.profileImageUrl || reply.profileImageUrl || "";
            const replyAvatarSource = getAvatarSource(
              replyAvatarKey,
              replyProfileImageUrl
            );
            const replyTown = replyUserObj?.town || "";
            const replyRole = replyUserObj?.role || "local";
            const replyUserId = replyUserObj?._id || replyUserObj?.id || "";
            const isOwnReply =
              Boolean(currentUserId) &&
              replyUserId?.toString() === currentUserId?.toString();
            const replyProfile = replyUserObj
              ? {
                  name: replyName,
                  _id: replyUserId,
                  id: replyUserId,
                  role: replyRole,
                  town: replyTown,
                  userType: replyUserObj.userType || "",
                  originallyFrom: replyUserObj.originallyFrom || "",
                  interests: replyUserObj.interests || [],
                  languages: replyUserObj.languages || [],
                  skillLevel: replyUserObj.skillLevel || {},
                  socialAccounts: replyUserObj.socialAccounts || [],
                  avatarKey: replyAvatarKey,
                  profileImageUrl: replyProfileImageUrl,
                  lookingFor: replyUserObj.lookingFor || "",
                  instagram: replyUserObj.instagram || "",
                  facebook: replyUserObj.facebook || "",
                  bio: replyUserObj.bio || "",
                  website: replyUserObj.website || "",
                  googleBusinessUrl: replyUserObj.googleBusinessUrl || "",
                  phone: replyUserObj.phone || "",
                  createdAt: replyUserObj.createdAt,
                  businessVerificationStatus:
                    replyUserObj.businessVerificationStatus || "none",
                }
              : null;

            return (
              <View
                key={replyKey}
                style={styles.replyRow}
              >
                <View
                  style={[
                    styles.replyAvatar,
                    {
                      backgroundColor: theme.cardDark || colors.cardDark,
                    },
                  ]}
                >
                  {replyAvatarSource ? (
                    <Image
                      source={replyAvatarSource}
                      style={styles.replyAvatarImage}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.replyAvatarInitial,
                        { color: theme.textMain },
                      ]}
                    >
                      {replyName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.replyContent}>
                  <Text style={[styles.replyMeta, { color: theme.textMuted }]}>
                    <Text
                      style={[styles.replyAuthor, { color: theme.textMain }]}
                    >
                      {replyName}
                    </Text>{" "}
                    •{" "}
                    {replyCreated.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                  {replyTown ? (
                    <Text
                      style={[styles.replyTownMeta, { color: theme.textMuted }]}
                    >
                      {replyTown}
                    </Text>
                  ) : null}
                  {replyProfile ? (
                    <View style={styles.replyBadgeRow}>
                      <TrustBadgeRow profile={replyProfile} theme={theme} compact />
                    </View>
                  ) : null}
                  <Text
                    style={[styles.replyBodyText, { color: theme.textMuted }]}
                  >
                    {reply.body}
                  </Text>
                  <View style={styles.replySafetyRow}>
                    {replyProfile && !isOwnReply ? (
                      <Pressable
                        style={[
                          styles.replyMiniButton,
                          { borderColor: theme.accent },
                        ]}
                        onPress={() => onOpenProfile?.(replyProfile)}
                      >
                        <Text
                          style={[
                            styles.replyMiniButtonText,
                            { color: theme.accent },
                          ]}
                        >
                          View Profile
                        </Text>
                      </Pressable>
                    ) : null}
                    {replyProfile && !isOwnReply ? (
                      <Pressable
                        style={[styles.replyMiniButton, { borderColor: theme.border }]}
                        onPress={() => onBlockProfile?.(replyProfile)}
                      >
                        <Text
                          style={[
                            styles.reportReplyText,
                            { color: theme.textMuted },
                          ]}
                        >
                          Block user
                        </Text>
                      </Pressable>
                    ) : null}
                    {isOwnReply ? (
                      <Text
                        style={[
                          styles.reportReplyText,
                          { color: theme.textMuted },
                        ]}
                      >
                        Your reply
                      </Text>
                    ) : (
                      <Pressable
                        style={styles.reportReplyButton}
                        onPress={() => onReport?.(reply)}
                      >
                        <Text
                          style={[
                            styles.reportReplyText,
                            { color: theme.textMuted },
                          ]}
                        >
                          Report reply
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Reply toggle button */}
      <View style={styles.replyActionsRow}>
        <Pressable style={styles.replyButton} onPress={onToggleReply}>
          <Text style={[styles.replyButtonText, { color: theme.accent }]}>
            {isReplyOpen ? "Cancel" : "Reply"}
          </Text>
        </Pressable>
      </View>

      {/* Reply input + Send button */}
      {isReplyOpen && (
        <View
          style={[
            styles.replyInputContainer,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
          ]}
        >
          <TextInput
            style={[styles.replyInput, { color: theme.textMain }]}
            value={replyText}
            onChangeText={onChangeReplyText}
            placeholder="Write a reply..."
            placeholderTextColor={theme.textMuted}
            multiline
          />
          <Pressable
            style={[
              styles.sendReplyButton,
              { backgroundColor: theme.accent },
              disabled && styles.sendReplyButtonDisabled,
            ]}
            onPress={onSubmitReply}
            disabled={disabled}
          >
            <Text style={styles.sendReplyButtonText}>
              {submittingReply ? "Sending..." : "Send"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Local styles just for replies UI.
// These were previously in CommunityPostCard and moved here
// to keep the card file shorter and more focused.
const styles = StyleSheet.create({
  repliesContainer: {
    gap: 8,
    marginBottom: 8,
  },
  threadToggleButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 4,
  },
  threadToggleText: {
    fontSize: 13,
    fontWeight: "700",
  },

  replyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  replyAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cardDark,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  replyAvatarImage: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },

  replyAvatarInitial: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textLight,
  },

  replyContent: {
    flex: 1,
  },

  replyMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },

  replyTownMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  replyBadgeRow: {
    marginBottom: 4,
  },

  replyAuthor: {
    fontWeight: "600",
    color: colors.textLight,
  },

  replyBodyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  reportReplyButton: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  reportReplyText: {
    fontSize: 11,
    fontWeight: "700",
  },
  replySafetyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  replyMiniButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  replyMiniButtonText: {
    fontSize: 11,
    fontWeight: "700",
  },

  replyActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 4,
  },

  replyButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  replyButtonText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: "600",
  },

  replyInputContainer: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primary,
    padding: 8,
    gap: 6,
  },

  replyInput: {
    minHeight: 40,
    maxHeight: 120,
    color: colors.textLight,
    fontSize: 13,
  },

  sendReplyButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },

  sendReplyButtonDisabled: {
    opacity: 0.6,
  },

  sendReplyButtonText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: "600",
  },
});
