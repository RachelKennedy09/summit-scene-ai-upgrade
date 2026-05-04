// components/cards/EventCard.js
// A reusable card for displaying a single event on the Hub screen.

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { getCardScheduleLabels } from "../../utils/eventSchedule";

export default function EventCard({ event, onPress }) {
  const { theme } = useTheme();

  if (!event) return null;

  const { primary: primaryDateLabel, secondary: secondaryTimeLabel } =
    getCardScheduleLabels(event);

  const locationLabel =
    event.locationName || event.location || event.address || "Location TBA";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardWrapper,
        pressed && styles.cardPressed,
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.topRow}>
          {event.category ? (
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: theme.accentSoft || theme.card },
              ]}
            >
              <Text style={[styles.categoryText, { color: theme.accent }]}>
                {event.category}
              </Text>
            </View>
          ) : (
            <View />
          )}

          {event.town ? (
            <Text style={[styles.townText, { color: theme.textMuted }]}>
              {event.town}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {event.title || "Untitled event"}
        </Text>

        <View style={styles.metaStack}>
          <View style={styles.metaBlock}>
            <Text style={[styles.metaLabel, { color: theme.textMuted }]}>
              When
            </Text>
            <Text style={[styles.metaValue, { color: theme.text }]}>
              {primaryDateLabel}
            </Text>
            <Text style={[styles.metaSubvalue, { color: theme.textMuted }]}>
              {secondaryTimeLabel}
            </Text>
          </View>

          <View style={styles.metaBlock}>
            <Text style={[styles.metaLabel, { color: theme.textMuted }]}>
              Where
            </Text>
            <Text
              style={[styles.metaValue, { color: theme.text }]}
              numberOfLines={2}
            >
              {locationLabel}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.footerRow,
            {
              borderTopColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            {event.category || "Event"}
          </Text>
          <Text style={[styles.footerCta, { color: theme.accent }]}>
            View details
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 18,
    marginBottom: 14,
  },
  cardPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }, { translateY: 1 }],
  },
  card: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: "70%",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  townText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "right",
    flexShrink: 1,
    paddingTop: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 14,
  },
  metaStack: {
    gap: 10,
  },
  metaBlock: {
    minWidth: 0,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  metaSubvalue: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  footerRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 13,
  },
  footerCta: {
    fontSize: 13,
    fontWeight: "700",
  },
});
