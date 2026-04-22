// screens/community/MemberProfileModal.js
// Reusable modal for viewing a member's profile from the Community tab.
//
// Used when you tap a user's avatar or name on posts/replies.
// Shows:
//   - Avatar (prefers avatarKey → avatarUrl → initial)
//   - Name, town, role (Local vs Business host)
//   - Bio, "Looking for" / Business type, Instagram, Website (business only)

import React from "react";
import { View, Text, StyleSheet, Pressable, Modal, Image } from "react-native";
import { colors } from "../../theme/colors"; // fallback palette
import { AVATARS } from "../../assets/avatars/avatarConfig";

export default function MemberProfileModal({ visible, user, theme, onClose }) {
  // If not visible or we don't have a user, don't render anything.
  if (!visible || !user) return null;

  // Avatar resolution logic:
  // 1) If user.avatarKey exists in our AVATARS map → use that pre-made avatar.
  // 2) Else if user.avatarUrl exists → use remote image URL.
  // 3) Else → show a simple initial inside a colored circle.

  const avatarSource =
    user.avatarKey && AVATARS[user.avatarKey]
      ? AVATARS[user.avatarKey]
      : user.avatarUrl
      ? { uri: user.avatarUrl }
      : null;

  const displayName = user.name || "SummitScene member";
  const initial = (displayName && displayName.charAt(0).toUpperCase()) || "M";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.profileModalOverlay}>
        <View
          style={[
            styles.profileModalCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Header: title + Close button */}
          <View className="header-row" style={styles.profileModalHeader}>
            <Text
              style={[
                styles.profileModalTitle,
                { color: theme.textMain || theme.text },
              ]}
            >
              Member Profile
            </Text>
            <Pressable onPress={onClose}>
              <Text
                style={[
                  styles.profileModalClose,
                  { color: theme.accent || colors.accent },
                ]}
              >
                Close
              </Text>
            </Pressable>
          </View>

          {/* Top row: Avatar + name / town / role */}
          <View style={styles.profileTopRow}>
            <View
              style={[
                styles.profileAvatar,
                { backgroundColor: theme.cardDark || colors.cardDark },
              ]}
            >
              {avatarSource ? (
                <Image
                  source={avatarSource}
                  style={styles.profileAvatarImage}
                />
              ) : (
                <Text
                  style={[
                    styles.profileAvatarInitial,
                    { color: theme.textMain || theme.text },
                  ]}
                >
                  {initial}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.profileName,
                  { color: theme.textMain || theme.text },
                ]}
              >
                {displayName}
              </Text>

              {user.town ? (
                <Text
                  style={[
                    styles.profileTown,
                    { color: theme.textMuted || colors.textMuted },
                  ]}
                >
                  {user.town}
                </Text>
              ) : null}

              <Text
                style={[
                  styles.profileRole,
                  { color: theme.textMuted || colors.textMuted },
                ]}
              >
                {user.role === "business" ? "Business host" : "Local member"}
              </Text>
            </View>
          </View>

          {/* Sections: About, Looking For / Business type, Instagram, Website */}
          {user.bio ? (
            <View style={styles.profileSection}>
              <Text
                style={[
                  styles.profileSectionLabel,
                  { color: theme.textMuted || colors.textMuted },
                ]}
              >
                About
              </Text>
              <Text
                style={[
                  styles.profileSectionText,
                  { color: theme.textMain || theme.text },
                ]}
              >
                {user.bio}
              </Text>
            </View>
          ) : null}

          {user.lookingFor ? (
            <View style={styles.profileSection}>
              <Text
                style={[
                  styles.profileSectionLabel,
                  { color: theme.textMuted || colors.textMuted },
                ]}
              >
                {user.role === "business" ? "Business type" : "Looking for"}
              </Text>
              <Text
                style={[
                  styles.profileSectionText,
                  { color: theme.textMain || theme.text },
                ]}
              >
                {user.lookingFor}
              </Text>
            </View>
          ) : null}

          {user.instagram ? (
            <View style={styles.profileSection}>
              <Text
                style={[
                  styles.profileSectionLabel,
                  { color: theme.textMuted || colors.textMuted },
                ]}
              >
                Instagram
              </Text>
              <Text
                style={[
                  styles.profileLinkText,
                  { color: theme.accent || colors.accent },
                ]}
              >
                {user.instagram}
              </Text>
            </View>
          ) : null}

          {user.role === "business" && user.website ? (
            <View style={styles.profileSection}>
              <Text
                style={[
                  styles.profileSectionLabel,
                  { color: theme.textMuted || colors.textMuted },
                ]}
              >
                Website
              </Text>
              <Text
                style={[
                  styles.profileLinkText,
                  { color: theme.accent || colors.accent },
                ]}
              >
                {user.website}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  profileModalCard: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  profileModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textLight,
  },
  profileModalClose: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.cardDark,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  profileAvatarInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textLight,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textLight,
  },
  profileTown: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  profileRole: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  profileSection: {
    marginTop: 10,
  },
  profileSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 2,
  },
  profileSectionText: {
    fontSize: 13,
    color: colors.textLight,
  },
  profileLinkText: {
    fontSize: 13,
    color: colors.accent,
  },
});
