import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import EventCard from "../../components/cards/EventCard";
import PageHeader from "../../components/common/PageHeader";
import { useTheme } from "../../context/ThemeContext";
import { fetchEventsByCreator } from "../../services/eventsApi";

function getEventId(event) {
  return event?._id || event?.id || "";
}

export default function HostEventsScreen({ route }) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { hostId, hostName, hostRole } = route.params || {};
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isBusinessHost = hostRole === "business";
  const title = isBusinessHost
    ? `Events from ${hostName || "this business"}`
    : `Events from ${hostName || "this user"}`;
  const subtitle = isBusinessHost
    ? "Official listings posted by this business or organizer."
    : "Listings posted by this Summit Scene member.";

  const loadEvents = useCallback(async () => {
    if (!hostId) {
      setError("Could not find this event host.");
      setEvents([]);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const nextEvents = await fetchEventsByCreator(hostId);
      setEvents(nextEvents);
    } catch (loadError) {
      setError(loadError.message || "Could not load events from this host.");
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function openEvent(event) {
    navigation.navigate("EventDetail", {
      event,
      eventId: getEventId(event),
    });
  }

  function renderEvent({ item }) {
    return <EventCard event={item} onPress={() => openEvent(item)} />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <FlatList
        data={events}
        keyExtractor={(item) => getEventId(item)}
        renderItem={renderEvent}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <PageHeader
            title={title}
            subtitle={subtitle}
            rightAccessory={
              <Pressable onPress={loadEvents}>
                <Text style={[styles.refreshText, { color: theme.accent }]}>
                  Refresh
                </Text>
              </Pressable>
            }
          />
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  Loading events...
                </Text>
              </>
            ) : error ? (
              <>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  Could not load events
                </Text>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  {error}
                </Text>
                <Pressable
                  style={[styles.outlineButton, { borderColor: theme.accent }]}
                  onPress={loadEvents}
                >
                  <Text
                    style={[styles.outlineButtonText, { color: theme.accent }]}
                  >
                    Try again
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  No upcoming events
                </Text>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  This host does not have upcoming events listed right now.
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  outlineButton: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
