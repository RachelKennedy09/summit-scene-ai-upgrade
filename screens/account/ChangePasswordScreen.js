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

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const { theme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmNewPassword.length > 0;

  async function handleSubmit() {
    if (!currentPassword) {
      Alert.alert("Current password needed", "Please enter your current password.");
      return;
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      Alert.alert("Password needs more strength", passwordError);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert("Passwords do not match", "Please confirm your new password.");
      return;
    }

    try {
      setLoading(true);
      await changePassword({ currentPassword, newPassword });
      Alert.alert("Password changed", "Please log in again with your new password.");
    } catch (error) {
      Alert.alert("Could not change password", error.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: theme.text }]}>Change password</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          placeholder="Confirm new password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
        />
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          {PASSWORD_RULES_TEXT}
        </Text>
        <AppButton
          title={loading ? "Saving..." : "Change Password"}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !canSubmit}
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
