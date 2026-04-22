// context/ThemeContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes as themeMap } from "../theme/themes";
import { colors } from "../theme/colors";
import { useAuth } from "./AuthContext";

const THEME_STORAGE_PREFIX = "appTheme";
const DEFAULT_THEME_NAME = "light";
const DEFAULT_IS_DARK = false;
const ThemeContext = createContext(null);

function makeDarkFromBase(base) {
  // Special dark treatment for Christmas (was rainbow)
  if (base.key === "rainbow") {
    return {
      ...base,
      key: "rainbow-dark",
      label: "Christmas (Dark)",
      isDark: true,

      // Deep evergreen night
      background: "#020B0A",
      card: "#041514",
      pill: "#052E24",

      // Text
      text: "#F9FAFB",
      textMain: "#F9FAFB",
      textMuted: "#D1FAE5",

      textOnAccent: "#021109",

      accent: "#15fa5aff",
      accentSoft: "rgba(250, 204, 21, 0.22)",

      border: "#064E3B",

      // Tabs: mix of green / red / gold
      tabBarBackground: "#020617",
      tabBarActive: "#FACC15",
      tabBarInactive: "#EF4444",

      tabActive: "#22C55E",
      tabInactive: "#EF4444",
      tabBackground: "#020617",

      error: colors.error,
      cta: colors.cta,
      danger: colors.danger,
    };
  }

  // Default dark mode for feminine / masculine etc.
  return {
    ...base,
    isDark: true,

    background: "#020617",
    card: "#020617",
    pill: "#111827",

    text: "#F9FAFB",
    textMain: "#F9FAFB",
    textMuted: "#9CA3AF",
    textOnAccent: "#FFFFFF",

    border: "#1F2933",
    hairline: "#374151",

    tabBarBackground: "#020617",
    tabBarActive: base.accent || "#F28BB2",
    tabBarInactive: "#6B7280",
    tabActive: base.accent || "#F28BB2",
    tabInactive: "#6B7280",
    tabBackground: "#020617",

    error: colors.error,
    cta: colors.cta,
    danger: colors.danger,
  };
}

export function ThemeProvider({ children }) {
  const { user } = useAuth();

  // Allowed keys: "light", "feminine", "masculine", "rainbow"
  const [themeName, setThemeName] = useState(DEFAULT_THEME_NAME);

  // Separate appearance toggle
  const [isDark, setIsDark] = useState(DEFAULT_IS_DARK);

  const [isThemeLoading, setIsThemeLoading] = useState(true);
  const userId = user?._id || user?.id || null;
  const themeStorageKey = userId ? `${THEME_STORAGE_PREFIX}:${userId}` : null;

  // Restore the theme for the currently logged-in user.
  // If there is no user yet, fall back to the neutral default.
  useEffect(() => {
    (async () => {
      try {
        setIsThemeLoading(true);
        setThemeName(DEFAULT_THEME_NAME);
        setIsDark(DEFAULT_IS_DARK);

        if (!themeStorageKey) {
          return;
        }

        const stored = await AsyncStorage.getItem(themeStorageKey);
        if (stored) {
          // JSON string { themeName, isDark }
          try {
            const parsed = JSON.parse(stored);

            if (parsed && typeof parsed === "object") {
              if (parsed.themeName && themeMap[parsed.themeName]) {
                setThemeName(parsed.themeName);
              }

              if (typeof parsed.isDark === "boolean") {
                setIsDark(parsed.isDark);
              }

              setIsThemeLoading(false);
              return;
            }
          } catch {
            if (themeMap[stored]) {
              // If they had "dark" before, just treat it as dark appearance
              if (stored === "dark") {
                setThemeName(DEFAULT_THEME_NAME);
                setIsDark(true);
              } else {
                setThemeName(stored);
                setIsDark(false);
              }
            }
          }
        }
      } catch (e) {
        console.error("Error restoring theme:", e);
      } finally {
        setIsThemeLoading(false);
      }
    })();
  }, [themeStorageKey]);

  // Persist theme choice (palette + appearance) for the current user only.
  useEffect(() => {
    if (!isThemeLoading && themeStorageKey) {
      const payload = JSON.stringify({ themeName, isDark });
      AsyncStorage.setItem(themeStorageKey, payload).catch((e) =>
        console.error("Error saving theme:", e)
      );
    }
  }, [themeName, isDark, isThemeLoading, themeStorageKey]);

  // Pick a base palette (always the *light* version from themeMap)
  const baseThemeName = themeMap[themeName] ? themeName : DEFAULT_THEME_NAME;
  const base = themeMap[baseThemeName];

  // Build final theme object for the app
  const theme = isDark
    ? makeDarkFromBase(base)
    : {
        ...base,
        isDark: false,
      };

  // Toggle just flips appearance, *not* palette
  function toggleLightDark() {
    setIsDark((prev) => !prev);
  }

  // Set which palette (feminine / masculine / rainbow)
  function setTheme(key) {
    if (themeMap[key]) {
      setThemeName(key);
    } else {
      console.warn("Unknown theme key:", key);
    }
  }

  const value = {
    theme,
    themeName,
    setThemeName: setTheme,
    isDark,
    toggleLightDark,
    themes: Object.values(themeMap),
    isThemeLoading,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return ctx;
}
