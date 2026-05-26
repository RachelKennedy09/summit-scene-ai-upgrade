import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Pressable, Linking } from "react-native";
import { colors } from "../../theme/colors";
import { AVATARS } from "../../assets/avatars/avatarConfig";
import AppButton from "../common/AppButton";
import TrustBadgeRow from "../common/TrustBadges";

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSocialLabel(account) {
  const provider = titleCase(account.provider);
  const value = account.handle || account.url || "";
  return `${provider}: ${value}`;
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
    case "linkedin":
      return value.includes("linkedin.com")
        ? `https://${value.replace(/^https?:\/\//i, "")}`
        : "";
    case "facebook":
      return value.includes("facebook.com")
        ? `https://${value.replace(/^https?:\/\//i, "")}`
        : "";
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
      <Text style={[styles.chipText, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

function Section({ label, children, theme }) {
  if (!children) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const INTEREST_PREVIEW_COUNT = 4;

export default function ProfileCard({
  theme,
  user,
  isBusiness,
  roleLabel,
  email,
  joinedText,
  onEditProfile,
}) {
  const [showAllInterests, setShowAllInterests] = useState(false);
  const avatarSource =
    user?.avatarKey && AVATARS[user.avatarKey]
      ? AVATARS[user.avatarKey]
      : user?.profileImageUrl || user?.avatarUrl
      ? { uri: user.profileImageUrl || user.avatarUrl }
      : null;

  const displayName = user?.name || "SummitScene member";
  const initial = (displayName && displayName.charAt(0).toUpperCase()) || "?";
  const town = user?.town || "";
  const originallyFrom = user?.originallyFrom || "";
  const interests = Array.isArray(user?.interests) ? user.interests : [];
  const languages = Array.isArray(user?.languages) ? user.languages : [];
  const socialAccounts = Array.isArray(user?.socialAccounts)
    ? user.socialAccounts
    : [];
  const businessType = isBusiness ? user?.lookingFor : "";
  const businessStatus = user?.businessVerificationStatus || "none";
  const profileTypeLabel = roleLabel || (isBusiness
    ? businessStatus === "verified"
      ? "Verified Local"
      : businessStatus === "pending"
        ? "New Organizer"
        : "Community Organizer"
    : "Community member");
  const accountDetails = [
    email ? `Email: ${email}` : "",
    joinedText ? `Member since: ${joinedText}` : "",
  ].filter(Boolean);
  const hasManyInterests = interests.length > INTEREST_PREVIEW_COUNT;
  const visibleInterests =
    hasManyInterests && !showAllInterests
      ? interests.slice(0, INTEREST_PREVIEW_COUNT)
      : interests;

  return (
    <View
      style={[
        styles.profileCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.pill || colors.surfaceMuted },
          ]}
        >
          {avatarSource ? (
            <Image source={avatarSource} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarInitial, { color: theme.text }]}>
              {initial}
            </Text>
          )}
        </View>

        <View style={styles.headerTextCol}>
          <Text style={[styles.headerName, { color: theme.text }]}>
            {displayName}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            {profileTypeLabel}
          </Text>
          <View style={styles.profileBadgeRow}>
            <TrustBadgeRow profile={user} theme={theme} compact />
          </View>
          {accountDetails.length ? (
            <Text style={[styles.accountMeta, { color: theme.textMuted }]}>
              {accountDetails.join(" | ")}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.chipRow}>
        {town ? <Chip label={town === "LL" ? "Lake Louise" : town} theme={theme} /> : null}
        {originallyFrom ? (
          <Chip label={`Originally from ${originallyFrom}`} theme={theme} />
        ) : null}
        {businessType ? <Chip label={businessType} theme={theme} /> : null}
      </View>

      <Section label="Bio" theme={theme}>
        {user?.bio ? (
          <Text style={[styles.value, { color: theme.text }]}>{user.bio}</Text>
        ) : (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Add a short bio so people know who you are.
          </Text>
        )}
      </Section>

      {interests.length ? (
        <Section label="Interests" theme={theme}>
          {hasManyInterests ? (
            <Pressable
              style={styles.sectionToggleRow}
              onPress={() => setShowAllInterests((current) => !current)}
            >
              <Text style={[styles.sectionToggleText, { color: theme.text }]}>
                {interests.length} selected
              </Text>
              <Text style={[styles.sectionToggleAction, { color: theme.accent }]}>
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
                  { borderColor: theme.accent, backgroundColor: theme.card },
                ]}
                onPress={() => setShowAllInterests(true)}
              >
                <Text style={[styles.moreChipText, { color: theme.accent }]}>
                  +{interests.length - INTEREST_PREVIEW_COUNT} more
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Section>
      ) : null}

      {languages.length ? (
        <Section label="Languages" theme={theme}>
          <Text style={[styles.value, { color: theme.text }]}>
            {languages.join(", ")}
          </Text>
        </Section>
      ) : null}

      {socialAccounts.length ? (
        <Section label="Social accounts" theme={theme}>
          {socialAccounts.map((account) => {
            const url = getSocialUrl(account);
            return (
              <Pressable
                key={`${account.provider}-${account.handle || account.url}`}
                onPress={() => {
                  if (url) Linking.openURL(url);
                }}
                disabled={!url}
                style={styles.socialRow}
              >
                <Text style={[styles.linkValue, { color: theme.accent }]}>
                  {getSocialLabel(account)}
                </Text>
                <Text
                  style={[
                    styles.statusText,
                    { color: account.verified ? theme.accent : theme.textMuted },
                  ]}
                >
                  {account.verified ? "Verified" : "Unverified"}
                </Text>
              </Pressable>
            );
          })}
        </Section>
      ) : null}

      <AppButton
        title="Edit profile"
        onPress={onEditProfile}
        variant="primary"
        style={styles.editButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: "700",
  },
  headerTextCol: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  profileBadgeRow: {
    marginTop: 6,
  },
  accountMeta: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  section: {
    marginTop: 12,
  },
  sectionLabel: {
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
  value: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
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
  linkValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  statusText: {
    fontSize: 12,
    marginTop: 2,
  },
  editButton: {
    marginTop: 16,
  },
});
