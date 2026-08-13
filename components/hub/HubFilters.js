// components/hub/HubFilters.js
// Small, reusable filter header for the Hub screen.
// Lets users choose Town, Category, and Date range using pills + modals.

import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { colors } from "../../theme/colors";
import DateRangeCalendarModal from "../common/DateRangeCalendarModal";
import GroupedCategoryModal from "../common/GroupedCategoryModal";

function getListingTypeLabel(listingType) {
  if (listingType === "events") return "Events";
  if (listingType === "tours") return "Tours & Activities";
  if (listingType === "restaurant_specials") return "Restaurant Specials";
  if (listingType === "classes") return "Fitness & Classes";
  return "All Listings";
}

export default function HubFilters({
  selectedTown, // current town filter
  selectedListingType = "events",
  selectedCategory, // current category filter
  selectedDateFilter, // current date filter label, e.g. "This Week"
  selectedStartDate,
  selectedEndDate,
  resultSummary, // summary text like "Showing 8 events in Banff this week"
  error, // optional error message (string)
  towns, // array of town options: ["All", "Banff", "Canmore", ...]
  listingTypes = ["events", "tours", "restaurant_specials", "classes", "All"],
  categories, // array of category options: ["All", "Live Music", "Markets", ...]
  categoryGroups,
  dateFilters, // array of date filter labels: ["Any date", "This week", ...]
  onSelectTown, // callback when user chooses a town
  onSelectListingType,
  onSelectCategory, // callback when user chooses a category
  onSelectDateFilter, // callback when user chooses a date range
  onSelectDateRange,
  isNearMeEnabled,
  isNearMeLoading,
  nearMeMessage,
  onToggleNearMe,
  onRetry,
  hasActiveFilters = false,
  onClearFilters,
  searchQuery = "",
  activeSearch = "",
  searchStatus = "",
  onChangeSearchQuery,
  onApplySearch,
  onClearSearch,
}) {
  const { theme } = useTheme();

  // LOCAL UI STATE: which picker modal is open
  const [isTownModalVisible, setIsTownModalVisible] = useState(false);
  const [isListingTypeModalVisible, setIsListingTypeModalVisible] =
    useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isDateModalVisible, setIsDateModalVisible] = useState(false);

  // --- HANDLERS: close modal + send selection back to parent ---

  const handleTownPress = (town) => {
    onSelectTown(town);
    setIsTownModalVisible(false);
  };

  const handleListingTypePress = (listingType) => {
    onSelectListingType?.(listingType);
    setIsListingTypeModalVisible(false);
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

        <View
          style={[
            styles.searchPanel,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.searchRow}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.textMain || theme.text,
                },
              ]}
              value={searchQuery}
              onChangeText={onChangeSearchQuery}
              placeholder="Event, venue, business, or post"
              placeholderTextColor={theme.textMuted}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={onApplySearch}
            />
            <Pressable
              style={({ pressed }) => [
                styles.searchButton,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}
              onPress={onApplySearch}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>
          {activeSearch ? (
            <View style={styles.activeSearchRow}>
              <Text style={[styles.activeSearchText, { color: theme.textMuted }]}>
                Searching for "{activeSearch}"
              </Text>
              <Pressable onPress={onClearSearch}>
                <Text style={[styles.clearSearchText, { color: theme.accent }]}>
                  Clear
                </Text>
              </Pressable>
            </View>
          ) : null}
          {searchStatus ? (
            <Text style={[styles.searchStatusText, { color: theme.textMuted }]}>
              {searchStatus}
            </Text>
          ) : null}
        </View>

        {/* Compact filter row: Browse, Category, Town, Date */}
        <View style={styles.pillRow}>
          {/* Listing type Pill */}
          <Pressable
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: theme.pill || theme.card,
                borderColor: theme.border,
              },
              pressed && styles.pressed,
            ]}
            onPress={() => setIsListingTypeModalVisible(true)}
          >
            <View style={styles.pillContent}>
              <Text style={[styles.pillValue, { color: theme.textMain }]}>
                {getListingTypeLabel(selectedListingType)}
              </Text>
              <Text style={[styles.pillIndicator, { color: theme.accent }]}>
                +
              </Text>
            </View>
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
            <View style={styles.pillContent}>
              <Text style={[styles.pillValue, { color: theme.textMain }]}>
                {selectedCategory === "All" ? "Category" : selectedCategory}
              </Text>
              <Text style={[styles.pillIndicator, { color: theme.accent }]}>
                +
              </Text>
            </View>
          </Pressable>

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
            <View style={styles.pillContent}>
              <Text style={[styles.pillValue, { color: theme.textMain }]}>
                {selectedTown === "All" ? "Town" : selectedTown}
              </Text>
              <Text style={[styles.pillIndicator, { color: theme.accent }]}>
                +
              </Text>
            </View>
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
            <View style={styles.pillContent}>
              <Text style={[styles.pillValue, { color: theme.textMain }]}>
                {selectedDateFilter}
              </Text>
              <Text style={[styles.pillIndicator, { color: theme.accent }]}>
                +
              </Text>
            </View>
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
                    {town === "All" ? "All Towns" : town}
                  </Text>
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

      {/* --- Listing Type Selector Modal --- */}
      <Modal
        visible={isListingTypeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsListingTypeModalVisible(false)}
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
              Choose what to browse
            </Text>

            {listingTypes.map((listingType) => {
              const isSelected = listingType === selectedListingType;
              const label = getListingTypeLabel(listingType);
              return (
                <Pressable
                  key={listingType}
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
                  onPress={() => handleListingTypePress(listingType)}
                >
                  <Text
                    style={[
                      styles.townOptionText,
                      { color: theme.textMain },
                      isSelected && styles.townOptionTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setIsListingTypeModalVisible(false)}
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
                    {category === "All" ? "All Categories" : category}
                  </Text>
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
      <DateRangeCalendarModal
        visible={isDateModalVisible}
        title="Choose dates"
        quickFilters={dateFilters}
        selectedFilter={selectedDateFilter}
        selectedStartDate={selectedStartDate}
        selectedEndDate={selectedEndDate}
        onSelectQuickFilter={handleDateFilterPress}
        onSelectRange={onSelectDateRange}
        onClose={() => setIsDateModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: "800",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 8,
  },
  quickActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  nearMeChip: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
  },
  nearMeChipText: {
    fontSize: 14,
    fontWeight: "800",
  },
  clearFiltersButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: "center",
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: "800",
  },
  nearMeMessage: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  searchPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 44,
  },
  searchButton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  activeSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  activeSearchText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: "900",
  },
  searchStatusText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  pill: {
    flexBasis: "48%",
    flexGrow: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  pillContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minWidth: 0,
  },
  pillValue: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  pillIndicator: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: "900",
  },
  sectionDivider: {
    height: 1,
    marginTop: 4,
    marginBottom: 5,
  },
  filterSummaryText: {
    fontSize: 14,
    lineHeight: 20,
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
