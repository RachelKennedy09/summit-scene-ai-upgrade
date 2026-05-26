import React from "react";
import { StyleSheet, Text, View } from "react-native";

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getTrustBadges(profile = {}, { communityType } = {}) {
  const badges = [];
  const role = profile.role || "local";
  const businessStatus = profile.businessVerificationStatus || "none";

  if (role === "business") {
    badges.push({
      key: "business",
      label:
        businessStatus === "verified"
          ? "Verified Local"
          : businessStatus === "pending"
            ? "New Organizer"
            : "Community Organizer",
      tone: businessStatus === "verified" ? "strong" : "neutral",
    });
  } else {
    badges.push({
      key: "community",
      label: "Community member",
      tone: "neutral",
    });
  }

  if (profile.userType && role !== "business") {
    badges.push({
      key: "userType",
      label: titleCase(profile.userType),
      tone: "neutral",
    });
  }

  if (communityType === "new-in-town") {
    badges.push({
      key: "newInTown",
      label: "New in town",
      tone: "soft",
    });
  }

  return badges;
}

export default function TrustBadgeRow({
  profile,
  communityType,
  theme,
  compact = false,
  align = "flex-start",
}) {
  const badges = getTrustBadges(profile, { communityType });
  if (!badges.length) return null;

  return (
    <View style={[styles.row, { justifyContent: align }]}>
      {badges.map((badge) => {
        const strong = badge.tone === "strong";
        const soft = badge.tone === "soft";
        const badgeTint = strong
          ? theme?.tealTint || "rgba(139, 166, 190, 0.16)"
          : soft
            ? "#EEE7F8"
            : theme?.card;
        const badgeBorder = strong
          ? theme?.teal || "#8BA6BE"
          : soft
            ? "#CDBCE8"
            : theme?.border;
        const badgeTextColor = strong
          ? "#365F7D"
          : soft
            ? "#5A4385"
            : theme?.textMuted;
        return (
          <View
            key={badge.key}
            style={[
              styles.badge,
              compact && styles.badgeCompact,
              {
                backgroundColor: badgeTint,
                borderColor: badgeBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                compact && styles.badgeTextCompact,
                {
                  color: badgeTextColor,
                  fontWeight: strong ? "800" : "700",
                },
              ]}
            >
              {badge.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
  },
  badgeTextCompact: {
    fontSize: 10,
  },
});
