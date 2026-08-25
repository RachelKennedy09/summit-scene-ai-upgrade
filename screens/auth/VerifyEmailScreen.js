import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function VerifyEmailScreen({ navigation, route }) {
  const { token: authToken, verifyEmail, confirmEmailChange } = useAuth();
  const { theme } = useTheme();
  const [token] = useState(route?.params?.token || "");
  const mode = route?.params?.mode || "verify";
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const autoSubmittedRef = useRef(false);

  function openAccountOrLogin() {
    if (authToken) {
      navigation.navigate("tabs", { screen: "Account" });
      return;
    }

    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  }

  async function handleSubmit() {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      Alert.alert(
        "Verification link needed",
        "Open the latest verification link from your email."
      );
      return;
    }

    try {
      setLoading(true);
      setStatus("loading");
      setStatusMessage("");
      if (mode === "emailChange") {
        await confirmEmailChange(trimmedToken);
        setStatus("success");
        setStatusMessage(
          "Your new email has been confirmed. Please log in again with your new email."
        );
        Alert.alert(
          "Email changed",
          "Your new email has been confirmed. Please log in again with your new email."
        );
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        await verifyEmail(trimmedToken);
        setStatus("success");
        setStatusMessage("Your account email is now verified.");
        Alert.alert("Email verified", "Your account email is now verified.");
        openAccountOrLogin();
      }
    } catch (error) {
      setStatus("error");
      setStatusMessage(error.message || "Please try again.");
      Alert.alert("Could not verify email", error.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoSubmittedRef.current || !token.trim()) {
      return;
    }

    autoSubmittedRef.current = true;
    handleSubmit();
  }, [mode, token]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: theme.text }]}>
          {mode === "emailChange" ? "Confirm email change" : "Verify email"}
        </Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          {status === "success"
            ? statusMessage
            : status === "error"
              ? statusMessage
              : token.trim()
                ? loading
                  ? mode === "emailChange"
                    ? "Confirming your new email from the link..."
                    : "Verifying your email from the link..."
                  : mode === "emailChange"
                    ? "Ready to confirm your new email."
                    : "Ready to verify your email."
                : mode === "emailChange"
                  ? "Open the latest email-change confirmation link from your inbox. It works from your phone or a browser."
                  : "Open the latest verification link from your inbox. It works from your phone or a browser."}
        </Text>
        {token.trim() ? (
          <AppButton
            title={
              loading
                ? mode === "emailChange"
                  ? "Confirming..."
                  : "Verifying..."
                : status === "success"
                  ? "Open Account"
                : mode === "emailChange"
                  ? "Confirm Email Change"
                  : "Verify Email"
            }
            onPress={
              status === "success"
                ? openAccountOrLogin
                : handleSubmit
            }
            loading={loading}
            size="lg"
          />
        ) : null}
        {status === "error" ? (
          <AppButton
            title="Open Account"
            onPress={openAccountOrLogin}
            variant="outline"
            size="lg"
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: "900" },
  copy: { fontSize: 14, lineHeight: 20 },
});
