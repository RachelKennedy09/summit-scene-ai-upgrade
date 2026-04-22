// components/hub/HubFilters.js
// Small, reusable filter header for the Hub screen.
// Lets users choose Town, Category, and Date range using pills + modals.

import React, { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { colors } from "../../theme/colors";

export default function HubFilters({
  displayName, // ex: "Rachel" (for greeting)
  selectedTown, // current town filter
  selectedCategory, // current category filter
  selectedDateFilter, // current date filter label, e.g. "This Week"
  resultSummary, // summary text like "Showing 8 events in Banff this week"
  error, // optional error message (string)
  towns, // array of town options: ["All", "Banff", "Canmore", ...]
  categories, // array of category options: ["All", "Music", "Markets", ...]
  dateFilters, // array of date filter labels: ["Any date", "This week", ...]
  onSelectTown, // callback when user chooses a town
  onSelectCategory, // callback when user chooses a category
  onSelectDateFilter, // callback when user chooses a date range
}) {
  const { theme } = useTheme();

  // LOCAL UI STATE: which picker modal is open
  const [isTownModalVisible, setIsTownModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isDateModalVisible, setIsDateModalVisible] = useState(false);

  // --- HANDLERS: close modal + send selection back to parent ---

  const handleTownPress = (town) => {
    onSelectTown(town);
    setIsTownModalVisible(false);
  };

  const handleCategoryPress = (category) => {
    onSelectCategory(category);
    setIsCategoryModalVisible(false);
  };

  const handleDateFilterPress = (filter) => {
    onSelectDateFilter(filter);
    setIsDateModalVisible(false);
  };

  return (
    <>
      {/* Greeting + helper text + error + top filter pills */}
      <View style={styles.headerContainer}>
        <Text style={[styles.heading, { color: theme.textMain }]}>
          Hello {displayName}!
        </Text>

        <Text style={[styles.subheading, { color: theme.textMuted }]}>
          Welcome to your Summit Scene Hub
        </Text>
        <Text style={[styles.subheading, { color: theme.textMuted }]}>
          Choose a town and category to start exploring events near you.
        </Text>

        {/* Error message (if the parent passes one down) */}
        {error ? (
          <Text
            style={[styles.errorText, { color: theme.error || colors.error }]}
          >
            {error}
          </Text>
        ) : null}

        {/* Pills row: Town, Category, Date */}
        <View style={styles.pillRow}>
          {/* Town Pill */}
          <Pressable
            style={[
              styles.pill,
              {
                backgroundColor: theme.pill || theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setIsTownModalVisible(true)}
          >
            <Text style={[styles.pillLabel, { color: theme.textMuted }]}>
              Town
            </Text>
            <Text style={[styles.pillValue, { color: theme.textMain }]}>
              {selectedTown === "All" ? "All towns ▾" : `${selectedTown} ▾`}
            </Text>
          </Pressable>

          {/* Category Pill */}
          <Pressable
            style={[
              styles.pill,
              {
                backgroundColor: theme.pill || theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setIsCategoryModalVisible(true)}
          >
            <Text style={[styles.pillLabel, { color: theme.textMuted }]}>
              Category
            </Text>
            <Text style={[styles.pillValue, { color: theme.textMain }]}>
              {selectedCategory === "All"
                ? "All categories ▾"
                : `${selectedCategory} ▾`}
            </Text>
          </Pressable>

          {/* Date Pill */}
          <Pressable
            style={[
              styles.pill,
              {
                backgroundColor: theme.pill || theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setIsDateModalVisible(true)}
          >
            <Text style={[styles.pillLabel, { color: theme.textMuted }]}>
              Date
            </Text>
            <Text style={[styles.pillValue, { color: theme.textMain }]}>
              {selectedDateFilter} ▾
            </Text>
          </Pressable>
        </View>

        {/* Thin line + result summary text */}
        <View
          style={[styles.sectionDivider, { backgroundColor: theme.border }]}
        />

        <Text style={[styles.filterSummaryText, { color: theme.textMuted }]}>
          {resultSummary}
        </Text>
      </View>

      {/* --- Town Selector Modal --- */}
      <Modal
        visible={isTownModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTownModalVisible(false)}
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
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Choose a town
            </Text>

            {towns.map((town) => {
              const isSelected = town === selectedTown;
              return (
                <Pressable
                  key={town}
                  style={[
                    styles.townOption,
                    {
                      backgroundColor: theme.pill || theme.card,
                      borderColor: "transparent",
                    },
                    isSelected && {
                      backgroundColor: theme.accentSoft || theme.accent,
                      borderColor: theme.accent,
                    },
                  ]}
                  onPress={() => handleTownPress(town)}
                >
                  <Text
                    style={[
                      styles.townOptionText,
                      { color: theme.textMain },
                      isSelected && styles.townOptionTextSelected,
                    ]}
                  >
                    {town === "All" ? "All towns" : town}
                  </Text>
                  {isSelected && (
                    <Text
                      style={[styles.townCheckMark, { color: theme.accent }]}
                    >
                      ✓
                    </Text>
                  )}
                </Pressable>
              );
            })}

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setIsTownModalVisible(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.textMuted }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* --- Category Selector Modal --- */}
      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCategoryModalVisible(false)}
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
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Choose a category
            </Text>

            {categories.map((category) => {
              const isSelected = category === selectedCategory;
              return (
                <Pressable
                  key={category}
                  style={[
                    styles.townOption,
                    {
                      backgroundColor: theme.pill || theme.card,
                      borderColor: "transparent",
                    },
                    isSelected && {
                      backgroundColor: theme.accentSoft || theme.accent,
                      borderColor: theme.accent,
                    },
                  ]}
                  onPress={() => handleCategoryPress(category)}
                >
                  <Text
                    style={[
                      styles.townOptionText,
                      { color: theme.textMain },
                      isSelected && styles.townOptionTextSelected,
                    ]}
                  >
                    {category === "All" ? "All categories" : category}
                  </Text>
                  {isSelected && (
                    <Text
                      style={[styles.townCheckMark, { color: theme.accent }]}
                    >
                      ✓
                    </Text>
                  )}
                </Pressable>
              );
            })}

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setIsCategoryModalVisible(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.textMuted }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* --- Date Selector Modal --- */}
      <Modal
        visible={isDateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDateModalVisible(false)}
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
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Choose a date range
            </Text>

            {dateFilters.map((filter) => {
              const isSelected = filter === selectedDateFilter;
              return (
                <Pressable
                  key={filter}
                  style={[
                    styles.townOption,
                    {
                      backgroundColor: theme.pill || theme.card,
                      borderColor: "transparent",
                    },
                    isSelected && {
                      backgroundColor: theme.accentSoft || theme.accent,
                      borderColor: theme.accent,
                    },
                  ]}
                  onPress={() => handleDateFilterPress(filter)}
                >
                  <Text
                    style={[
                      styles.townOptionText,
                      { color: theme.textMain },
                      isSelected && styles.townOptionTextSelected,
                    ]}
                  >
                    {filter}
                  </Text>
                  {isSelected && (
                    <Text
                      style={[styles.townCheckMark, { color: theme.accent }]}
                    >
                      ✓
                    </Text>
                  )}
                </Pressable>
              );
            })}

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setIsDateModalVisible(false)}
            >
              <Text style={[styles.modalCloseText, { color: theme.textMuted }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    marginBottom: 12,
  },
  errorText: {
    marginBottom: 8,
    fontSize: 13,
  },
  pillRow: {
    gap: 12,
    marginBottom: 12,
  },
  pill: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pillValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  sectionDivider: {
    height: 1,
    marginTop: 8,
    marginBottom: 6,
  },
  filterSummaryText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "85%",
    maxHeight: "70%",
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
  townOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 8,
    borderWidth: 1,
  },
  townOptionText: {
    fontSize: 15,
  },
  townOptionTextSelected: {
    fontWeight: "700",
  },
  townCheckMark: {
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
  },
});
