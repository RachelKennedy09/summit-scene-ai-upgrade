import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchEventPreferences,
  fetchNotifications,
} from "../../services/eventPreferencesApi";

function getEventFromPreference(preference) {
  return preference?.eventId && typeof preference.eventId === "object"
    ? preference.eventId
    : null;
}

function getEventId(event) {
  return event?._id || event?.id || "";
}

function getEventMeta(event) {
  return [event?.town, event?.category, event?.date, event?.time]
    .filter(Boolean)
    .join(" | ");
}

export default function SavedEventsScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [eventPreferences, setEventPreferences] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadSavedEvents() {
    if (!user || !token) return;

    try {
      setLoading(true);
      setError("");
      const [preferences, reminders] = await Promise.all([
        fetchEventPreferences(token),
        fetchNotifications(token),
      ]);
      setEventPreferences(preferences);
      setNotifications(reminders);
    } catch (loadError) {
      setError(loadError.message || "Could not load saved events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSavedEvents();
  }, [user?._id, user?.id, token]);

  const savedPreferences = eventPreferences.filter(
    (preference) => preference.saved
  );
  const hasSavedEvents = savedPreferences.some(getEventFromPreference);

  function openEvent(event) {
    if (!event) return;

    navigation.navigate("EventDetail", {
      event,
      eventId: getEventId(event),
    });
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Saved Events"
          subtitle="Your saved events and upcoming reminder notifications."
          rightAccessory={
            <Pressable onPress={loadSavedEvents}>
              <Text style={[styles.refreshText, { color: theme.accent }]}>
                Refresh
              </Text>
            </Pressable>
          }
        />

        {loading ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            Loading saved events...
          </Text>
        ) : null}

        {error ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            {error}
          </Text>
        ) : null}

        {!loading && !error && !hasSavedEvents && !notifications.length ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              No saved events yet
            </Text>
            <Text style={[styles.cardMeta, { color: theme.textMuted }]}>
              Save events or turn on reminders from an event page to see them
              here.
            </Text>
          </View>
        ) : null}

        {hasSavedEvents ? (
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Saved events
          </Text>
        ) : null}

        {savedPreferences.map((preference) => {
          const event = getEventFromPreference(preference);
          if (!event) return null;

          return (
            <Pressable
              key={preference._id}
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => openEvent(event)}
            >
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {event.title || "Saved event"}
              </Text>
              <Text
                style={[styles.cardMeta, { color: theme.textMuted }]}
                numberOfLines={2}
              >
                {getEventMeta(event)}
              </Text>
              <Text style={[styles.cardAction, { color: theme.accent }]}>
                View event
              </Text>
            </Pressable>
          );
        })}

        {notifications.length ? (
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Upcoming reminders
          </Text>
        ) : null}

        {notifications.map((notification) => {
          if (!notification.event) return null;

          return (
            <Pressable
              key={notification._id}
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => openEvent(notification.event)}
            >
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {notification.title}
              </Text>
              <Text
                style={[styles.cardMeta, { color: theme.textMuted }]}
                numberOfLines={3}
              >
                {notification.message}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "800",
  },
  statusText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  cardMeta: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  cardAction: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
  },
});
