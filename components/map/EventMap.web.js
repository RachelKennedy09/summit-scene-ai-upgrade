import React, { useImperativeHandle } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";

const EventMap = React.forwardRef(function EventMap(
  { theme, markers, onPressMarker },
  ref
) {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {},
    fitToCoordinates: () => {},
  }));

  return (
    <View style={[styles.webFallback, { backgroundColor: theme.card }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Event map is available in the mobile app
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Browse the matching events below.
      </Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {markers.map((marker) => (
          <Pressable
            key={marker.id}
            style={[styles.card, { borderColor: theme.border }]}
            onPress={() => onPressMarker(marker.event)}
          >
            <Text style={[styles.eventTitle, { color: theme.text }]}>
              {marker.event.title}
            </Text>
            {marker.scheduleLabel ? (
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {marker.scheduleLabel}
              </Text>
            ) : null}
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {[marker.event.town, marker.locationLabel].filter(Boolean).join(" | ")}
            </Text>
            <Text style={[styles.action, { color: theme.accent }]}>
              View details
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
});

export default EventMap;

const styles = StyleSheet.create({
  webFallback: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    lineHeight: 17,
  },
  action: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
  },
});
