import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";

function getVariantStyles(theme, variant) {
  switch (variant) {
    case "outline":
      return {
        backgroundColor: theme.card,
        borderColor: theme.border,
        textColor: theme.text,
      };
    case "highlight":
      return {
        backgroundColor: theme.accentWarm,
        borderColor: theme.accentWarm,
        textColor: theme.text,
      };
    case "success":
      return {
        backgroundColor: theme.success,
        borderColor: theme.success,
        textColor: theme.onSuccess || theme.textOnAccent,
      };
    case "soft":
      return {
        backgroundColor: theme.accentSoft,
        borderColor: theme.accentSoft,
        textColor: theme.accent,
      };
    case "primary":
    default:
      return {
        backgroundColor: theme.accent,
        borderColor: theme.accent,
        textColor: theme.onAccent || theme.textOnAccent,
      };
  }
}

function getSizeStyles(size) {
  switch (size) {
    case "sm":
      return {
        minHeight: 38,
        paddingHorizontal: 14,
        paddingVertical: 9,
        fontSize: 13,
      };
    case "lg":
      return {
        minHeight: 52,
        paddingHorizontal: 18,
        paddingVertical: 14,
        fontSize: 16,
      };
    case "md":
    default:
      return {
        minHeight: 46,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
      };
  }
}

export default function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "md",
  fullWidth = true,
  style,
  textStyle,
}) {
  const { theme } = useTheme();
  const palette = getVariantStyles(theme, variant);
  const sizing = getSizeStyles(size);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          minHeight: sizing.minHeight,
          paddingHorizontal: sizing.paddingHorizontal,
          paddingVertical: sizing.paddingVertical,
        },
        fullWidth && styles.fullWidth,
        pressed && !disabled && !loading && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={palette.textColor}
            style={styles.spinner}
          />
        ) : null}
        <Text
          style={[
            styles.label,
            {
              color: palette.textColor,
              fontSize: sizing.fontSize,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  label: {
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    marginRight: 8,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },
  disabled: {
    opacity: 0.6,
  },
});
