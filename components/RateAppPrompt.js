import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect } from "react";
import { Alert, Linking } from "react-native";

import { useAuth } from "../context/AuthContext";

const RATE_STATUS_KEY = "summitScene.ratePrompt.status";
const RATE_SESSION_COUNT_KEY = "summitScene.ratePrompt.sessionCount";
const RATE_LAST_PROMPT_KEY = "summitScene.ratePrompt.lastPromptAt";
const PROMPT_EVERY_SESSIONS = 5;
const MIN_DAYS_BETWEEN_PROMPTS = 14;

function daysSince(timestamp) {
  if (!timestamp) return Infinity;
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return Infinity;
  return (Date.now() - parsed) / (1000 * 60 * 60 * 24);
}

export default function RateAppPrompt() {
  const { user, isSessionBootstrapping } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function maybePrompt() {
      if (!user || isSessionBootstrapping || !user.hasSeenSafetyTips) return;

      try {
        const [status, sessionCountRaw, lastPromptRaw] = await Promise.all([
          AsyncStorage.getItem(RATE_STATUS_KEY),
          AsyncStorage.getItem(RATE_SESSION_COUNT_KEY),
          AsyncStorage.getItem(RATE_LAST_PROMPT_KEY),
        ]);

        if (cancelled || status === "rated" || status === "never") return;

        const nextSessionCount = Number(sessionCountRaw || 0) + 1;
        await AsyncStorage.setItem(
          RATE_SESSION_COUNT_KEY,
          String(nextSessionCount)
        );

        const shouldPrompt =
          nextSessionCount >= PROMPT_EVERY_SESSIONS &&
          daysSince(lastPromptRaw) >= MIN_DAYS_BETWEEN_PROMPTS;

        if (!shouldPrompt || cancelled) return;

        await AsyncStorage.setItem(RATE_LAST_PROMPT_KEY, String(Date.now()));
        await AsyncStorage.setItem(RATE_SESSION_COUNT_KEY, "0");

        Alert.alert(
          "Enjoying Summit Scene?",
          "A quick rating or note helps us improve the app for Banff, Canmore, and Lake Louise.",
          [
            {
              text: "Not now",
              style: "cancel",
            },
            {
              text: "Don't ask again",
              style: "destructive",
              onPress: () => AsyncStorage.setItem(RATE_STATUS_KEY, "never"),
            },
            {
              text: "Rate app",
              onPress: async () => {
                await AsyncStorage.setItem(RATE_STATUS_KEY, "rated");
                Linking.openURL(
                  "mailto:summitscene@outlook.com?subject=Summit%20Scene%20App%20Feedback"
                ).catch(() => {});
              },
            },
          ]
        );
      } catch {
        // Rating prompts should never block app usage.
      }
    }

    maybePrompt();

    return () => {
      cancelled = true;
    };
  }, [isSessionBootstrapping, user?.id, user?._id, user?.hasSeenSafetyTips]);

  return null;
}
