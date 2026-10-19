import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { useAuth } from "../context/AuthContext";
import { isSummitSceneAdmin } from "../utils/adminAccess";
import { attachAppUsageLifecycle, createAppUsageTracker } from "../utils/appUsageTracker";
import { getAnalyticsInstallationId, sendAppUsage } from "../services/analyticsApi";

let tracker;

export default function AppUsageTracker() {
  const { user, isSessionBootstrapping } = useAuth();
  const admin = isSummitSceneAdmin(user);
  useEffect(() => {
    if (isSessionBootstrapping || admin || __DEV__ ||
        !["ios", "android"].includes(Platform.OS) ||
        Application.applicationId !== "com.rachellauren.summitscene") return undefined;
    if (!tracker) tracker = createAppUsageTracker({
      storage: AsyncStorage, getInstallationId: getAnalyticsInstallationId, send: sendAppUsage,
      metadata: { platform: Platform.OS, appVersion: Application.nativeApplicationVersion, nativeBuild: Application.nativeBuildVersion },
    });
    const detach = attachAppUsageLifecycle(tracker, AppState);
    const interval = setInterval(() => { if (AppState.currentState === "active") tracker.retry(); }, 60000);
    return () => { detach(); clearInterval(interval); tracker.background(); };
  }, [admin, isSessionBootstrapping]);
  return null;
}
