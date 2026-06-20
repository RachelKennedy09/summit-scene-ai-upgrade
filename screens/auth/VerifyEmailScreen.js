import React, { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function VerifyEmailScreen({ navigation, route }) {
  const { verifyEmail, confirmEmailChange } = useAuth();
  const { theme } = useTheme();
  const [token, setToken] = useState(route?.params?.token || "");
  const mode = route?.params?.mode || "verify";
  const [loading, setLoading] = useState(false);
  const autoSubmittedRef = useRef(false);

  async function handleSubmit() {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      Alert.alert("Verification token needed", "Please enter the token from your email.");
      return;
    }

    try {
      setLoading(true);
      if (mode === "emailChange") {
        await confirmEmailChange(trimmedToken);
        Alert.alert("Email changed", "Your new email has been confirmed.");
        navigation.goBack();
      } else {
        await verifyEmail(trimmedToken);
        Alert.alert("Email verified", "Your account email is now verified.");
        navigation.navigate("tabs", { screen: "Account" });
      }
    } catch (error) {
      Alert.alert("Could not verify email", error.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoSubmittedRef.current || mode !== "verify" || !token.trim()) {
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
          {token.trim() && mode !== "emailChange"
            ? "Verifying your email from the link..."
            : "Paste the token from your email if it was not filled automatically. Check your junk or spam folder if you do not see the email."}
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
          ]}
          value={token}
          onChangeText={setToken}
          placeholder="Verification token"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <AppButton
          title={loading ? "Verifying..." : "Verify Email"}
          onPress={handleSubmit}
          loading={loading}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: "900" },
  copy: { fontSize: 14, lineHeight: 20 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11 },
});
