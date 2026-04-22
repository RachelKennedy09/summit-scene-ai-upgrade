// components/SelectModal.js
// Generic "picker" modal used anywhere we need:
//   • A simple list of string options
//   • Single selection

import React from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function SelectModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) {
  const { theme } = useTheme();

  // If not visible, don't render anything
  if (!visible) return null;

  const textMain = theme.textMain || theme.text || "#111";
  const textMuted = theme.textMuted || "#777";
  const accent = theme.accent || "#2f7cff";
  const accentSoft = theme.accentSoft || "rgba(47, 124, 255, 0.15)";
  const cardBg = theme.card || "#fff";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
          {/* Title */}
          <Text style={[styles.modalTitle, { color: textMain }]}>{title}</Text>

          {/* Option list */}
          {options.map((opt) => {
            const isSelected = opt === selectedValue;
            return (
              <Pressable
                key={opt}
                style={[
                  styles.optionRow,
                  isSelected && { backgroundColor: accentSoft },
                ]}
                onPress={() => onSelect(opt)}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: textMain,
                      fontWeight: isSelected ? "700" : "400",
                    },
                  ]}
                >
                  {opt}
                </Text>
                {isSelected && (
                  <Text style={[styles.check, { color: accent }]}>✓</Text>
                )}
              </Pressable>
            );
          })}

          {/* Cancel link-style button */}
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={[styles.cancelText, { color: accent }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  optionText: {
    fontSize: 16,
  },
  check: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 12,
    alignSelf: "flex-end",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
