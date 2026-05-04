// components/hub/HubFilters.js
// Small, reusable filter header for the Hub screen.
// Lets users choose Town, Category, and Date range using pills + modals.

import React, { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { colors } from "../../theme/colors";
import GroupedCategoryModal from "../common/GroupedCategoryModal";

export default function HubFilters({
  selectedTown, // current town filter
  selectedCategory, // current category filter
  selectedDateFilter, // current date filter label, e.g. "This Week"
  resultSummary, // summary text like "Showing 8 events in Banff this week"
  error, // optional error message (string)
  towns, // array of town options: ["All", "Banff", "Canmore", ...]
  categories, // array of category options: ["All", "Live Music", "Markets", ...]
  categoryGroups,
  dateFilters, // array of date filter labels: ["Any date", "This week", ...]
  onSelectTown, // callback when user chooses a town
  onSelectCategory, // callback when user chooses a category
  onSelectDateFilter, // callback when user chooses a date range
  isNearMeEnabled,
  isNearMeLoading,
  nearMeMessage,
  onToggleNearMe,
  onRetry,
  hasActiveFilters = false,
  onClearFilters,
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
        {/* Error message (if the parent passes one down) */}
        {error ? (
          <View
            style={[
              styles.inlineError,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={[styles.errorText, { color: theme.error || colors.error }]}
            >
              {error}
            </Text>
            {onRetry ? (
              <Pressable
                style={({ pressed }) => [
                  styles.inlineRetry,
                  { borderColor: theme.accent },
                  pressed && styles.pressed,
                ]}
                onPress={onRetry}
              >
                <Text style={[styles.inlineRetryText, { color: theme.accent }]}>
                  Try again
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Pills row: Town, Category, Date */}
        <View style={styles.pillRow}>
          {/* Town Pill */}
          <Pressable
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: theme.pill || theme.card,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
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
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: theme.pill || theme.card,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
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
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: theme.pill || theme.card,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
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

        <View style={styles.quickActionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.nearMeChip,
              {
                backgroundColor: isNearMeEnabled
                  ? theme.accentSoft || theme.card
                  : theme.pill || theme.card,
                borderColor: isNearMeEnabled ? theme.accent : theme.border,
              },
              pressed && styles.pressed,
            ]}
            onPress={onToggleNearMe}
          >
            <Text
              style={[
                styles.nearMeChipText,
                { color: isNearMeEnabled ? theme.accent : theme.textMain },
              ]}
            >
              {isNearMeLoading
                ? "Locating..."
                : isNearMeEnabled
                  ? "Near me on"
                  : "Near me"}
            </Text>
          </Pressable>
          {hasActiveFilters && onClearFilters ? (
            <Pressable
              style={({ pressed }) => [
                styles.clearFiltersButton,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.accent,
                },
                pressed && styles.pressed,
              ]}
              onPress={onClearFilters}
            >
              <Text style={[styles.clearFiltersText, { color: theme.accent }]}>
                Clear filters
              </Text>
            </Pressable>
          ) : null}
        </View>
        {nearMeMessage ? (
          <Text style={[styles.nearMeMessage, { color: theme.textMuted }]}>
            {nearMeMessage}
          </Text>
        ) : null}

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
                  style={({ pressed }) => [
                    styles.townOption,
                    {
                      backgroundColor: theme.pill || theme.card,
                      borderColor: "transparent",
                    },
                    isSelected && {
                      backgroundColor: theme.accentSoft || theme.accent,
                      borderColor: theme.accent,
                    },
                    pressed && styles.pressed,
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
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed && styles.pressed,
              ]}
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
      {categoryGroups ? (
        <GroupedCategoryModal
          visible={isCategoryModalVisible}
          groups={categoryGroups}
          selectedValue={selectedCategory}
          onSelect={(category) => {
            handleCategoryPress(category);
          }}
          onClose={() => setIsCategoryModalVisible(false)}
        />
      ) : null}

      <Modal
        visible={!categoryGroups && isCategoryModalVisible}
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

            <ScrollView
              style={styles.modalOptionsScroll}
              showsVerticalScrollIndicator
            >
            {categories.map((category) => {
              const isSelected = category === selectedCategory;
              return (
                <Pressable
                  key={category}
                  style={({ pressed }) => [
                    styles.townOption,
                    {
                      backgroundColor: theme.pill || theme.card,
                      borderColor: "transparent",
                    },
                    isSelected && {
                      backgroundColor: theme.accentSoft || theme.accent,
                      borderColor: theme.accent,
                    },
                    pressed && styles.pressed,
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
            </ScrollView>

            <Pressable
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed && styles.pressed,
              ]}
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
                  style={({ pressed }) => [
                    styles.townOption,
                    {
                      backgroundColor: theme.pill || theme.card,
                      borderColor: "transparent",
                    },
                    isSelected && {
                      backgroundColor: theme.accentSoft || theme.accent,
                      borderColor: theme.accent,
                    },
                    pressed && styles.pressed,
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
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed && styles.pressed,
              ]}
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
  inlineError: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  inlineRetry: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  inlineRetryText: {
    fontSize: 12,
    fontWeight: "800",
  },
  pillRow: {
    gap: 12,
    marginBottom: 12,
  },
  quickActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  nearMeChip: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  nearMeChipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  clearFiltersButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: "800",
  },
  nearMeMessage: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  pill: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pillLabel: {
    fontSize: 12,
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
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
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
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },
  modalCloseText: {
    fontSize: 14,
  },
});
