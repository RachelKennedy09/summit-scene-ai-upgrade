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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateForApi(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateOnly(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function sameDay(a, b) {
  return Boolean(a && b && formatDateForApi(a) === formatDateForApi(b));
}

function isBetween(date, start, end) {
  if (!date || !start || !end) return false;
  return date > start && date < end;
}

function getMonthGrid(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = addDays(first, -first.getDay());

  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function formatRangeLabel(startDate, endDate) {
  if (!startDate) return "Choose a date";
  if (!endDate || startDate === endDate) return startDate;
  return `${startDate} to ${endDate}`;
}

export default function DateRangeCalendarModal({
  visible,
  title = "Choose dates",
  quickFilters = [],
  selectedFilter,
  selectedStartDate,
  selectedEndDate,
  onSelectQuickFilter,
  onSelectRange,
  onClose,
}) {
  const { theme } = useTheme();
  const initialMonth = parseDateOnly(selectedStartDate) || new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1)
  );
  const [draftStart, setDraftStart] = useState(selectedStartDate || "");
  const [draftEnd, setDraftEnd] = useState(selectedEndDate || "");

  useEffect(() => {
    if (!visible) return;

    const nextMonth = parseDateOnly(selectedStartDate) || new Date();
    setVisibleMonth(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1));
    setDraftStart(selectedStartDate || "");
    setDraftEnd(selectedEndDate || "");
  }, [visible, selectedStartDate, selectedEndDate]);

  const monthDays = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const startObj = parseDateOnly(draftStart);
  const endObj = parseDateOnly(draftEnd);

  function handleDayPress(day) {
    const value = formatDateForApi(day);

    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(value);
      setDraftEnd("");
      return;
    }

    if (value < draftStart) {
      setDraftStart(value);
      setDraftEnd(draftStart);
      return;
    }

    setDraftEnd(value);
  }

  function moveMonth(offset) {
    setVisibleMonth(
      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1)
    );
  }

  function applyRange() {
    if (!draftStart) return;
    onSelectRange?.({
      startDate: draftStart,
      endDate: draftEnd || draftStart,
    });
    onClose?.();
  }

  function handleQuickFilter(filter) {
    onSelectQuickFilter?.(filter);
    onClose?.();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.textMain || theme.text }]}>
            {title}
          </Text>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.quickGrid}>
              {quickFilters.map((filter) => {
                const selected = filter === selectedFilter;
                return (
                  <Pressable
                    key={filter}
                    style={({ pressed }) => [
                      styles.quickChip,
                      {
                        backgroundColor: selected
                          ? theme.accentSoft || theme.card
                          : theme.pill || theme.background,
                        borderColor: selected ? theme.accent : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleQuickFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        { color: selected ? theme.accent : theme.textMain || theme.text },
                      ]}
                    >
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.monthHeader}>
              <Pressable
                style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
                onPress={() => moveMonth(-1)}
              >
                <Text style={[styles.monthButtonText, { color: theme.accent }]}>
                  Prev
                </Text>
              </Pressable>
              <Text style={[styles.monthTitle, { color: theme.textMain || theme.text }]}>
                {MONTH_NAMES[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
                onPress={() => moveMonth(1)}
              >
                <Text style={[styles.monthButtonText, { color: theme.accent }]}>
                  Next
                </Text>
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((weekday) => (
                <Text key={weekday} style={[styles.weekday, { color: theme.textMuted }]}>
                  {weekday}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {monthDays.map((day) => {
                const inMonth = day.getMonth() === visibleMonth.getMonth();
                const selectedStart = sameDay(day, startObj);
                const selectedEnd = sameDay(day, endObj);
                const inRange = isBetween(day, startObj, endObj);

                return (
                  <Pressable
                    key={formatDateForApi(day)}
                    style={({ pressed }) => [
                      styles.dayCell,
                      inRange && {
                        backgroundColor: theme.accentSoft || theme.pill,
                      },
                      (selectedStart || selectedEnd) && {
                        backgroundColor: theme.accent,
                      },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleDayPress(day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color:
                            selectedStart || selectedEnd
                              ? theme.textOnAccent || "#FFFFFF"
                              : inMonth
                                ? theme.textMain || theme.text
                                : theme.textMuted,
                        },
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.selectedLabel, { color: theme.textMuted }]}>
              {formatRangeLabel(draftStart, draftEnd)}
            </Text>
          </ScrollView>

          <View style={styles.footerRow}>
            <Pressable
              style={({ pressed }) => [
                styles.footerButton,
                { borderColor: theme.border, backgroundColor: theme.card },
                pressed && styles.pressed,
              ]}
              onPress={onClose}
            >
              <Text style={[styles.footerButtonText, { color: theme.textMuted }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              disabled={!draftStart}
              style={({ pressed }) => [
                styles.footerButton,
                styles.applyButton,
                {
                  borderColor: theme.accent,
                  backgroundColor: draftStart ? theme.accent : theme.border,
                },
                pressed && draftStart && styles.pressed,
              ]}
              onPress={applyRange}
            >
              <Text style={[styles.applyButtonText, { color: theme.textOnAccent || "#FFFFFF" }]}>
                Apply dates
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: "88%",
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  body: {
    maxHeight: 520,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  quickChipText: {
    fontSize: 14,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthButton: {
    minWidth: 56,
    minHeight: 38,
    justifyContent: "center",
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "800",
  },
  selectedLabel: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  footerButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  applyButton: {
    minWidth: 120,
    alignItems: "center",
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.72,
  },
});
