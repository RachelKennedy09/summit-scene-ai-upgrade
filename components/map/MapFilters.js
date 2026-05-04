// components/map/MapFilters.js
// Filter controls for the Map screen (Town, Category, Date).

import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { colors } from "../../theme/colors";
import PageHeader from "../common/PageHeader";
import GroupedCategoryModal from "../common/GroupedCategoryModal";

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
  selectedCategory,
  selectedDateFilter,
  filterSummary,
  error,
  towns,
  categories,
  categoryGroups,
  dateFilters,
  onSelectTown,
  onSelectCategory,
  onSelectDateFilter,
  isNearMeEnabled,
  isNearMeLoading,
  nearMeMessage,
  onToggleNearMe,
  hasActiveFilters = false,
  onClearFilters,
}) {
  const { theme } = useTheme();
  const [isTownModalVisible, setIsTownModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isDateModalVisible, setIsDateModalVisible] = useState(false);

  return (
    <>
      <PageHeader
        title="Explore by Map"
        subtitle="See events pinned across Banff, Canmore & Lake Louise."
      />

      {error ? (
        <Text style={[styles.errorText, { color: theme.error || colors.error }]}>
          {error}
        </Text>
      ) : null}

      <View style={styles.pillRow}>
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

      <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />
      <Text style={[styles.filterSummaryText, { color: theme.textMuted }]}>
        {filterSummary}
      </Text>

      <FilterModal
        visible={isTownModalVisible}
        title="Choose a town"
        options={towns.map((town) => (town === "All" ? "All towns" : town))}
        selectedValue={selectedTown === "All" ? "All towns" : selectedTown}
        onSelect={(value) => {
          onSelectTown(value === "All towns" ? "All" : value);
          setIsTownModalVisible(false);
        }}
        onClose={() => setIsTownModalVisible(false)}
        theme={theme}
      />

      <FilterModal
        visible={!categoryGroups && isCategoryModalVisible}
        title="Choose a category"
        options={categories.map((category) =>
          category === "All" ? "All categories" : category
        )}
        selectedValue={
          selectedCategory === "All" ? "All categories" : selectedCategory
        }
        onSelect={(value) => {
          onSelectCategory(value === "All categories" ? "All" : value);
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
  errorText: {
    marginBottom: 6,
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
    borderWidth: 1,
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
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 4,
    marginBottom: 6,
  },
  filterSummaryText: {
    fontSize: 14,
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
