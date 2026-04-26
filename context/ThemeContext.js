import React, { createContext, useContext, useMemo } from "react";
import { summitSceneTheme } from "../theme/themes";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const theme = summitSceneTheme;

  const navTheme = useMemo(
    () => ({
      dark: false,
      colors: {
        primary: theme.accent,
        background: theme.background,
        card: theme.card,
        text: theme.text,
        border: theme.border,
        notification: theme.accentWarm || theme.accent,
      },
      fonts: {
        regular: { fontFamily: "System", fontWeight: "400" },
        medium: { fontFamily: "System", fontWeight: "500" },
        bold: { fontFamily: "System", fontWeight: "700" },
        heavy: { fontFamily: "System", fontWeight: "800" },
      },
    }),
    [theme]
  );

  const value = {
    theme,
    navTheme,
    themeName: theme.key,
    setThemeName: () => {},
    isDark: false,
    toggleLightDark: () => {},
    themes: [theme],
    isThemeLoading: false,
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
