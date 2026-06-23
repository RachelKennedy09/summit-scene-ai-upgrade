const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ||
  process.env.EXPO_PUBLIC_GOOGLE_SERVICES_JSON;

const plugins = [
  "expo-notifications",
  "expo-apple-authentication",
  [
    "expo-location",
    {
      locationWhenInUsePermission:
        "Summit Scene uses your location to show events near you.",
    },
  ],
  [
    "expo-image-picker",
    {
      photosPermission:
        "Summit Scene lets you choose profile and event photos from your camera roll.",
    },
  ],
].filter(Boolean);

export default {
  expo: {
    name: "Summit Scene",
    slug: "summit-scene",
    version: "1.0.3",
    orientation: "portrait",
    scheme: "summitscene",
    icon: "./assets/app-icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon-android-safe.png",
      resizeMode: "contain",
      backgroundColor: "#F5F3EE",
    },
    plugins,
    ios: {
      bundleIdentifier: "com.rachellauren.summitscene",
      buildNumber: "1",
      supportsTablet: true,
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          "Summit Scene uses your location to show events near you. You can also browse by town without sharing location.",
        NSPhotoLibraryUsageDescription:
          "Summit Scene lets you choose profile and event photos from your camera roll.",
      },
    },
    android: {
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/app-icon.png",
        backgroundColor: "#F5F3EE",
      },
      edgeToEdgeEnabled: true,
      googleServicesFile,
      config: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY
        ? {
            googleMaps: {
              apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
            },
          }
        : undefined,
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_EXTERNAL_STORAGE",
      ],
      blockedPermissions: ["android.permission.RECORD_AUDIO"],
      package: "com.rachellauren.summitscene",
    },
    web: {
      favicon: "./assets/app-icon.png",
    },
    extra: {
      eas: {
        projectId: "368f8454-2a6a-4fef-9951-50b943c38981",
      },
    },
    owner: "rachellaurenxx",
  },
};
