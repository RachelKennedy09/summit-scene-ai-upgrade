import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function GroupedCategoryModal({
  visible,
  title = "Choose a category",
  groups,
  selectedValue,
  onSelect,
  onClose,
}) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.textMain || theme.text }]}>
            {title}
          </Text>

          <ScrollView
            style={styles.modalOptionsScroll}
            showsVerticalScrollIndicator
          >
            {groups.map((group) => (
              <View key={group.title} style={styles.optionGroup}>
                <Text style={[styles.groupTitle, { color: theme.textMuted }]}>
                  {group.title}
                </Text>
                {group.options.map((categoryLabel) => {
                  const category =
                    categoryLabel === "All categories" ? "All" : categoryLabel;
                  const isSelected = category === selectedValue;

                  return (
                    <Pressable
                      key={categoryLabel}
                      style={[
                        styles.optionRow,
                        {
                          backgroundColor: theme.pill || theme.card,
                          borderColor: "transparent",
                        },
                        isSelected && {
                          backgroundColor: theme.accentSoft || theme.accent,
                          borderColor: theme.accent,
                        },
                      ]}
                      onPress={() => onSelect(category)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: theme.textMain || theme.text },
                          isSelected && styles.optionTextSelected,
                        ]}
                      >
                        {categoryLabel}
                      </Text>
                      {isSelected ? (
                        <Text
                          style={[
                            styles.optionCheckMark,
                            { color: theme.accent },
                          ]}
                        >
                          *
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.modalCloseButton} onPress={onClose}>
            <Text style={[styles.modalCloseText, { color: theme.textMuted }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxHeight: "82%",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalOptionsScroll: {
    maxHeight: 420,
  },
  optionGroup: {
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 15,
    flex: 1,
    paddingRight: 12,
  },
  optionTextSelected: {
    fontWeight: "700",
  },
  optionCheckMark: {
    fontSize: 16,
  },
  modalCloseButton: {
    marginTop: 8,
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
