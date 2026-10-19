import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, BackHandler, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Application from "expo-application";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import AppButton from "./common/AppButton";
import { fetchAppVersionInfo } from "../services/appVersionApi";
import { attachUpdateLifecycle, createAppUpdateController, openUpdateStore } from "../utils/appUpdateController";
import { UPDATE_MESSAGE } from "../utils/appUpdatePolicy";

export default function AppUpdateGate({ children }) {
  const { theme } = useTheme();
  const [state, setState] = useState({ checking: true, required: false });
  const [storeError, setStoreError] = useState("");
  const [opening, setOpening] = useState(false);
  const controllerRef = useRef(null);
  // Read the installed native binary, never a JS manifest or OTA version.
  // Expo Go and web do not represent the installed Summit Scene application.
  const installed = {
    version: Application.applicationId === "com.rachellauren.summitscene" ? Application.nativeApplicationVersion : null,
    build: Application.nativeBuildVersion,
  };

  useEffect(() => {
    const controller = createAppUpdateController({ platform: Platform.OS, installed, fetchInfo: fetchAppVersionInfo, onChange: setState });
    controllerRef.current = controller;
    const detach = attachUpdateLifecycle(controller, AppState);
    return () => { detach(); controller.dispose(); controllerRef.current = null; };
  }, [installed.version, installed.build]);

  useEffect(() => {
    if (!state.required) return undefined;
    const back = BackHandler.addEventListener("hardwareBackPress", () => true);
    // Fresh checks permit prompt remote rollback while blocked.
    const interval = setInterval(() => {
      if (AppState.currentState === "active") controllerRef.current?.check();
    }, 60000);
    return () => { back.remove(); clearInterval(interval); };
  }, [state.required]);

  useEffect(() => {
    if (!state.required || !state.expiresAt) return undefined;
    const timer = setTimeout(() => controllerRef.current?.expire(), Math.max(0, state.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [state.required, state.expiresAt]);

  async function handleUpdate() {
    setOpening(true);
    setStoreError("");
    const error = await openUpdateStore(state.policy, (url) => Linking.openURL(url));
    setStoreError(error);
    setOpening(false);
  }

  if (!state.required && (state.ready || !state.checking)) return children;
  // No navigation container is mounted while required. Back, deep links and
  // notification navigation cannot dismiss the confirmed update requirement.
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {!state.required ? (
        <View style={styles.center} accessibilityLiveRegion="polite">
          <ActivityIndicator color={theme.accent} size="large" accessibilityLabel="Checking for updates" />
          <Text style={[styles.helper, { color: theme.textMuted }]}>Checking app version…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Update required</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>{state.policy?.message || UPDATE_MESSAGE}</Text>
          <Text style={[styles.helper, { color: theme.textMuted }]}>Installed {installed.version} ({installed.build}) · Latest {state.policy?.latestVersion}</Text>
          <AppButton title="Update app" onPress={handleUpdate} loading={opening} style={styles.button} />
          <AppButton title="Retry check" variant="outline" onPress={() => { setStoreError(""); controllerRef.current?.check(); }} loading={state.checking} style={styles.button} />
          {storeError || state.error ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.text }]}>{storeError || state.error}</Text> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 24, marginBottom: 14 },
  helper: { fontSize: 14, lineHeight: 21, marginTop: 12, marginBottom: 12 },
  button: { marginTop: 12 },
  error: { fontSize: 15, lineHeight: 23, marginTop: 20 },
});
