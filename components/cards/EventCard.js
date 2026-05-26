// components/cards/EventCard.js
// A reusable card for displaying a single event on the Hub screen.

import React from "react";
import { Alert, Image, Linking, Text, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import TrustBadgeRow from "../common/TrustBadges";
import { getCardScheduleLabels } from "../../utils/eventSchedule";
import { getCategoryAccent, getVisibleTags } from "../../utils/categoryVisuals";

function normalizeExternalUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function EventCard({ event, onPress }) {
  const { theme } = useTheme();

  if (!event) return null;

  const { primary: primaryDateLabel, secondary: secondaryTimeLabel } =
    getCardScheduleLabels(event);

  const locationLabel =
    event.locationName || event.location || event.address || "Location TBA";
  const categoryList =
    Array.isArray(event.categories) && event.categories.length
      ? event.categories
      : event.category
        ? [event.category]
        : [];
  const categoryLabel = categoryList.join(", ") || "Event";
  const categoryTags = Array.isArray(event.categoryTags) ? event.categoryTags : [];
  const vibeTags = Array.isArray(event.vibeTags) ? event.vibeTags : [];
  const combinedTags = [...vibeTags, ...categoryTags];
  const { visible: visibleTags, hiddenCount } = getVisibleTags(combinedTags, 3);
  const categoryAccent = getCategoryAccent(categoryList[0], theme);
  const host = event.createdBy && typeof event.createdBy === "object"
    ? event.createdBy
    : null;
  const bookingUrl = normalizeExternalUrl(event.bookingUrl);
  const duration = event.duration || "";
  const priceRange = event.priceRange || "";

  function handleBookNow(pressEvent) {
    pressEvent?.stopPropagation?.();
    if (!bookingUrl) return;

    Linking.openURL(bookingUrl).catch((error) => {
      console.warn("Open booking link issue:", error?.message);
      Alert.alert("Could not open booking link", "Please try again.");
    });
  }

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
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.topRow}>
          {categoryList.length ? (
            <View
              style={[
                styles.categoryPill,
                {
                  backgroundColor: categoryAccent.tint,
                  borderColor: categoryAccent.border,
                },
              ]}
            >
              <Text style={[styles.categoryText, { color: categoryAccent.text }]}>
                {categoryLabel}
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

        {host ? (
          <View style={styles.trustRow}>
            <Text style={[styles.hostText, { color: theme.textMuted }]} numberOfLines={1}>
              Hosted by {host.name || "Organizer"}
            </Text>
            <TrustBadgeRow profile={host} theme={theme} compact />
          </View>
        ) : null}

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
              Meeting Location
            </Text>
            <Text
              style={[styles.metaValue, { color: theme.text }]}
              numberOfLines={2}
            >
              {locationLabel}
            </Text>
          </View>
        </View>

        {duration || priceRange ? (
          <View style={styles.tourMetaRow}>
            {duration ? (
              <View style={[styles.tourMetaPill, { borderColor: theme.border }]}>
                <Text style={[styles.tourMetaLabel, { color: theme.textMuted }]}>
                  Duration
                </Text>
                <Text style={[styles.tourMetaText, { color: theme.text }]}>
                  {duration}
                </Text>
              </View>
            ) : null}
            {priceRange ? (
              <View style={[styles.tourMetaPill, { borderColor: theme.border }]}>
                <Text style={[styles.tourMetaLabel, { color: theme.textMuted }]}>
                  Price
                </Text>
                <Text style={[styles.tourMetaText, { color: theme.text }]}>
                  {priceRange}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.footerRow,
            {
              borderTopColor: theme.border,
            },
          ]}
        >
          <View style={styles.footerCopy}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              {categoryLabel}
            </Text>
            {visibleTags.length ? (
              <View style={styles.tagRow}>
                {visibleTags.map((tag) => (
                  <View
                    key={tag}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.tagChipText, { color: theme.textMuted }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
                {hiddenCount ? (
                  <Text style={[styles.moreTagsText, { color: theme.textMuted }]}>
                    +{hiddenCount}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
          <View style={styles.footerActions}>
            {bookingUrl ? (
              <Pressable
                style={[styles.bookButton, { backgroundColor: theme.accent }]}
                onPress={handleBookNow}
              >
                <Text
                  style={[
                    styles.bookButtonText,
                    { color: theme.onAccent || theme.textOnAccent },
                  ]}
                >
                  Book Now
                </Text>
              </Pressable>
            ) : null}
            <Text style={[styles.footerCta, { color: theme.accent }]}>
              View details
            </Text>
          </View>
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
    overflow: "hidden",
    borderWidth: 1,
  },
  cardImage: {
    width: "100%",
    height: 150,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 15,
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: "70%",
    borderWidth: 1,
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
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  trustRow: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  hostText: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 5,
  },
  metaStack: {
    gap: 10,
    paddingHorizontal: 16,
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
  tourMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  tourMetaPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 100,
  },
  tourMetaLabel: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  tourMetaText: {
    fontSize: 13,
    fontWeight: "800",
  },
  footerRow: {
    marginTop: 14,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 15,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 13,
  },
  footerCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  moreTagsText: {
    fontSize: 11,
    fontWeight: "700",
  },
  footerCta: {
    fontSize: 13,
    fontWeight: "700",
  },
  footerActions: {
    alignItems: "flex-end",
    gap: 7,
  },
  bookButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bookButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
});
