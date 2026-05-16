import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

function normalizeCategoryLabel(categoryLabel) {
  return categoryLabel === "All categories" || categoryLabel === "All notice types"
    ? "All"
    : categoryLabel;
}

export default function GroupedCategoryModal({
  visible,
  title = "Choose a category",
  groups,
  selectedValue,
  onSelect,
  onClose,
}) {
  const { theme } = useTheme();

  const selectedGroupTitle = useMemo(() => {
    if (!selectedValue || !groups?.length) return "";

    return (
      groups.find((group) =>
        group.options.some((categoryLabel) => {
          const category = normalizeCategoryLabel(categoryLabel);
          return category === selectedValue;
        })
      )?.title || ""
    );
  }, [groups, selectedValue]);

  const initialExpandedTitle = useMemo(() => {
    if (selectedGroupTitle) return selectedGroupTitle;
    return groups?.[0]?.title || "";
  }, [groups, selectedGroupTitle]);

  const [expandedGroupTitle, setExpandedGroupTitle] =
    useState(initialExpandedTitle);

  useEffect(() => {
    if (visible) {
      setExpandedGroupTitle(initialExpandedTitle);
    }
  }, [initialExpandedTitle, visible]);

  const toggleGroup = (groupTitle) => {
    setExpandedGroupTitle((currentTitle) =>
      currentTitle === groupTitle ? "" : groupTitle
    );
  };

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
                <Pressable
                  style={({ pressed }) => [
                    styles.groupHeader,
                    {
                      backgroundColor: theme.pill || theme.card,
                      borderColor:
                        group.title === selectedGroupTitle
                          ? theme.accent
                          : theme.border,
                    },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => toggleGroup(group.title)}
                >
                  <View style={styles.groupHeaderTextWrap}>
                    <Text
                      style={[
                        styles.groupTitle,
                        { color: theme.textMain || theme.text },
                      ]}
                    >
                      {group.title}
                    </Text>
                    <Text
                      style={[
                        styles.groupCount,
                        {
                          color:
                            group.title === selectedGroupTitle
                              ? theme.accent
                              : theme.textMuted,
                        },
                      ]}
                    >
                      {group.options.length} option
                      {group.options.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <Text
                    style={[styles.groupToggle, { color: theme.textMuted }]}
                  >
                    {expandedGroupTitle === group.title ? "-" : "+"}
                  </Text>
                </Pressable>

                {expandedGroupTitle === group.title
                  ? group.options.map((categoryLabel) => {
                      const category = normalizeCategoryLabel(categoryLabel);
                      const isSelected = category === selectedValue;

                      return (
                        <Pressable
                          key={categoryLabel}
                          style={({ pressed }) => [
                            styles.optionRow,
                            {
                              backgroundColor: theme.card,
                              borderColor: "transparent",
                            },
                            isSelected && {
                              backgroundColor: theme.accentSoft || theme.accent,
                              borderColor: theme.accent,
                            },
                            pressed && styles.pressed,
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
                    })
                  : null}
              </View>
            ))}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.modalCloseButton,
              pressed && styles.pressed,
            ]}
            onPress={onClose}
          >
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
  groupHeader: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupHeaderTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  groupCount: {
    fontSize: 12,
    marginTop: 2,
  },
  groupToggle: {
    fontSize: 20,
    fontWeight: "700",
    width: 24,
    textAlign: "center",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    marginLeft: 8,
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
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
