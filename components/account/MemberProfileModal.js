import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Image,
  ScrollView,
  Linking,
} from "react-native";
import { colors } from "../../theme/colors";
import { AVATARS } from "../../assets/avatars/avatarConfig";

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMemberSince(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function getSocialUrl(account) {
  const value = account.url || account.handle || "";
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const handle = value.replace(/^@/, "");
  switch (account.provider) {
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "tiktok":
      return `https://www.tiktok.com/@${handle}`;
    case "facebook":
    case "linkedin":
    case "website":
      return value.includes(".") ? `https://${value.replace(/^https?:\/\//i, "")}` : "";
    default:
      return "";
  }
}

function Chip({ label, theme }) {
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: theme.accentSoft || theme.pill || theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: theme.textMain || theme.text }]}>
        {label}
      </Text>
    </View>
  );
}

function Section({ label, children, theme }) {
  if (!children) return null;

  return (
    <View style={styles.profileSection}>
      <Text
        style={[
          styles.profileSectionLabel,
          { color: theme.textMuted || colors.textMuted },
        ]}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

const INTEREST_PREVIEW_COUNT = 5;

export default function MemberProfileModal({
  visible,
  user,
  theme,
  onClose,
  onReport,
  onBlock,
  currentUserId,
  blockedUserIds = [],
}) {
  const [showAllInterests, setShowAllInterests] = useState(false);

  if (!visible || !user) return null;

  const avatarSource =
    user.avatarKey && AVATARS[user.avatarKey]
      ? AVATARS[user.avatarKey]
      : user.profileImageUrl || user.avatarUrl
      ? { uri: user.profileImageUrl || user.avatarUrl }
      : null;

  const displayName = user.name || "SummitScene member";
  const userId = user._id || user.id || "";
  const isOwnProfile =
    Boolean(currentUserId) && userId?.toString() === currentUserId?.toString();
  const isBlocked = blockedUserIds.some(
    (blockedId) => blockedId?.toString() === userId?.toString()
  );
  const canShowSafetyActions = Boolean(userId) && !isOwnProfile && (onReport || onBlock);
  const initial = (displayName && displayName.charAt(0).toUpperCase()) || "M";
  const town = user.town || "";
  const userType = user.userType ? titleCase(user.userType) : "";
  const memberSince = formatMemberSince(user.createdAt);
  const originallyFrom = user.originallyFrom || "";
  const interests = Array.isArray(user.interests) ? user.interests : [];
  const languages = Array.isArray(user.languages) ? user.languages : [];
  const socialAccounts = Array.isArray(user.socialAccounts)
    ? user.socialAccounts
    : [];
  const hasManyInterests = interests.length > INTEREST_PREVIEW_COUNT;
  const visibleInterests =
    hasManyInterests && !showAllInterests
      ? interests.slice(0, INTEREST_PREVIEW_COUNT)
      : interests;

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
          <View style={styles.profileModalHeader}>
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

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.profileTopRow}>
              <View
                style={[
                  styles.profileAvatar,
                  { backgroundColor: theme.pill || colors.surfaceMuted },
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
                <Text
                  style={[
                    styles.profileRole,
                    { color: theme.textMuted || colors.textMuted },
                  ]}
                >
                  {user.role === "business"
                    ? user.businessVerificationStatus === "verified"
                      ? "Verified business host"
                      : "Business review pending"
                    : "Community member"}
                </Text>
              </View>
            </View>

            <View style={styles.chipRow}>
              {town ? <Chip label={town === "LL" ? "Lake Louise" : town} theme={theme} /> : null}
              {userType ? <Chip label={userType} theme={theme} /> : null}
              {memberSince ? (
                <Chip label={`Member since ${memberSince}`} theme={theme} />
              ) : null}
              {originallyFrom ? (
                <Chip label={`Originally from ${originallyFrom}`} theme={theme} />
              ) : null}
              {user.lookingFor && user.role === "business" ? (
                <Chip label={user.lookingFor} theme={theme} />
              ) : null}
            </View>

            <Section label="Bio" theme={theme}>
              {user.bio ? (
                <Text
                  style={[
                    styles.profileSectionText,
                    { color: theme.textMain || theme.text },
                  ]}
                >
                  {user.bio}
                </Text>
              ) : null}
            </Section>

            {interests.length ? (
              <Section label="Interests" theme={theme}>
                {hasManyInterests ? (
                  <Pressable
                    style={styles.sectionToggleRow}
                    onPress={() => setShowAllInterests((current) => !current)}
                  >
                    <Text
                      style={[
                        styles.sectionToggleText,
                        { color: theme.textMain || theme.text },
                      ]}
                    >
                      {interests.length} selected
                    </Text>
                    <Text
                      style={[
                        styles.sectionToggleAction,
                        { color: theme.accent || colors.accent },
                      ]}
                    >
                      {showAllInterests ? "Show less" : "Show all"}
                    </Text>
                  </Pressable>
                ) : null}
                <View style={styles.chipRow}>
                  {visibleInterests.map((interest) => (
                    <Chip key={interest} label={interest} theme={theme} />
                  ))}
                  {hasManyInterests && !showAllInterests ? (
                    <Pressable
                      style={[
                        styles.moreChip,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.accent || colors.accent,
                        },
                      ]}
                      onPress={() => setShowAllInterests(true)}
                    >
                      <Text
                        style={[
                          styles.moreChipText,
                          { color: theme.accent || colors.accent },
                        ]}
                      >
                        +{interests.length - INTEREST_PREVIEW_COUNT} more
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </Section>
            ) : null}

            {languages.length ? (
              <Section label="Languages" theme={theme}>
                <Text
                  style={[
                    styles.profileSectionText,
                    { color: theme.textMain || theme.text },
                  ]}
                >
                  {languages.join(", ")}
                </Text>
              </Section>
            ) : null}

            {socialAccounts.length ? (
              <Section label="Social accounts" theme={theme}>
                {socialAccounts.map((account) => {
                  const value = account.handle || account.url || "";
                  const url = getSocialUrl(account);
                  return (
                    <Pressable
                      key={`${account.provider}-${value}`}
                      onPress={() => {
                        if (url) Linking.openURL(url);
                      }}
                      disabled={!url}
                      style={styles.socialRow}
                    >
                      <Text
                        style={[
                          styles.profileLinkText,
                          { color: theme.accent || colors.accent },
                        ]}
                      >
                        {titleCase(account.provider)}: {value}
                      </Text>
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: account.verified
                              ? theme.accent || colors.accent
                              : theme.textMuted || colors.textMuted,
                          },
                        ]}
                      >
                        {account.verified ? "Verified" : "Unverified"}
                      </Text>
                    </Pressable>
                  );
                })}
              </Section>
            ) : null}

            {canShowSafetyActions ? (
              <View
                style={[
                  styles.safetyNote,
                  {
                    backgroundColor: theme.background || colors.primary,
                    borderColor: theme.border || colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.safetyNoteText,
                    { color: theme.textMuted || colors.textMuted },
                  ]}
                >
                  Meet in public places and use report or block if something feels off.
                </Text>
              </View>
            ) : null}

            {canShowSafetyActions ? (
              <View style={styles.safetyActions}>
                {onReport ? (
                  <Pressable
                    style={[
                      styles.reportProfileButton,
                      { borderColor: theme.border },
                    ]}
                    onPress={() =>
                      onReport({
                        targetType: "user",
                        targetId: userId,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.reportProfileText,
                        { color: theme.textMuted || colors.textMuted },
                      ]}
                    >
                      Report Profile
                    </Text>
                  </Pressable>
                ) : null}
                {onBlock ? (
                  <Pressable
                    style={[
                      styles.reportProfileButton,
                      { borderColor: theme.border },
                    ]}
                    onPress={() => onBlock(user)}
                    disabled={isBlocked}
                  >
                    <Text
                      style={[
                        styles.reportProfileText,
                        { color: theme.textMuted || colors.textMuted },
                      ]}
                    >
                      {isBlocked ? "Blocked" : "Block User"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
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
    paddingHorizontal: 20,
  },
  profileModalCard: {
    maxHeight: "82%",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
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
  },
  profileModalClose: {
    fontSize: 14,
    fontWeight: "600",
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileAvatarInitial: {
    fontSize: 22,
    fontWeight: "700",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
  },
  profileRole: {
    fontSize: 13,
    marginTop: 2,
  },
  profileSection: {
    marginTop: 12,
  },
  profileSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  sectionToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  sectionToggleText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sectionToggleAction: {
    fontSize: 13,
    fontWeight: "800",
  },
  profileSectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  moreChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  moreChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  socialRow: {
    marginBottom: 8,
  },
  profileLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statusText: {
    fontSize: 12,
    marginTop: 2,
  },
  safetyNote: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
  },
  safetyNoteText: {
    fontSize: 12,
    lineHeight: 17,
  },
  reportProfileButton: {
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: "flex-start",
  },
  reportProfileText: {
    fontSize: 13,
    fontWeight: "700",
  },
  safetyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
  },
});
