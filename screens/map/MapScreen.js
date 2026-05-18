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
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import AppLogoHeader from "../../components/AppLogoHeader";
import EventMap from "../../components/map/EventMap";

import {
  fetchEvents as fetchEventsFromApi,
  sortEventsByUpcomingDate,
} from "../../services/eventsApi.js";
import { useAuth } from "../../context/AuthContext";
import { requestCurrentLocation } from "../../services/locationService";
import { useTheme } from "../../context/ThemeContext";
import MapFilters from "../../components/map/MapFilters";
import {
  formatEventTimeLabel,
  getNextOccurrenceDateString,
  getRecurrenceLabel,
} from "../../utils/eventSchedule";
import { getEventDistanceKm } from "../../utils/proximity";
import {
  EVENT_CATEGORIES,
  getEventCategoryFilterOptions,
  getEventCategoryGroups,
} from "../../constants/eventCategories";
import { buildBuddyPostFromEventSearch } from "../../utils/buddyPostPrefill";

// Simple list of towns for the selector modal
const TOWNS = ["All", "Banff", "Canmore", "Lake Louise"];

const CATEGORIES = EVENT_CATEGORIES;
const CATEGORY_GROUPS = getEventCategoryGroups({
  includeAll: true,
  allLabel: "All categories",
  includeGroupAll: true,
});

// Date filter options (relative ranges)
const DATE_FILTERS = [
  "All",
  "Today",
  "Next 3 days",
  "Next 7 days",
  "Next 30 days",
];
const NEAR_ME_RADIUS_KM = 15;

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

function getMarkerGroupKey(marker) {
  const latitude = Number(marker.coordinate.latitude).toFixed(5);
  const longitude = Number(marker.coordinate.longitude).toFixed(5);
  return `${latitude},${longitude}`;
}

function EventChoiceModal({
  visible,
  marker,
  theme,
  onClose,
  onSelectEvent,
}) {
  const events = marker?.events || [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.eventPickerOverlay}>
        <Pressable style={styles.eventPickerBackdrop} onPress={onClose} />
        <View
          style={[
            styles.eventPickerSheet,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.eventPickerHeader}>
            <View style={styles.eventPickerHeaderCopy}>
              <Text style={[styles.eventPickerTitle, { color: theme.text }]}>
                {events.length} events here
              </Text>
              {marker?.locationLabel ? (
                <Text
                  style={[styles.eventPickerSubtitle, { color: theme.textMuted }]}
                  numberOfLines={2}
                >
                  {marker.locationLabel}
                </Text>
              ) : null}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.eventPickerClose,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}
              onPress={onClose}
            >
              <Text style={[styles.eventPickerCloseText, { color: theme.text }]}>
                Close
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.eventPickerList}
            contentContainerStyle={styles.eventPickerListContent}
          >
            {events.map((event) => {
              const timeLabel = formatEventTimeLabel(event);
              const dateLabel = getNextOccurrenceDateString(event) || event.date;
              const meta = [
                event.town,
                event.category,
                dateLabel,
                timeLabel && timeLabel !== "Time TBA" ? timeLabel : "",
              ].filter(Boolean);

              return (
                <Pressable
                  key={event._id || `${event.title}-${event.date}-${event.time}`}
                  style={({ pressed }) => [
                    styles.eventPickerCard,
                    { backgroundColor: theme.background, borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => onSelectEvent(event)}
                >
                  <Text
                    style={[styles.eventPickerEventTitle, { color: theme.text }]}
                    numberOfLines={2}
                  >
                    {event.title || "Event"}
                  </Text>
                  {meta.length ? (
                    <Text
                      style={[
                        styles.eventPickerEventMeta,
                        { color: theme.textMuted },
                      ]}
                      numberOfLines={2}
                    >
                      {meta.join(" | ")}
                    </Text>
                  ) : null}
                  <Text
                    style={[styles.eventPickerAction, { color: theme.accent }]}
                  >
                    View details
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function MapScreen() {
  const navigation = useNavigation();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const mapRef = useRef(null);
  const { user } = useAuth();
  const { theme } = useTheme();
  const isBusiness =
    user?.isAdmin ||
    user?.role === "business" &&
      user?.businessVerificationStatus === "verified";
  const currentUserId = user?._id || user?.id || "";

  // Filter state (shared wtih Hub): town, category, date range
  const [selectedTown, setSelectedTown] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDateFilter, setSelectedDateFilter] = useState("All");
  const [showOnlyMyEvents, setShowOnlyMyEvents] = useState(false);
  const [isNearMeEnabled, setIsNearMeEnabled] = useState(false);
  const [nearMeLocation, setNearMeLocation] = useState(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeMessage, setNearMeMessage] = useState("");
  const [mapActionMessage, setMapActionMessage] = useState("");

  // Data + status state
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [selectedEventGroup, setSelectedEventGroup] = useState(null);

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

  const handleToggleNearMe = useCallback(async () => {
    if (nearMeLoading) return;

    if (isNearMeEnabled) {
      setIsNearMeEnabled(false);
      setNearMeLocation(null);
      setNearMeMessage("");
      return;
    }

    try {
      setNearMeLoading(true);
      setNearMeMessage("");
      const location = await requestCurrentLocation();
      setSelectedTown("All");
      setNearMeLocation(location);
      setIsNearMeEnabled(true);
      setNearMeMessage(
        `Showing events within ${NEAR_ME_RADIUS_KM} km of you. Town filter cleared.`
      );
    } catch (error) {
      setNearMeLocation(null);
      setIsNearMeEnabled(false);
      setNearMeMessage(error.message || "Could not get your location.");
    } finally {
      setNearMeLoading(false);
    }
  }, [isNearMeEnabled, nearMeLoading]);

  const handleSelectTown = useCallback(
    (town) => {
      setSelectedTown(town);

      if (town !== "All" && isNearMeEnabled) {
        setIsNearMeEnabled(false);
        setNearMeLocation(null);
        setNearMeMessage("Near Me turned off because a town filter is selected.");
      } else if (town !== "All") {
        setNearMeMessage("");
      }
    },
    [isNearMeEnabled]
  );

  const handleClearFilters = useCallback(() => {
    setSelectedTown("All");
    setSelectedCategory("All");
    setSelectedDateFilter("All");
    setShowOnlyMyEvents(false);
    setIsNearMeEnabled(false);
    setNearMeLocation(null);
    setNearMeMessage("");
    setSelectedMarkerId(null);
    setSelectedEventGroup(null);
    setMapActionMessage("Filters cleared. Showing all events.");
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

      const selectedCategoryOptions =
        getEventCategoryFilterOptions(selectedCategory);
      const categoryMatch =
        !selectedCategoryOptions ||
        selectedCategoryOptions.includes(event.category);
      const nearMeMatch =
        !isNearMeEnabled ||
        (() => {
          const distanceKm = getEventDistanceKm(event, nearMeLocation);
          return distanceKm !== null && distanceKm <= NEAR_ME_RADIUS_KM;
        })();

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

      return ownershipMatch && townMatch && categoryMatch && dateMatch && nearMeMatch;
    });
  }, [
    events,
    selectedTown,
    selectedCategory,
    selectedDateFilter,
    showOnlyMyEvents,
    currentUserId,
    isNearMeEnabled,
    nearMeLocation,
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
          scheduleLabel: scheduleBits.join(" | "),
          locationLabel: event.locationName || event.location || event.address || "",
          usesExactCoords:
            Number.isFinite(event?.latitude) && Number.isFinite(event?.longitude),
        };
      })
      .filter(Boolean);
  }, [eventsForMap]);

  const groupedMarkersForMap = useMemo(() => {
    const groups = new Map();

    markersForMap.forEach((marker) => {
      const key = getMarkerGroupKey(marker);
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          ...marker,
          id: key,
          events: [marker.event],
          markerCount: 1,
        });
        return;
      }

      existing.events.push(marker.event);
      existing.markerCount = existing.events.length;
      existing.event = existing.events[0];
      existing.scheduleLabel = `${existing.events.length} events at this location`;
      existing.locationLabel = existing.locationLabel || marker.locationLabel;
    });

    return Array.from(groups.values());
  }, [markersForMap]);

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
      return isNearMeEnabled
        ? `No events found within ${NEAR_ME_RADIUS_KM} km of you.`
        : showOnlyMyEvents
        ? "No posted events match your current map filters."
        : "No events match your current map filters.";
    }

    if (count === 1) {
      return `Showing 1 ${
        isNearMeEnabled ? "nearby " : ""
      }${
        showOnlyMyEvents ? "posted event" : "event"
      } in ${townLabel} for ${categoryLabel}${dateLabel}.`;
    }

    return `Showing ${count} ${
      isNearMeEnabled ? "nearby " : ""
    }${
      showOnlyMyEvents ? "posted events" : "events"
    } in ${townLabel} for ${categoryLabel}${dateLabel}.`;
  }, [
    eventsForMap.length,
    selectedTown,
    selectedCategory,
    selectedDateFilter,
    showOnlyMyEvents,
    isNearMeEnabled,
  ]);

  // Keep the camera aligned with the actual filtered markers.
  useEffect(() => {
    if (!mapRef.current || loading || error) return;

    if (isNearMeEnabled && nearMeLocation && groupedMarkersForMap.length === 0) {
      mapRef.current.animateToRegion(
        {
          latitude: nearMeLocation.latitude,
          longitude: nearMeLocation.longitude,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        },
        500
      );
      return;
    }

    if (isNearMeEnabled && nearMeLocation && groupedMarkersForMap.length > 0) {
      mapRef.current.fitToCoordinates(
        [nearMeLocation, ...groupedMarkersForMap.map((marker) => marker.coordinate)],
        {
          edgePadding: { top: 90, right: 60, bottom: 90, left: 60 },
          animated: true,
        }
      );
      return;
    }

    if (groupedMarkersForMap.length === 0) {
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

    if (groupedMarkersForMap.length === 1) {
      const { coordinate } = groupedMarkersForMap[0];
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
      groupedMarkersForMap.map((marker) => marker.coordinate),
      {
        edgePadding: { top: 90, right: 60, bottom: 90, left: 60 },
        animated: true,
      }
    );
  }, [selectedTown, groupedMarkersForMap, loading, error, isNearMeEnabled, nearMeLocation]);

  // Navigate to EventDetail when a marker is pressed.
  function handleEventPress(event) {
    navigation.navigate("EventDetail", {
      event,
      eventId: event._id,
    });
  }

  function handleMarkerPress(marker) {
    const groupedEvents = marker?.events || [];

    if (groupedEvents.length > 1) {
      setSelectedEventGroup(marker);
      setSelectedMarkerId(marker.id);
      return;
    }

    handleEventPress(groupedEvents[0] || marker.event || marker);
  }

  const handleCreateBuddyPostFromSearch = useCallback(() => {
    navigation.navigate("CreateBuddyPost", {
      eventBuddy: buildBuddyPostFromEventSearch({
        category: selectedCategory,
        town: selectedTown,
        userTown: user?.town,
      }),
    });
  }, [navigation, selectedCategory, selectedTown, user?.town]);

  const handleCreateBusinessEvent = useCallback(() => {
    navigation.navigate("Post");
  }, [navigation]);

  const isBusinessMyEventsEmpty =
    isBusiness && showOnlyMyEvents && eventsForMap.length === 0;
  const hasActiveFilters =
    selectedTown !== "All" ||
    selectedCategory !== "All" ||
    selectedDateFilter !== "All" ||
    isNearMeEnabled ||
    showOnlyMyEvents;
  const mapHeight = Math.max(
    260,
    Math.min(420, windowHeight - tabBarHeight - insets.bottom - 330)
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <AppLogoHeader />
      <ScrollView
        style={[
          styles.container,
          { paddingBottom: Math.max(24, insets.bottom + 12) },
        ]}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(96, tabBarHeight + insets.bottom + 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters header and summary (reused logic from Hub in a shared MapFilters component) */}
        <MapFilters
          selectedTown={selectedTown}
          selectedCategory={selectedCategory}
          selectedDateFilter={selectedDateFilter}
          filterSummary={filterSummary}
          error={error}
          towns={TOWNS}
          categories={CATEGORIES}
          categoryGroups={CATEGORY_GROUPS}
          dateFilters={DATE_FILTERS}
          onSelectTown={handleSelectTown}
          onSelectCategory={setSelectedCategory}
          onSelectDateFilter={setSelectedDateFilter}
          isNearMeEnabled={isNearMeEnabled}
          isNearMeLoading={nearMeLoading}
          nearMeMessage={nearMeMessage}
          onToggleNearMe={handleToggleNearMe}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />
        {isBusiness ? (
          <View style={styles.businessToggleRow}>
            <Pressable
              style={({ pressed }) => [
                styles.toggleChip,
                {
                  backgroundColor: showOnlyMyEvents
                    ? theme.accentSoft || theme.card
                    : theme.card,
                  borderColor: showOnlyMyEvents ? theme.accent : theme.border,
                },
                pressed && styles.pressed,
              ]}
              onPress={() =>
                setShowOnlyMyEvents((current) => {
                  const nextValue = !current;
                  setMapActionMessage(
                    nextValue
                      ? "Showing only your posted events."
                      : "Showing all events."
                  );
                  return nextValue;
                })
              }
            >
              <Text
                style={{
                  color: showOnlyMyEvents ? theme.accent : theme.text,
                  fontWeight: showOnlyMyEvents ? "700" : "500",
                }}
              >
                My events only
              </Text>
            </Pressable>
          </View>
        ) : null}
        {mapActionMessage ? (
          <Text style={[styles.actionMessage, { color: theme.textMuted }]}>
            {mapActionMessage}
          </Text>
        ) : null}

        {/* Map area */}
        <View style={styles.mapStage}>
          <View
            style={[
              styles.mapContainer,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                height: mapHeight,
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
                <Text
                  style={[styles.errorText, { color: theme.error || "#ff4d4f" }]}
                >
                  {error}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.retryButton,
                    { borderColor: theme.accent },
                    pressed && styles.pressed,
                  ]}
                  onPress={loadEvents}
                >
                  <Text style={[styles.retryText, { color: theme.accent }]}>
                    Try again
                  </Text>
                </Pressable>
              </View>
            ) : (
              <EventMap
                ref={mapRef}
                theme={theme}
                markers={groupedMarkersForMap}
                selectedMarkerId={selectedMarkerId}
                onSelectMarker={setSelectedMarkerId}
                onPressMarker={handleMarkerPress}
                isNearMeEnabled={isNearMeEnabled}
              />
            )}

            {!loading && eventsForMap.length === 0 && !error && (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {isBusinessMyEventsEmpty
                    ? "No posted events found"
                    : "No events found"}
                </Text>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  {isBusinessMyEventsEmpty
                    ? "Your business events do not match these filters. You can post a new official event."
                    : "No events match this town + date range. Try another filter combo."}
                </Text>
                <View style={styles.emptyActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.emptyAction,
                      { backgroundColor: theme.accent },
                      pressed && styles.pressed,
                    ]}
                    onPress={
                      isBusinessMyEventsEmpty
                        ? handleCreateBusinessEvent
                        : handleCreateBuddyPostFromSearch
                    }
                  >
                    <Text style={styles.emptyActionText}>
                      {isBusinessMyEventsEmpty
                        ? "Post Event"
                        : "Create Buddy Post"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <EventChoiceModal
        visible={!!selectedEventGroup}
        marker={selectedEventGroup}
        theme={theme}
        onClose={() => setSelectedEventGroup(null)}
        onSelectEvent={(event) => {
          setSelectedEventGroup(null);
          handleEventPress(event);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  contentContainer: {
    flexGrow: 1,
  },

  // ---- Map ----
  businessToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    marginBottom: 14,
  },
  toggleChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionMessage: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: -6,
    marginBottom: 10,
  },
  mapStage: {
    flexGrow: 1,
    justifyContent: "center",
  },
  mapContainer: {
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
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
  },
  emptyAction: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  eventPickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  eventPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  eventPickerSheet: {
    maxHeight: "76%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  eventPickerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  eventPickerHeaderCopy: {
    flex: 1,
  },
  eventPickerTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  eventPickerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  eventPickerClose: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  eventPickerCloseText: {
    fontSize: 13,
    fontWeight: "800",
  },
  eventPickerList: {
    maxHeight: 420,
  },
  eventPickerListContent: {
    gap: 10,
    paddingBottom: 8,
  },
  eventPickerCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  eventPickerEventTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  eventPickerEventMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  eventPickerAction: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 10,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },
});
