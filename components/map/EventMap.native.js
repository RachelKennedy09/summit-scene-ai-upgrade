import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";

const INITIAL_REGION = {
  latitude: 51.18,
  longitude: -115.57,
  latitudeDelta: 0.8,
  longitudeDelta: 0.8,
};

const EventMap = React.forwardRef(function EventMap(
  {
    theme,
    markers,
    selectedMarkerId,
    onSelectMarker,
    onPressMarker,
    isNearMeEnabled,
  },
  ref
) {
  return (
    <MapView
      ref={ref}
      style={styles.map}
      initialRegion={INITIAL_REGION}
      moveOnMarkerPress={false}
      showsUserLocation={isNearMeEnabled}
    >
      {markers.map((marker) => {
        const isSelected = marker.id === selectedMarkerId;
        const eventCount = marker.markerCount || marker.events?.length || 1;
        const hasMultipleEvents = eventCount > 1;

        return (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            tracksViewChanges={false}
            onSelect={() => onSelectMarker(marker.id)}
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
              {hasMultipleEvents ? (
                <Text
                  style={[
                    styles.markerCount,
                    { color: isSelected ? theme.background : theme.accent },
                  ]}
                >
                  {eventCount}
                </Text>
              ) : (
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
              )}
            </View>

            <Callout tooltip={false} onPress={() => onPressMarker(marker)}>
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
                  {hasMultipleEvents
                    ? `${eventCount} events here`
                    : marker.event.title}
                </Text>
                {hasMultipleEvents
                  ? marker.events?.slice(0, 2).map((event) => (
                      <Text
                        key={event._id || `${event.title}-${event.date}-${event.time}`}
                        style={[styles.calloutMeta, { color: theme.textMuted }]}
                        numberOfLines={1}
                      >
                        {event.title || "Event"}
                      </Text>
                    ))
                  : null}
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
                  <Text style={[styles.calloutHint, { color: theme.textMuted }]}>
                    Approximate town pin
                  </Text>
                ) : null}
                <Text style={[styles.calloutAction, { color: theme.accent }]}>
                  {hasMultipleEvents ? "Choose event" : "View details"}
                </Text>
              </View>
            </Callout>
          </Marker>
        );
      })}
    </MapView>
  );
});

export default EventMap;

const styles = StyleSheet.create({
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
  markerCount: {
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 14,
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
});
