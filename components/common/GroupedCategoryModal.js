import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

function normalizeCategoryLabel(categoryLabel) {
  return (
    categoryLabel === "All Categories" ||
    categoryLabel === "All categories" ||
    categoryLabel === "All Notice Types" ||
    categoryLabel === "All notice types"
  )
    ? "All"
    : categoryLabel;
}

export default function GroupedCategoryModal({
  visible,
  title = "Choose a category",
  groups,
  selectedValue,
  selectedValues,
  onSelect,
  onClose,
  closeLabel = "Cancel",
  searchable = false,
  searchPlaceholder = "Search",
}) {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const scrollRef = useRef(null);
  const groupOffsetsRef = useRef({});
  const pendingScrollTitleRef = useRef("");
  const scrollRetryRef = useRef(null);
  const selectedSet = new Set(Array.isArray(selectedValues) ? selectedValues : []);
  const filteredGroups = useMemo(() => {
    if (!searchable || !query.trim()) return groups || [];

    const normalizedQuery = query.trim().toLowerCase();
    return (groups || [])
      .map((group) => ({
        ...group,
        options: group.options.filter((option) =>
          String(option).toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((group) => group.options.length);
  }, [groups, query, searchable]);

  const selectedGroupTitle = useMemo(() => {
    const valuesToCheck = selectedSet.size ? selectedSet : new Set([selectedValue]);
    if (!valuesToCheck.size || !groups?.length) return "";

    return (
      groups.find((group) =>
        group.options.some((categoryLabel) => {
          const category = normalizeCategoryLabel(categoryLabel);
          return valuesToCheck.has(category);
        })
      )?.title || ""
    );
  }, [groups, selectedSet, selectedValue]);

  const initialExpandedTitle = useMemo(() => {
    if (selectedGroupTitle) return selectedGroupTitle;
    return groups?.[0]?.title || "";
  }, [groups, selectedGroupTitle]);

  const [expandedGroupTitle, setExpandedGroupTitle] =
    useState(initialExpandedTitle);

  useEffect(() => {
    if (visible) {
      pendingScrollTitleRef.current = "";
      groupOffsetsRef.current = {};
      setQuery("");
      setExpandedGroupTitle(initialExpandedTitle);
    }
  }, [initialExpandedTitle, visible]);

  const scrollToGroup = (groupTitle) => {
    const attemptScroll = (attempt = 0) => {
      const y = groupOffsetsRef.current[groupTitle];
      if (typeof y !== "number") {
        if (attempt < 4) {
          scrollRetryRef.current = setTimeout(
            () => attemptScroll(attempt + 1),
            40
          );
        }
        return;
      }

      scrollRef.current?.scrollTo({
        y: Math.max(y - 8, 0),
        animated: true,
      });
    };

    requestAnimationFrame(() => attemptScroll());
  };

  const toggleGroup = (groupTitle) => {
    const isOpening = expandedGroupTitle !== groupTitle;
    pendingScrollTitleRef.current = isOpening ? groupTitle : "";
    if (scrollRetryRef.current) {
      clearTimeout(scrollRetryRef.current);
      scrollRetryRef.current = null;
    }

    setExpandedGroupTitle((currentTitle) =>
      currentTitle === groupTitle ? "" : groupTitle
    );
  };

  useEffect(() => {
    if (!visible || !expandedGroupTitle) return undefined;
    if (pendingScrollTitleRef.current !== expandedGroupTitle) return undefined;

    const timer = setTimeout(() => {
      requestAnimationFrame(() => scrollToGroup(expandedGroupTitle));
      pendingScrollTitleRef.current = "";
    }, 80);

    return () => clearTimeout(timer);
  }, [expandedGroupTitle, visible]);

  useEffect(() => {
    return () => {
      if (scrollRetryRef.current) {
        clearTimeout(scrollRetryRef.current);
      }
    };
  }, []);

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

          {searchable ? (
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.background || theme.card,
                  borderColor: theme.border,
                  color: theme.textMain || theme.text,
                },
              ]}
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}

          <ScrollView
            ref={scrollRef}
            style={styles.modalOptionsScroll}
            showsVerticalScrollIndicator
          >
            {filteredGroups.map((group) => (
              <View
                key={group.title}
                style={styles.optionGroup}
                onLayout={(event) => {
                  groupOffsetsRef.current[group.title] = event.nativeEvent.layout.y;
                }}
              >
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

                {expandedGroupTitle === group.title || query.trim()
                  ? group.options.map((categoryLabel) => {
                      const category = normalizeCategoryLabel(categoryLabel);
                      const isSelected = selectedSet.size
                        ? selectedSet.has(category)
                        : category === selectedValue;
                      const isAllOption =
                        category === "All" || categoryLabel.startsWith("All ");

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
                              isAllOption && styles.optionTextAll,
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
            {searchable && query.trim() && !filteredGroups.length ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No matching tags.
              </Text>
            ) : null}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.modalCloseButton,
              pressed && styles.pressed,
            ]}
            onPress={onClose}
          >
            <Text style={[styles.modalCloseText, { color: theme.textMuted }]}>
              {closeLabel}
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
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
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
  optionTextAll: {
    fontWeight: "900",
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
  emptyText: {
    fontSize: 14,
    paddingVertical: 18,
    textAlign: "center",
  },
});
