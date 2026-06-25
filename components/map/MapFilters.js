// components/map/MapFilters.js
// Filter controls for the Map screen (Town, Category, Date).

import React, { useState } from "react";
import {
  Image,
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
import GroupedCategoryModal from "../common/GroupedCategoryModal";
import logo from "../../assets/logo-app-earth-transparent-alpha.png";

function getListingTypeLabel(listingType) {
  if (listingType === "events") return "Events";
  if (listingType === "tours") return "Tours & Activities";
  if (listingType === "restaurant_specials") return "Restaurant Specials";
  if (listingType === "classes") return "Fitness & Classes";
  return "All Listings";
}

function FilterModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  theme,
}) {
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
          <Text style={[styles.modalTitle, { color: theme.textMain }]}>
            {title}
          </Text>

          <ScrollView
            style={styles.modalOptionsScroll}
            showsVerticalScrollIndicator
          >
            {options.map((option) => {
              const isSelected = option === selectedValue;

              return (
                <Pressable
                  key={option}
                  style={({ pressed }) => [
                    styles.optionRow,
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
                  onPress={() => onSelect(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: theme.textMain },
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                  {isSelected ? (
                    <Text
                      style={[styles.optionCheckMark, { color: theme.accent }]}
                    >
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
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

export default function MapFilters({
  selectedTown,
  selectedListingType = "events",
  selectedCategory,
  selectedDateFilter,
  filterSummary,
  error,
  towns,
  listingTypes = ["events", "tours", "restaurant_specials", "classes", "All"],
  categories,
  categoryGroups,
  dateFilters,
  onSelectTown,
  onSelectListingType,
  onSelectCategory,
  onSelectDateFilter,
  isNearMeEnabled,
  isNearMeLoading,
  nearMeMessage,
  onToggleNearMe,
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
  const [isTownModalVisible, setIsTownModalVisible] = useState(false);
  const [isListingTypeModalVisible, setIsListingTypeModalVisible] =
    useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isDateModalVisible, setIsDateModalVisible] = useState(false);

  return (
    <>
      <View style={styles.compactHeader}>
        <View style={styles.compactTitleRow}>
          <Image source={logo} style={styles.compactLogo} resizeMode="contain" />
          <Text style={[styles.compactTitle, { color: theme.text || theme.textMain }]}>
            Explore by Map
          </Text>
        </View>
        <Text style={[styles.compactSubtitle, { color: theme.textMuted }]}>
          Events pinned across Banff, Canmore and Lake Louise.
        </Text>
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: theme.error || colors.error }]}>
          {error}
        </Text>
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
            placeholder="Search map events"
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
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
      </ScrollView>

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

      <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />
      <Text style={[styles.filterSummaryText, { color: theme.textMuted }]}>
        {filterSummary}
      </Text>

      <FilterModal
        visible={isTownModalVisible}
        title="Choose a town"
        options={towns.map((town) => (town === "All" ? "All Towns" : town))}
        selectedValue={selectedTown === "All" ? "All Towns" : selectedTown}
        onSelect={(value) => {
          onSelectTown(value === "All Towns" ? "All" : value);
          setIsTownModalVisible(false);
        }}
        onClose={() => setIsTownModalVisible(false)}
        theme={theme}
      />

      <FilterModal
        visible={isListingTypeModalVisible}
        title="Choose what to browse"
        options={listingTypes.map(getListingTypeLabel)}
        selectedValue={getListingTypeLabel(selectedListingType)}
        onSelect={(value) => {
          const nextValue =
            listingTypes.find((listingType) => getListingTypeLabel(listingType) === value) ||
            "All";
          onSelectListingType?.(nextValue);
          setIsListingTypeModalVisible(false);
        }}
        onClose={() => setIsListingTypeModalVisible(false)}
        theme={theme}
      />

      <FilterModal
        visible={!categoryGroups && isCategoryModalVisible}
        title="Choose a category"
        options={categories.map((category) =>
          category === "All" ? "All Categories" : category
        )}
        selectedValue={
          selectedCategory === "All" ? "All Categories" : selectedCategory
        }
        onSelect={(value) => {
          onSelectCategory(value === "All Categories" ? "All" : value);
          setIsCategoryModalVisible(false);
        }}
        onClose={() => setIsCategoryModalVisible(false)}
        theme={theme}
      />

      {categoryGroups ? (
        <GroupedCategoryModal
          visible={isCategoryModalVisible}
          groups={categoryGroups}
          selectedValue={selectedCategory}
          onSelect={(category) => {
            onSelectCategory(category);
            setIsCategoryModalVisible(false);
          }}
          onClose={() => setIsCategoryModalVisible(false)}
        />
      ) : null}

      <FilterModal
        visible={isDateModalVisible}
        title="Choose a date range"
        options={dateFilters}
        selectedValue={selectedDateFilter}
        onSelect={(value) => {
          onSelectDateFilter(value);
          setIsDateModalVisible(false);
        }}
        onClose={() => setIsDateModalVisible(false)}
        theme={theme}
      />
    </>
  );
}

const styles = StyleSheet.create({
  compactHeader: {
    paddingTop: 6,
    marginBottom: 10,
  },
  compactTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 2,
  },
  compactLogo: {
    width: 42,
    height: 42,
    flexShrink: 0,
  },
  compactTitle: {
    flex: 1,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "800",
  },
  compactSubtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  errorText: {
    marginBottom: 6,
    fontSize: 13,
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
  pillRow: {
    gap: 8,
    paddingBottom: 8,
  },
  pill: {
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
    gap: 7,
  },
  pillValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  pillIndicator: {
    fontSize: 18,
    lineHeight: 18,
    fontWeight: "900",
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
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 4,
    marginBottom: 6,
  },
  filterSummaryText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
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
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
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
    color: colors.accent,
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
