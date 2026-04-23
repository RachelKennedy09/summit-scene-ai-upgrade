// screens/MapScreen.js
// Map view for SummitScene.
// - Fetches all events from the API
// - Applies the same town/category/date filters as the Hub
// - Shows events as map markers, with a small "fan-out" offset per town
// so overlapping markers are easier to see.

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Callout } from "react-native-maps";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import AppLogoHeader from "../../components/AppLogoHeader";

import {
  fetchEvents as fetchEventsFromApi,
  sortEventsByUpcomingDate,
} from "../../services/eventsApi.js";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import MapFilters from "../../components/map/MapFilters";
import {
  formatEventTimeLabel,
  getNextOccurrenceDateString,
  getRecurrenceLabel,
} from "../../utils/eventSchedule";

// Simple list of towns for the selector modal
const TOWNS = ["All", "Banff", "Canmore", "Lake Louise"];

// List of categories for selector modal
const CATEGORIES = [
  "All",
  "Market",
  "Wellness",
  "Music",
  "Workshop",
  "Family",
  "Retail",
  "Outdoors",
  "Food & Drink",
  "Networking",
  "Fundraiser",
  "Seasonal/Holiday Special",
  "Nightlife",
  "Sports/Watch Party",
  "Community Info Session",
  "Art",
  "Other",
];

// Date filter options (relative ranges)
const DATE_FILTERS = [
  "All",
  "Today",
  "Next 3 days",
  "Next 7 days",
  "Next 30 days",
];

// Static coordinates for each town
const TOWN_COORDS = {
  Banff: { latitude: 51.1784, longitude: -115.5708 },
  Canmore: { latitude: 51.0892, longitude: -115.3593 },
  "Lake Louise": { latitude: 51.4254, longitude: -116.1773 },
};

// Map starting position (roughly between Banff & Canmore)
const INITIAL_REGION = {
  latitude: 51.18,
  longitude: -115.57,
  latitudeDelta: 0.8,
  longitudeDelta: 0.8,
};

// Helper: normalize any event.date to "YYYY-MM-DD" (for marker description)
function toDateOnlyString(value) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Helper to "fan out" markers per town so they don't sit exactly on top of each other
// I used a small grid of offsets around the town center, based on how many events are in that town.
function getOffsetForTownIndex(index) {
  const step = 0.004;

  const patterns = [
    { lat: 0, lng: 0 }, // first marker center
    { lat: step, lng: 0 },
    { lat: -step, lng: 0 },
    { lat: 0, lng: step },
    { lat: 0, lng: -step },
    { lat: step, lng: step },
    { lat: -step, lng: -step },
    { lat: step, lng: -step },
    { lat: -step, lng: step },
  ];

  return patterns[index % patterns.length];
}

function getEventMarkerCoords(event, townCounts) {
  const hasExactCoords =
    Number.isFinite(event?.latitude) && Number.isFinite(event?.longitude);

  if (hasExactCoords) {
    return {
      latitude: event.latitude,
      longitude: event.longitude,
    };
  }

  const rawTown = event?.town || "";
  const coords = TOWN_COORDS[rawTown];
  if (!coords) return null;

  const townKey = rawTown;
  const indexForTown = townCounts[townKey] || 0;
  townCounts[townKey] = indexForTown + 1;

  const offset = getOffsetForTownIndex(indexForTown);

  return {
    latitude: coords.latitude + offset.lat,
    longitude: coords.longitude + offset.lng,
  };
}

export default function MapScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const { user } = useAuth();
  const { theme } = useTheme();
  const isBusiness = user?.role === "business";
  const currentUserId = user?._id || user?.id || "";

  // Filter state (shared wtih Hub): town, category, date range
  const [selectedTown, setSelectedTown] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDateFilter, setSelectedDateFilter] = useState("All");
  const [showOnlyMyEvents, setShowOnlyMyEvents] = useState(false);

  // Data + status state
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);

  // Fetch events (same helper as Hub, with sorting, for consistency)
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchEventsFromApi();

      setEvents(sortEventsByUpcomingDate(data));
    } catch (error) {
      setError("Could not load events for the map.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  // Filter events for map markers (same logic as Hub date filters)
  // I compute a date range ( Today / Next 3 / Next 7 / Next 30 ) and then
  // I keep only events that match town + category + date.
  const eventsForMap = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    let rangeStart = null;
    let rangeEnd = null;

    if (selectedDateFilter === "Today") {
      rangeStart = todayStart;
      rangeEnd = new Date(todayStart);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
    } else if (selectedDateFilter === "Next 3 days") {
      rangeStart = todayStart;
      rangeEnd = new Date(todayStart);
      rangeEnd.setDate(rangeEnd.getDate() + 3);
    } else if (selectedDateFilter === "Next 7 days") {
      rangeStart = todayStart;
      rangeEnd = new Date(todayStart);
      rangeEnd.setDate(rangeEnd.getDate() + 7);
    } else if (selectedDateFilter === "Next 30 days") {
      rangeStart = todayStart;
      rangeEnd = new Date(todayStart);
      rangeEnd.setDate(rangeEnd.getDate() + 30);
    }

    return events.filter((event) => {
      const eventOwnerId =
        typeof event.createdBy === "string"
          ? event.createdBy
          : event.createdBy?._id || event.createdBy?.id || "";
      const ownershipMatch =
        !showOnlyMyEvents ||
        (currentUserId &&
          eventOwnerId &&
          eventOwnerId.toString() === currentUserId.toString());

      const townMatch = selectedTown === "All" || event.town === selectedTown;

      const categoryMatch =
        selectedCategory === "All" || event.category === selectedCategory;

      let dateMatch = true;
      const effectiveDate = getNextOccurrenceDateString(event) || event.date;

      if (selectedDateFilter !== "All") {
        if (!effectiveDate || typeof effectiveDate !== "string") {
          dateMatch = false;
        } else {
          const [y, m, d] = effectiveDate.split("-").map(Number);

          if (!y || !m || !d) {
            dateMatch = false;
          } else {
            const eventDay = new Date(y, m - 1, d);

            if (rangeStart && rangeEnd) {
              dateMatch = eventDay >= rangeStart && eventDay < rangeEnd;
            }
          }
        }
      }

      return ownershipMatch && townMatch && categoryMatch && dateMatch;
    });
  }, [
    events,
    selectedTown,
    selectedCategory,
    selectedDateFilter,
    showOnlyMyEvents,
    currentUserId,
  ]);

  const markersForMap = useMemo(() => {
    const townCounts = {};

    return eventsForMap
      .map((event) => {
        const coordinate = getEventMarkerCoords(event, townCounts);

        if (!coordinate) return null;

        const dateOnly = toDateOnlyString(
          getNextOccurrenceDateString(event) || event.date
        );
        const timeLabel = formatEventTimeLabel(event);
        const scheduleBits = [];

        if (dateOnly) scheduleBits.push(dateOnly);
        if ((event.scheduleType || "single") === "recurring") {
          scheduleBits.push(getRecurrenceLabel(event));
        }
        if (timeLabel && timeLabel !== "Time TBA") {
          scheduleBits.push(timeLabel);
        }

        return {
          id:
            event._id?.toString() ?? `${event.title}-${event.date}-${event.time}`,
          event,
          coordinate,
          scheduleLabel: scheduleBits.join(" • "),
          locationLabel: event.locationName || event.location || event.address || "",
          usesExactCoords:
            Number.isFinite(event?.latitude) && Number.isFinite(event?.longitude),
        };
      })
      .filter(Boolean);
  }, [eventsForMap]);

  // Human-readable summary line under the filters (e.g. "Showing 3 events in Banff ...")
  const filterSummary = useMemo(() => {
    const count = eventsForMap.length;

    const townLabel = selectedTown === "All" ? "all towns" : ` ${selectedTown}`;
    const categoryLabel =
      selectedCategory === "All"
        ? "all categories"
        : ` ${selectedCategory.toLowerCase()}`;

    const dateLabel =
      selectedDateFilter === "All"
        ? ""
        : ` (${selectedDateFilter.toLowerCase()})`;

    if (count === 0) {
      return showOnlyMyEvents
        ? "No posted events match your current map filters."
        : "No events match your current map filters.";
    }

    if (count === 1) {
      return `Showing 1 ${
        showOnlyMyEvents ? "posted event" : "event"
      } in ${townLabel} for ${categoryLabel}${dateLabel}.`;
    }

    return `Showing ${count} ${
      showOnlyMyEvents ? "posted events" : "events"
    } in ${townLabel} for ${categoryLabel}${dateLabel}.`;
  }, [
    eventsForMap.length,
    selectedTown,
    selectedCategory,
    selectedDateFilter,
    showOnlyMyEvents,
  ]);

  // Keep the camera aligned with the actual filtered markers.
  useEffect(() => {
    if (!mapRef.current || loading || error) return;

    if (markersForMap.length === 0) {
      const targetRegion =
        selectedTown !== "All" && TOWN_COORDS[selectedTown]
          ? {
              latitude: TOWN_COORDS[selectedTown].latitude,
              longitude: TOWN_COORDS[selectedTown].longitude,
              latitudeDelta: 0.12,
              longitudeDelta: 0.18,
            }
          : INITIAL_REGION;

      mapRef.current.animateToRegion(targetRegion, 500);
      return;
    }

    if (markersForMap.length === 1) {
      const { coordinate } = markersForMap[0];
      mapRef.current.animateToRegion(
        {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        },
        500
      );
      return;
    }

    mapRef.current.fitToCoordinates(
      markersForMap.map((marker) => marker.coordinate),
      {
        edgePadding: { top: 90, right: 60, bottom: 90, left: 60 },
        animated: true,
      }
    );
  }, [selectedTown, markersForMap, loading, error]);

  // Navigate to EventDetail when a marker is pressed.
  function handleMarkerPress(event) {
    navigation.navigate("EventDetail", {
      event,
      eventId: event._id,
    });
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <AppLogoHeader />
      {/* Filters header and summary (reused logic from Hub in a shared MapFilters component) */}
      <MapFilters
        selectedTown={selectedTown}
        selectedCategory={selectedCategory}
        selectedDateFilter={selectedDateFilter}
        filterSummary={filterSummary}
        error={error}
        towns={TOWNS}
        categories={CATEGORIES}
        dateFilters={DATE_FILTERS}
        onSelectTown={setSelectedTown}
        onSelectCategory={setSelectedCategory}
        onSelectDateFilter={setSelectedDateFilter}
      />
      {isBusiness ? (
        <View style={styles.businessToggleRow}>
          <Pressable
            style={[
              styles.toggleChip,
              {
                backgroundColor: !showOnlyMyEvents
                  ? theme.accentSoft || theme.card
                  : theme.card,
                borderColor: !showOnlyMyEvents ? theme.accent : theme.border,
              },
            ]}
            onPress={() => setShowOnlyMyEvents(false)}
          >
            <Text
              style={{
                color: !showOnlyMyEvents ? theme.accent : theme.text,
                fontWeight: !showOnlyMyEvents ? "700" : "500",
              }}
            >
              All events
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleChip,
              {
                backgroundColor: showOnlyMyEvents
                  ? theme.accentSoft || theme.card
                  : theme.card,
                borderColor: showOnlyMyEvents ? theme.accent : theme.border,
              },
            ]}
            onPress={() => setShowOnlyMyEvents(true)}
          >
            <Text
              style={{
                color: showOnlyMyEvents ? theme.accent : theme.text,
                fontWeight: showOnlyMyEvents ? "700" : "500",
              }}
            >
              My events
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Map area */}
      <View
        style={[
          styles.mapContainer,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        {loading ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Loading map events...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.mapLoading}>
            <Text style={[styles.errorText, { color: theme.error || "#ff4d4f" }]}>
              {error}
            </Text>
            <Pressable
              style={[styles.retryButton, { borderColor: theme.accent }]}
              onPress={loadEvents}
            >
              <Text style={[styles.retryText, { color: theme.accent }]}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={INITIAL_REGION}
            moveOnMarkerPress={false}
          >
            {markersForMap.map((marker) => {
              const isSelected = marker.id === selectedMarkerId;

              return (
                <Marker
                  key={marker.id}
                  coordinate={marker.coordinate}
                  tracksViewChanges={false}
                  onSelect={() => setSelectedMarkerId(marker.id)}
                >
                  <View
                    style={[
                      styles.markerPin,
                      {
                        backgroundColor: isSelected
                          ? theme.accent
                          : theme.background,
                        borderColor: theme.accent,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.markerInner,
                        {
                          backgroundColor: isSelected
                            ? theme.background
                            : theme.accent,
                        },
                      ]}
                    />
                  </View>

                  <Callout tooltip={false} onPress={() => handleMarkerPress(marker.event)}>
                    <View
                      style={[
                        styles.calloutCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.calloutTitle, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {marker.event.title}
                      </Text>
                      {marker.scheduleLabel ? (
                        <Text
                          style={[styles.calloutMeta, { color: theme.textMuted }]}
                          numberOfLines={2}
                        >
                          {marker.scheduleLabel}
                        </Text>
                      ) : null}
                      {marker.locationLabel ? (
                        <Text
                          style={[styles.calloutMeta, { color: theme.textMuted }]}
                          numberOfLines={2}
                        >
                          {marker.locationLabel}
                        </Text>
                      ) : null}
                      {!marker.usesExactCoords ? (
                        <Text
                          style={[styles.calloutHint, { color: theme.textMuted }]}
                        >
                          Approximate town pin
                        </Text>
                      ) : null}
                      <Text style={[styles.calloutAction, { color: theme.accent }]}>
                        View details
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>
        )}
      </View>

      {!loading && eventsForMap.length === 0 && !error && (
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          No events match this town + date range. Try another filter combo.
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ---- Map ----
  businessToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  toggleChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  map: {
    flex: 1,
  },
  markerPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  markerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  calloutCard: {
    width: 220,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  calloutMeta: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  calloutHint: {
    fontSize: 11,
    marginTop: 2,
  },
  calloutAction: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  mapLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  errorText: {
    marginBottom: 12,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 13,
  },
});
