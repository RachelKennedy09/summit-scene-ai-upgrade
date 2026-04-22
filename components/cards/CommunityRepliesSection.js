// components/cards/CommunityRepliesSection.js
// Handles the "conversation" part of a community post:
// - shows existing replies
// - lets the user toggle the reply box
// - lets the user type and send a reply
// Also wires replies to the porfile modal when a reply author is tapped.

import React from "react";
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

// Map avatarKey -> local image source for replies
function getAvatarSource(avatarKey) {
  if (!avatarKey) return null;
  return AVATARS[avatarKey] || null;
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
  onOpenProfilem,
}) {
  const trimmed = replyText?.trim?.() ?? "";
  const disabled = !trimmed || submittingReply;

  return (
    <View>
      {/* Existing replies */}
      {Array.isArray(replies) && replies.length > 0 && (
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
            const replyAvatarSource = getAvatarSource(replyAvatarKey);
            const replyTown = replyUserObj?.town || "";
            const replyRole = replyUserObj?.role || "local";

            return (
              <Pressable
                key={replyKey}
                style={styles.replyRow}
                onPress={() => {
                  // Only open profile if we have a full user object
                  if (replyUserObj && onOpenProfile) {
                    onOpenProfile({
                      name: replyName,
                      role: replyRole,
                      town: replyTown,
                      avatarKey: replyAvatarKey,
                      lookingFor: replyUserObj.lookingFor || "",
                      instagram: replyUserObj.instagram || "",
                      bio: replyUserObj.bio || "",
                      website: replyUserObj.website || "",
                    });
                  }
                }}
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
                  <Text
                    style={[styles.replyBodyText, { color: theme.textMuted }]}
                  >
                    {reply.body}
                  </Text>
                </View>
              </Pressable>
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

  replyAuthor: {
    fontWeight: "600",
    color: colors.textLight,
  },

  replyBodyText: {
    fontSize: 13,
    color: colors.textMuted,
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
