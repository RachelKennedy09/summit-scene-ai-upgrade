import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import {
  registerPushToken,
  unregisterPushToken,
} from "../services/notificationsApi";

function getProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    ""
  );
}

export async function registerDeviceForPushNotifications(authToken) {
  if (!authToken || Platform.OS === "web" || !Device.isDevice) {
    return { registered: false, reason: "unsupported-platform" };
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== "granted") {
    return { registered: false, reason: "permission-not-granted" };
  }

  const projectId = getProjectId();
  if (!projectId) {
    return { registered: false, reason: "missing-project-id" };
  }

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = pushToken?.data || "";
  if (!token) {
    return { registered: false, reason: "missing-token" };
  }

  await registerPushToken({ token, platform: Platform.OS }, authToken);
  return { registered: true };
}

export async function unregisterDeviceForPushNotifications(authToken) {
  if (!authToken || Platform.OS === "web" || !Device.isDevice) {
    return { unregistered: false, reason: "unsupported-platform" };
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== "granted") {
    return { unregistered: false, reason: "permission-not-granted" };
  }

  const projectId = getProjectId();
  if (!projectId) {
    return { unregistered: false, reason: "missing-project-id" };
  }

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = pushToken?.data || "";
  if (!token) {
    return { unregistered: false, reason: "missing-token" };
  }

  await unregisterPushToken({ token }, authToken);
  return { unregistered: true };
}
