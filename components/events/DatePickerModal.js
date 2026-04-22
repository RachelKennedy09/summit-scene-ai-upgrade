// components/events/DatePickerModal.js
// Reusable date-selecting modal used by:
//   • PostEventScreen
//   • EditEventScreen
// Allows selecting a date with a themed modal overlay + buttons.
// Fully theme-aware and supports dark/light + your custom themes.

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../../context/ThemeContext";

export default function DatePickerModal({
  visible,
  initialDate,
  onConfirm,
  onCancel,
  title = "Select date",
}) {
  const { theme } = useTheme();

  // Base date for initialization
  const baseDate = initialDate || new Date();
  const [selectedDate, setSelectedDate] = useState(baseDate);

  // If the modal is not visible, render nothing
  if (!visible) return null;

  // Update state when picker changes
  const handleChange = (_event, date) => {
    if (date) setSelectedDate(date);
  };

  const handleConfirm = () => onConfirm && onConfirm(selectedDate);
  const handleCancel = () => onCancel && onCancel();

  // ---- Theme safety helpers -----
  const bg = theme.card || "#fff";
  const textMain = theme.textMain || theme.text || "#222";
  const textMuted = theme.textMuted || "#777";
  const accent = theme.accent || "#2f7cff";
  const onAccent = theme.textOnAccent || "#fff";

  const isDarkTheme =
    theme.isDark || theme.mode === "dark" || theme.name === "dark";

  const pickerTextColor = isDarkTheme ? "#fff" : "#111";
  const pickerThemeVariant = isDarkTheme ? "dark" : "light";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalContainer, { backgroundColor: bg }]}>
          {/* Title */}
          <Text style={[styles.title, { color: textMain }]}>{title}</Text>

          {/* Date Picker section */}
          <View
            style={[
              styles.pickerWrapper,
              {
                backgroundColor: isDarkTheme ? "#111" : "#f2f2f2",
                paddingHorizontal: Platform.OS === "ios" ? 0 : 8,
              },
            ]}
          >
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleChange}
              textColor={pickerTextColor}
              themeVariant={pickerThemeVariant}
            />
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <Pressable onPress={handleCancel} style={styles.cancelButton}>
              <Text style={[styles.cancelText, { color: textMuted }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              style={[styles.confirmButton, { backgroundColor: accent }]}
            >
              <Text style={[styles.confirmText, { color: onAccent }]}>
                Confirm
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    borderRadius: 16,
    padding: 16,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  pickerWrapper: {
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 16,
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
