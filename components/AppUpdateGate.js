import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../context/ThemeContext";
import { fetchAppVersionInfo } from "../services/appVersionApi";

function parseVersion(value) {
  return String(value || "")
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

function isVersionOlder(currentVersion, minimumVersion) {
  const current = parseVersion(currentVersion);
  const minimum = parseVersion(minimumVersion);
  const length = Math.max(current.length, minimum.length, 3);

  for (let index = 0; index < length; index += 1) {
    const currentPart = current[index] || 0;
    const minimumPart = minimum[index] || 0;

    if (currentPart < minimumPart) return true;
    if (currentPart > minimumPart) return false;
  }

  return false;
}

export default function AppUpdateGate({ children }) {
  const { theme } = useTheme();
  const [checking, setChecking] = useState(true);
  const [versionInfo, setVersionInfo] = useState(null);
  const [requiresUpdate, setRequiresUpdate] = useState(false);

  const currentVersion = useMemo(
    () => Constants.expoConfig?.version || "0.0.0",
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function checkVersion() {
      try {
        const info = await fetchAppVersionInfo();
        if (cancelled) return;

        setVersionInfo(info);
        setRequiresUpdate(
          isVersionOlder(currentVersion, info.minimumSupportedVersion)
        );
      } catch {
        if (!cancelled) {
          setRequiresUpdate(false);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    checkVersion();

    return () => {
      cancelled = true;
    };
  }, [currentVersion]);

  async function handleUpdatePress() {
    const storeUrl =
      Platform.OS === "android"
        ? versionInfo?.androidStoreUrl
        : versionInfo?.iosStoreUrl;

    if (storeUrl) {
      Linking.openURL(storeUrl).catch(() => {});
    }
  }

  if (checking) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} size="large" />
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Checking app version...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!requiresUpdate) {
    return children;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.updateContainer}>
        <Text style={[styles.title, { color: theme.text }]}>
          Update Summit Scene
        </Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          {versionInfo?.message ||
            "A newer version of Summit Scene is required to keep using the app."}
        </Text>
        <Text style={[styles.versionText, { color: theme.textMuted }]}>
          Installed version {currentVersion}
          {versionInfo?.latestVersion ? ` | Latest ${versionInfo.latestVersion}` : ""}
        </Text>
        <Pressable
          style={[styles.updateButton, { backgroundColor: theme.accent }]}
          onPress={handleUpdatePress}
        >
          <Text style={styles.updateButtonText}>
            {Platform.OS === "android" ? "Update in Google Play" : "Update in App Store"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  helperText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
  },
  updateContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 14,
  },
  versionText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 22,
  },
  updateButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 18,
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
});
