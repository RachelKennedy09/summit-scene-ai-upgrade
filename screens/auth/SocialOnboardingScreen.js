import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Logo from "../../assets/logo-app-earth-transparent-alpha.png";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { updateNotificationPreferences } from "../../services/notificationsApi";
import { requestAndRegisterDeviceForPushNotifications } from "../../utils/pushNotifications";

const TOWN_OPTIONS = [
  { label: "Banff", value: "Banff" },
  { label: "Canmore", value: "Canmore" },
  { label: "Lake Louise", value: "Lake Louise" },
  { label: "All Bow Valley", value: "All" },
];

function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Edmonton";
  } catch {
    return "America/Edmonton";
  }
}

export default function SocialOnboardingScreen({ navigation }) {
  const { token, user, updateProfile } = useAuth();
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [selectedTown, setSelectedTown] = useState(
    TOWN_OPTIONS.some((option) => option.value === user?.town) ? user.town : "All"
  );
  const [saving, setSaving] = useState(false);

  const selectedTownLabel = useMemo(
    () =>
      TOWN_OPTIONS.find((option) => option.value === selectedTown)?.label ||
      "All Bow Valley",
    [selectedTown]
  );

  async function finishOnboarding({ enableNotifications }) {
    if (!token || saving) return;

    try {
      setSaving(true);

      if (enableNotifications) {
        const registration = await requestAndRegisterDeviceForPushNotifications(token);
        if (!registration.registered) {
          Alert.alert(
            "Notifications are not enabled",
            "Please allow notifications for Summit Scene on this device, or choose Maybe Later."
          );
          return;
        }

        await updateNotificationPreferences(
          {
            dailyEventsEnabled: true,
            dailyEventsTimeOfDay: "morning",
            dailyEventsTime: "09:00",
            dailyEventsTimezone: getDeviceTimezone(),
            dailyEventsTown: selectedTown,
          },
          token
        );
      }

      await updateProfile({
        town: selectedTown,
        onboardingCompleted: true,
      });

      navigation.reset({ index: 0, routes: [{ name: "tabs" }] });
    } catch (error) {
      Alert.alert(
        "Could not finish setup",
        error.message || "Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <Image source={Logo} style={styles.logo} resizeMode="contain" />

        {step === 1 ? (
          <>
            <Text style={[styles.title, { color: theme.text }]}>
              Where do you want to see what's happening?
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Pick your main area. You can still browse every town anytime.
            </Text>

            <View style={styles.options}>
              {TOWN_OPTIONS.map((option) => {
                const selected = selectedTown === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    style={[
                      styles.option,
                      {
                        backgroundColor: selected
                          ? theme.accentSoft || theme.card
                          : theme.card,
                        borderColor: selected ? theme.accent : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedTown(option.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: selected ? theme.accent : theme.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={21}
                        color={theme.accent}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <AppButton
              title="Continue"
              onPress={() => setStep(2)}
              size="lg"
              style={styles.button}
            />
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.text }]}>
              Want a daily update on what's happening near you?
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Summit Scene can send one daily notification showing how many
              events are happening around {selectedTownLabel}.
            </Text>

            <View
              style={[
                styles.summaryCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Ionicons name="notifications-outline" size={24} color={theme.accent} />
              <View style={styles.summaryCopy}>
                <Text style={[styles.summaryTitle, { color: theme.text }]}>
                  Daily What's Happening
                </Text>
                <Text style={[styles.summaryText, { color: theme.textMuted }]}>
                  Optional, quiet, and editable from Account any time.
                </Text>
              </View>
            </View>

            <AppButton
              title={saving ? "Turning On..." : "Turn On Notifications"}
              onPress={() => finishOnboarding({ enableNotifications: true })}
              loading={saving}
              disabled={saving}
              size="lg"
              style={styles.button}
            />
            <AppButton
              title="Maybe Later"
              onPress={() => finishOnboarding({ enableNotifications: false })}
              disabled={saving}
              variant="outline"
              size="lg"
              style={styles.secondaryButton}
            />
            {saving ? (
              <View style={styles.savingRow}>
                <ActivityIndicator color={theme.accent} />
                <Text style={[styles.savingText, { color: theme.textMuted }]}>
                  Saving your setup...
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 26,
  },
  logo: {
    width: 116,
    height: 126,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  options: {
    gap: 10,
  },
  option: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 18,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  button: {
    marginTop: 12,
  },
  secondaryButton: {
    marginTop: 10,
  },
  savingRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  savingText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
