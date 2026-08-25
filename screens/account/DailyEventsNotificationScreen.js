import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "../../services/notificationsApi";
import { requestAndRegisterDeviceForPushNotifications } from "../../utils/pushNotifications";

const TIME_OPTIONS = [
  { label: "Morning", value: "morning", time: "09:00" },
  { label: "Afternoon", value: "afternoon", time: "13:00" },
  { label: "Evening", value: "evening", time: "17:00" },
];
const TOWN_OPTIONS = [
  { label: "Bow Valley", value: "All" },
  { label: "Banff", value: "Banff" },
  { label: "Canmore", value: "Canmore" },
  { label: "Lake Louise", value: "Lake Louise" },
];

function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Edmonton";
  } catch {
    return "America/Edmonton";
  }
}

function normalizePreferences(preferences = {}, user = {}) {
  return {
    dailyEventsEnabled: Boolean(preferences.dailyEventsEnabled),
    dailyEventsTimeOfDay: preferences.dailyEventsTimeOfDay || "morning",
    dailyEventsTime: preferences.dailyEventsTime || "09:00",
    dailyEventsTimezone: preferences.dailyEventsTimezone || getDeviceTimezone(),
    dailyEventsTown:
      preferences.dailyEventsTown ||
      (["Banff", "Canmore", "Lake Louise"].includes(user?.town)
        ? user.town
        : "All"),
  };
}

function formatTime(value) {
  const option = TIME_OPTIONS.find((item) => item.time === value);
  if (option) return option.label;
  return value || "Morning";
}

export default function DailyEventsNotificationScreen() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const [preferences, setPreferences] = useState(() =>
    normalizePreferences(user?.notificationPreferences, user)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadPreferences = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");
      const data = await fetchNotificationPreferences(token);
      setPreferences(normalizePreferences(data, user));
    } catch (loadError) {
      setError(loadError.message || "Could not load notification settings.");
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  async function savePreferences(nextPreferences) {
    if (!token || saving) return;

    try {
      setSaving(true);
      const result = await updateNotificationPreferences(nextPreferences, token);
      setPreferences(
        normalizePreferences(result.notificationPreferences || nextPreferences, user)
      );
    } catch (saveError) {
      Alert.alert(
        "Could not update notifications",
        saveError.message || "Please try again."
      );
      await loadPreferences();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(value) {
    if (value) {
      const registration = await requestAndRegisterDeviceForPushNotifications(token);
      if (!registration.registered) {
        Alert.alert(
          "Notifications are not enabled",
          "Please allow notifications for Summit Scene on this device, then try again."
        );
        return;
      }
    }

    await savePreferences({
      ...preferences,
      dailyEventsEnabled: value,
      dailyEventsTimezone: getDeviceTimezone(),
    });
  }

  function handleChooseTime(option) {
    savePreferences({
      ...preferences,
      dailyEventsTimeOfDay: option.value,
      dailyEventsTime: option.time,
      dailyEventsTimezone: getDeviceTimezone(),
    });
  }

  function handleChooseTown(option) {
    savePreferences({
      ...preferences,
      dailyEventsTown: option.value,
      dailyEventsTimezone: getDeviceTimezone(),
    });
  }

  const selectedTown =
    TOWN_OPTIONS.find((item) => item.value === preferences.dailyEventsTown)
      ?.label || "Bow Valley";

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <PageHeader
          title="Daily What's Happening"
          subtitle="Get a daily notification with what's happening near you."
        />

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.helperText, { color: theme.textMuted }]}>
              Loading notification settings...
            </Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Could not load settings
            </Text>
            <Text style={[styles.helperText, { color: theme.textMuted }]}>
              {error}
            </Text>
            <Pressable
              style={[styles.outlineButton, { borderColor: theme.accent }]}
              onPress={loadPreferences}
            >
              <Text style={[styles.outlineButtonText, { color: theme.accent }]}>
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error ? (
          <>
            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingCopy}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    Daily What's Happening
                  </Text>
                  <Text style={[styles.helperText, { color: theme.textMuted }]}>
                    Get a daily notification with what's happening near you.
                  </Text>
                </View>
                <Switch
                  value={preferences.dailyEventsEnabled}
                  onValueChange={handleToggle}
                  disabled={saving}
                  trackColor={{
                    false: theme.border,
                    true: theme.accentSoft || theme.accent,
                  }}
                  thumbColor={preferences.dailyEventsEnabled ? theme.accent : "#FFFFFF"}
                />
              </View>
              <Text style={[styles.statusText, { color: theme.textMuted }]}>
                {preferences.dailyEventsEnabled
                  ? `On - ${formatTime(preferences.dailyEventsTime)} around ${selectedTown}`
                  : "Off"}
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              When
            </Text>
            <View style={styles.chipRow}>
              {TIME_OPTIONS.map((option) => {
                const selected = preferences.dailyEventsTimeOfDay === option.value;
                return (
                  <Pressable
                    key={option.value}
                    disabled={saving}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? theme.accentSoft || theme.card
                          : theme.card,
                        borderColor: selected ? theme.accent : theme.border,
                      },
                    ]}
                    onPress={() => handleChooseTime(option)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? theme.accent : theme.textMuted },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Area
            </Text>
            <View style={styles.chipRow}>
              {TOWN_OPTIONS.map((option) => {
                const selected = preferences.dailyEventsTown === option.value;
                return (
                  <Pressable
                    key={option.value}
                    disabled={saving}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? theme.accentSoft || theme.card
                          : theme.card,
                        borderColor: selected ? theme.accent : theme.border,
                      },
                    ]}
                    onPress={() => handleChooseTown(option)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? theme.accent : theme.textMuted },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.helperText, { color: theme.textMuted }]}>
              Notification timing uses this device's timezone:
              {" "}
              {preferences.dailyEventsTimezone || getDeviceTimezone()}.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    paddingBottom: 30,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingCopy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    minHeight: 40,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  outlineButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginTop: 12,
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
});
