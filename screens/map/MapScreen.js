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
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";

import AppLogoHeader from "../../components/AppLogoHeader";

import { fetchEvents as fetchEventsFromApi } from "../../services/eventsApi.js";
import { useTheme } from "../../context/ThemeContext";
import MapFilters from "../../components/map/MapFilters";

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
  "Food",
  "Art",
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
  const step = 0.02; // chosen for current zoom level so markers are clearly visible

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

export default function MapScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const { theme } = useTheme();

  // Filter state (shared wtih Hub): town, category, date range
  const [selectedTown, setSelectedTown] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDateFilter, setSelectedDateFilter] = useState("All");

  // Data + status state
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch events (same helper as Hub, with sorting, for consistency)
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchEventsFromApi();

      const sorted = (Array.isArray(data) ? data : []).slice().sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });

      setEvents(sorted);
    } catch (error) {
      console.error("MapScreen fetch events error:", error.message);
      setError("Could not load events for the map.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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
      const townMatch = selectedTown === "All" || event.town === selectedTown;

      const categoryMatch =
        selectedCategory === "All" || event.category === selectedCategory;

      let dateMatch = true;

      if (selectedDateFilter !== "All") {
        if (!event.date || typeof event.date !== "string") {
          dateMatch = false;
        } else {
          const [y, m, d] = event.date.split("-").map(Number);

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

      return townMatch && categoryMatch && dateMatch;
    });
  }, [events, selectedTown, selectedCategory, selectedDateFilter]);

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
      return "No events match your current map filters.";
    }

    if (count === 1) {
      return `Showing 1 event in ${townLabel} for ${categoryLabel}${dateLabel}.`;
    }

    return `Showing ${count} events in ${townLabel} for ${categoryLabel}${dateLabel}.`;
  }, [eventsForMap.length, selectedTown, selectedCategory, selectedDateFilter]);

  // When the selected town changes, animate the camera to that town's region.
  useEffect(() => {
    if (!mapRef.current) return;

    let targetRegion = INITIAL_REGION;

    if (selectedTown !== "All") {
      const coords = TOWN_COORDS[selectedTown];
      if (coords) {
        targetRegion = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.12,
          longitudeDelta: 0.18,
        };
      }
    }

    mapRef.current.animateToRegion(targetRegion, 800);
  }, [selectedTown]);

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
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={INITIAL_REGION}
          >
            {(() => {
              // I keep a count per town so we know how much to offset each marker
              const townCounts = {};

              return eventsForMap.map((event) => {
                const rawTown = event.town || "";
                const coords = TOWN_COORDS[rawTown];

                // If there are no coordinates for this town, skip the marker
                if (!coords) return null;

                const townKey = rawTown;
                const indexForTown = townCounts[townKey] || 0;
                townCounts[townKey] = indexForTown + 1;

                // Get a small offset based on how many markers we've already placed for this town
                const offset = getOffsetForTownIndex(indexForTown);

                const finalCoords = {
                  latitude: coords.latitude + offset.lat,
                  longitude: coords.longitude + offset.lng,
                };

                const key =
                  event._id?.toString() ??
                  `${event.title}-${event.date}-${event.time}`;

                const descriptionPieces = [];
                if (event.location) descriptionPieces.push(event.location);
                const dateOnly = toDateOnlyString(event.date);
                if (dateOnly) descriptionPieces.push(dateOnly);
                if (event.time) descriptionPieces.push(event.time);
                const description = descriptionPieces.join(" • ");

                return (
                  <Marker
                    key={key}
                    coordinate={finalCoords}
                    title={event.title}
                    description={description}
                    onPress={() => handleMarkerPress(event)}
                  />
                );
              });
            })()}
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
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  map: {
    flex: 1,
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
  emptyText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 13,
  },
});
