// screens/EventDetailScreen.js
// Show full details for a single event.
// - Displays title, category, town, date/time, location, and description
// - Shows business "host" info (EventHostSection) when available
// - Gives the event owner edit/delete actions (EventOwnerSection)
// - Includes "Open in Maps" deep link for the event location

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../../context/AuthContext";
import { deleteEvent } from "../../services/eventsApi";
import { useTheme } from "../../context/ThemeContext";

import EventHostSection from "../../components/events/EventHostSection";
import EventOwnerSection from "../../components/events/EventOwnerSection";

// Helper: derive business host info from event.createdBy (or fallback to event.user)
// Block is only showed when the host is a business account.
function getEventHost(event) {
  if (!event) return null;

  const userObj =
    typeof event.createdBy === "object" && event.createdBy !== null
      ? event.createdBy
      : typeof event.user === "object" && event.user !== null
      ? event.user
      : null;

  if (!userObj) return null;
  if (userObj.role !== "business") return null; // only show for business hosts

  const name = userObj.name || "Event host";
  const town = userObj.town || event.town || "Rockies local";
  const avatarKey = userObj.avatarKey || null;
  const website = userObj.website || "";
  const instagram = userObj.instagram || "";
  const bio = userObj.bio || "";
  const businessType = userObj.lookingFor || "";

  return {
    name,
    town,
    avatarKey,
    website,
    instagram,
    bio,
    businessType,
    role: userObj.role,
  };
}

// Helper: safely check if the logged-in user owns this event
// This is used to decide whether to show the Edit/Delete owner block.
function isEventOwner(event, user) {
  if (!event || !user) return false;

  const createdBy = event.createdBy;
  const eventOwnerId =
    typeof createdBy === "string" ? createdBy : createdBy?._id || createdBy?.id;

  const userId = user._id || user.id;

  if (!eventOwnerId || !userId) return false;

  return eventOwnerId.toString() === userId.toString();
}

export default function EventDetailScreen({ route }) {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const { theme } = useTheme();

  const { event } = route.params || {};

  // Defensive fallback if the screen is opened without an event
  if (!event) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.text }]}>
            Event details not available.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const host = getEventHost(event);
  const isOwner = isEventOwner(event, user);

  const handleEdit = () => {
    // navigate to shared EditEvent form, passing the current event
    navigation.navigate("EditEvent", { event });
  };

  // Delete flow: confirm, call API, then refresh parent list via onUpdated callback if provided
  const handleDelete = () => {
    Alert.alert("Delete this event?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (!token) {
              Alert.alert("Not logged in", "Please log in again.");
              return;
            }

            await deleteEvent(event._id, token);

            if (route.params?.onUpdated) {
              route.params.onUpdated();
            }
            navigation.goBack();
          } catch (error) {
            console.error("Failed to delete event:", error);
            Alert.alert("Error", error.message || "Failed to delete event.");
          }
        },
      },
    ]);
  };

  const title = event.title || "Untitled event";
  const category = event.category || "Event";
  const town = event.town || "";
  const location = event.location || "";
  const description = event.description || "No detailed description added yet.";

  const hasDate = Boolean(event.date);
  const hasStartTime = Boolean(event.time);
  const hasEndTime = Boolean(event.endTime);

  // Friendlier date label (e.g. "Saturday, December 6")
  let dateLabel = "Date TBA";
  if (hasDate) {
    const parsed = new Date(event.date);
    if (!isNaN(parsed)) {
      dateLabel = parsed.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    } else {
      // Fallback to raw string if parsing fails
      dateLabel = event.date;
    }
  }

  // Time label based on which fields are present
  let timeLabel = "Time TBA";
  if (hasStartTime && hasEndTime) {
    timeLabel = `${event.time} - ${event.endTime}`;
  } else if (hasStartTime) {
    timeLabel = event.time;
  } else if (hasEndTime) {
    timeLabel = `Until ${event.endTime}`;
  }

  // Open native maps app (Apple Maps / Android geo / web) using location/town/title as a query
  const handleOpenMaps = () => {
    const query = encodeURIComponent(location || town || title);
    if (!query) return;

    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });

    if (!url) return;

    Linking.openURL(url).catch((err) =>
      console.error("Error opening maps:", err)
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {/* Hero image (optional)*/}
          {event.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} style={styles.heroImage} />
          ) : null}

          <View style={styles.content}>
            {/* Category + town row */}
            <View style={styles.topRow}>
              <View
                style={[
                  styles.categoryPill,
                  { backgroundColor: theme.accentSoft || theme.accent },
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: theme.onAccent || theme.background },
                  ]}
                >
                  {category}
                </Text>
              </View>
              {town ? (
                <Text style={[styles.townText, { color: theme.textMuted }]}>
                  {town}
                </Text>
              ) : null}
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

            {/* Date + time row */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: theme.textMuted }]}>
                  Date
                </Text>
                <Text style={[styles.metaValue, { color: theme.text }]}>
                  {dateLabel}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: theme.textMuted }]}>
                  Time
                </Text>
                <Text style={[styles.metaValue, { color: theme.text }]}>
                  {timeLabel}
                </Text>
              </View>
            </View>

            {/* Location + map link */}
            {location ? (
              <View style={styles.locationBlock}>
                <Text style={[styles.metaLabel, { color: theme.textMuted }]}>
                  Location
                </Text>
                <Text style={[styles.locationText, { color: theme.text }]}>
                  {location}
                </Text>

                <Pressable
                  style={[
                    styles.mapButton,
                    {
                      borderColor: theme.accent,
                    },
                  ]}
                  onPress={handleOpenMaps}
                >
                  <Text style={[styles.mapButtonText, { color: theme.accent }]}>
                    Open in Maps
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* Description */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeading, { color: theme.text }]}>
                About this event
              </Text>
              <Text style={[styles.description, { color: theme.textMuted }]}>
                {description}
              </Text>
            </View>

            {/* Hosted by (business) block + modal */}
            <EventHostSection host={host} />

            {/* Owner-only actions (edit/delete) */}
            {isOwner && (
              <EventOwnerSection onEdit={handleEdit} onDelete={handleDelete} />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  heroImage: {
    width: "100%",
    height: 220,
  },
  content: {
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  townText: {
    fontSize: 13,
    fontWeight: "500",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  locationBlock: {
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    marginBottom: 8,
  },
  mapButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  mapButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 14,
  },
});
