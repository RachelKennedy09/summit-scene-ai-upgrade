// components/TimePickerModal.js
// Reusable “pick a time” modal for start / end time on events.
// - Uses 12-hour format with AM/PM
// - Returns a real Date object via onConfirm so callers can save it.

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";

function TimePickerModal({
  visible, // boolean: show/hide the modal
  initialTime, // Date or null: pre-fill the picker, defaults to now
  onConfirm, // function(Date): called with chosen time
  onCancel, // function: called when user cancels
  title = "Select time",
}) {
  const { theme } = useTheme();

  // ---------- Derive the starting hour/minute/AMPM from initialTime ----------

  // If no initialTime is passed in, use "now" as the base
  const baseDate = initialTime || new Date();
  const initialHours24 = baseDate.getHours();
  const initialMinutes = baseDate.getMinutes();

  // Convert 24h -> 12h with AM/PM
  const initialAmPm = initialHours24 >= 12 ? "PM" : "AM";
  const initialHour12 = ((initialHours24 + 11) % 12) + 1;

  // Round minutes to nearest 5, clamp to 55, pad with leading 0
  const roundTo5 = Math.round(initialMinutes / 5) * 5;
  const clampedMinutes = Math.min(55, roundTo5);
  const initialMinute = String(clampedMinutes).padStart(2, "0");

  // ---------- Local state for the current selection ----------

  const [hour, setHour] = useState(initialHour12); // 1–12
  const [minute, setMinute] = useState(initialMinute); // "00", "05", ...
  const [ampm, setAmpm] = useState(initialAmPm); // "AM" | "PM"

  if (!visible) return null;

  // ---------- Theming helpers ----------
  // These fall back safely if a theme is missing a property.
  const textColor = theme.text || theme.textMain || "#111";
  const textMuted = theme.textMuted || "#777";
  const accent = theme.accent || "#2f7cff";
  const onAccent = theme.textOnAccent || theme.background || "#fff";

  // Options for each column
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
  const MINUTES = [
    "00",
    "05",
    "10",
    "15",
    "20",
    "25",
    "30",
    "35",
    "40",
    "45",
    "50",
    "55",
  ];
  const AMPM = ["AM", "PM"];

  // ---------- Build the final Date and send it back ----------
  function handleConfirm() {
    // Start from the same baseDate (to keep the same day)
    const base = new Date(baseDate.getTime());

    // Convert selected 12h + AM/PM back to 24h
    let h24 = hour % 12; // 12 -> 0
    if (ampm === "PM") h24 += 12;

    // Apply hours + minutes, clear seconds/millis
    base.setHours(h24, parseInt(minute, 10), 0, 0);

    if (onConfirm) {
      onConfirm(base);
    }
  }

  // Shared style base for each pill option
  const optionBase = {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginVertical: 2,
    alignItems: "center",
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.pickerModalContent,
            {
              backgroundColor: theme.card || "#fff",
              borderColor: theme.border || "rgba(0,0,0,0.08)",
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: textColor }]}>{title}</Text>

          <View style={styles.timePickerRow}>
            {/* Hours column */}
            <View style={styles.timeColumn}>
              <Text style={[styles.timeColumnLabel, { color: textMuted }]}>
                Hour
              </Text>
              <ScrollView style={{ maxHeight: 170 }}>
                {HOURS.map((h) => {
                  const selected = h === hour;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => setHour(h)}
                      style={[
                        optionBase,
                        selected && { backgroundColor: accent },
                      ]}
                    >
                      <Text
                        style={{
                          color: selected ? onAccent : textColor,
                          fontWeight: selected ? "700" : "400",
                        }}
                      >
                        {h}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Minutes column */}
            <View style={styles.timeColumn}>
              <Text style={[styles.timeColumnLabel, { color: textMuted }]}>
                Min
              </Text>
              <ScrollView style={{ maxHeight: 170 }}>
                {MINUTES.map((m) => {
                  const selected = m === minute;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setMinute(m)}
                      style={[
                        optionBase,
                        selected && { backgroundColor: accent },
                      ]}
                    >
                      <Text
                        style={{
                          color: selected ? onAccent : textColor,
                          fontWeight: selected ? "700" : "400",
                        }}
                      >
                        {m}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* AM / PM column */}
            <View style={styles.timeColumn}>
              <Text style={[styles.timeColumnLabel, { color: textMuted }]}>
                AM / PM
              </Text>
              <ScrollView style={{ maxHeight: 170 }}>
                {AMPM.map((val) => {
                  const selected = val === ampm;
                  return (
                    <Pressable
                      key={val}
                      onPress={() => setAmpm(val)}
                      style={[
                        optionBase,
                        selected && { backgroundColor: accent },
                      ]}
                    >
                      <Text
                        style={{
                          color: selected ? onAccent : textColor,
                          fontWeight: selected ? "700" : "400",
                        }}
                      >
                        {val}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Footer buttons */}
          <View style={styles.pickerButtonsRow}>
            <Pressable style={styles.pickerSecondaryButton} onPress={onCancel}>
              <Text style={[styles.pickerSecondaryText, { color: textMuted }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[styles.pickerPrimaryButton, { backgroundColor: accent }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.pickerPrimaryText, { color: onAccent }]}>
                Use this time
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default TimePickerModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  pickerModalContent: {
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  timePickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  timeColumn: {
    flex: 1,
    alignItems: "center",
  },
  timeColumnLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  pickerButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },
  pickerSecondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickerSecondaryText: {
    fontSize: 14,
  },
  pickerPrimaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickerPrimaryText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
