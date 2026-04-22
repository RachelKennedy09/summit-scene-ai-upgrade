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
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "../../context/ThemeContext";

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
        {/* Edit */}
        <Pressable
          onPress={onEdit}
          style={[
            styles.ownerButton,
            {
              backgroundColor: theme.accent,
            },
          ]}
        >
          <Text
            style={[
              styles.ownerButtonText,
              { color: theme.textOnAccent || theme.background },
            ]}
          >
            Edit Event
          </Text>
        </Pressable>

        {/* Delete */}
        <Pressable
          onPress={onDelete}
          style={[
            styles.ownerButton,
            {
              backgroundColor: theme.danger || "#ff4d4f",
            },
          ]}
        >
          <Text
            style={[
              styles.ownerButtonText,
              { color: theme.textOnDanger || theme.background },
            ]}
          >
            Delete Event
          </Text>
        </Pressable>
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
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  ownerButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
});
