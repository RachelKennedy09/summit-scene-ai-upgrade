// components/events/EventOwnerSection.js
// This section appears ONLY when the logged-in user is the creator of the event.
// It shows:
//   • A badge saying "This is your event"
//   • Buttons: Edit Event + Delete Event
//
// Parent screens (EventDetailScreen) pass in:
//   onEdit()    → navigates to EditEventScreen
//   onDelete()  → confirms + deletes from backend

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import AppButton from "../common/AppButton";

export default function EventOwnerSection({ onEdit, onDelete }) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.ownerSection,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: 1,
        },
      ]}
    >
      {/* Owner badge */}
      <Text
        style={[
          styles.ownerBadge,
          {
            backgroundColor: theme.accent,
            color: theme.textOnAccent || theme.background,
          },
        ]}
      >
        This is your event
      </Text>

      {/* Edit + Delete buttons */}
      <View style={styles.ownerButtonsRow}>
        <AppButton
          title="Edit Event"
          onPress={onEdit}
          variant="primary"
          style={styles.ownerButton}
        />

        <AppButton
          title="Delete Event"
          onPress={onDelete}
          variant="highlight"
          style={styles.ownerButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ownerSection: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
  },

  ownerBadge: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  ownerButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },

  ownerButton: {
    flex: 1,
  },
});
