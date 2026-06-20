import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  PASSWORD_RULES_TEXT,
  validatePasswordStrength,
} from "../../utils/passwordPolicy";

export default function ResetPasswordScreen({ navigation, route }) {
  const { resetPassword } = useAuth();
  const { theme } = useTheme();
  const [token, setToken] = useState(route?.params?.token || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (route?.params?.token) {
      setToken(route.params.token);
    }
  }, [route?.params?.token]);

  async function handleSubmit() {
    const resetToken = token.trim();
    if (!resetToken) {
      Alert.alert(
        "Reset link needed",
        "Open the reset email link again or paste the reset token from the email."
      );
      return;
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      Alert.alert("Password needs more strength", passwordError);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Please re-enter your new password.");
      return;
    }

    try {
      setLoading(true);
      await resetPassword({ resetToken, password });
      Alert.alert("Password reset", "You can now log in with your new password.");
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (error) {
      Alert.alert("Could not reset password", error.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: theme.text }]}>Reset password</Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          Enter a new password for your Summit Scene account.
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
          ]}
          value={token}
          onChangeText={setToken}
          placeholder="Reset token"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
          ]}
          value={password}
          onChangeText={setPassword}
          placeholder="New password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
          ]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          {PASSWORD_RULES_TEXT}
        </Text>
        <AppButton
          title={loading ? "Resetting..." : "Reset Password"}
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
  helperText: { fontSize: 12, lineHeight: 18 },
});
