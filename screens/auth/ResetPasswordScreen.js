import React, { useState } from "react";
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
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      Alert.alert("Password needs more strength", passwordError);
      return;
    }

    try {
      setLoading(true);
      await resetPassword({ resetToken: token, password });
      Alert.alert("Password reset", "You can now log in with your new password.");
      navigation.navigate("Login");
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
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11 },
  helperText: { fontSize: 12, lineHeight: 18 },
});
