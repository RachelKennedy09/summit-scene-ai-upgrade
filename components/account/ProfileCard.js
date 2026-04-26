import React from "react";
import { View, Text, StyleSheet, Image, Pressable, Linking } from "react-native";
import { colors } from "../../theme/colors";
import { AVATARS } from "../../assets/avatars/avatarConfig";
import AppButton from "../common/AppButton";

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

export default function ProfileCard({
  theme,
  user,
  isBusiness,
  onEditProfile,
}) {
  const avatarSource =
    user?.avatarKey && AVATARS[user.avatarKey]
      ? AVATARS[user.avatarKey]
      : user?.avatarUrl
      ? { uri: user.avatarUrl }
      : null;

  const displayName = user?.name || "SummitScene member";
  const initial = (displayName && displayName.charAt(0).toUpperCase()) || "?";
  const town = user?.town || "";
  const userType = user?.userType ? titleCase(user.userType) : "";
  const interests = Array.isArray(user?.interests) ? user.interests : [];
  const languages = Array.isArray(user?.languages) ? user.languages : [];
  const socialAccounts = Array.isArray(user?.socialAccounts)
    ? user.socialAccounts
    : [];
  const skillLevel = user?.skillLevel || {};
  const hasSkills = Boolean(skillLevel.hiking || skillLevel.skiing);
  const businessType = isBusiness ? user?.lookingFor : "";

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
            {isBusiness ? "Business host" : "Community member"}
          </Text>
        </View>
      </View>

      <View style={styles.chipRow}>
        {town ? <Chip label={town === "LL" ? "Lake Louise" : town} theme={theme} /> : null}
        {userType ? <Chip label={userType} theme={theme} /> : null}
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
          <View style={styles.chipRow}>
            {interests.map((interest) => (
              <Chip key={interest} label={interest} theme={theme} />
            ))}
          </View>
        </Section>
      ) : null}

      {hasSkills ? (
        <Section label="Activity level" theme={theme}>
          <View style={styles.chipRow}>
            {skillLevel.hiking ? (
              <Chip label={`Hiking: ${titleCase(skillLevel.hiking)}`} theme={theme} />
            ) : null}
            {skillLevel.skiing ? (
              <Chip
                label={`Ski/Snowboard: ${titleCase(skillLevel.skiing)}`}
                theme={theme}
              />
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
  section: {
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
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
