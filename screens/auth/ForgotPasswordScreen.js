import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "../../components/common/AppButton";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function ForgotPasswordScreen({ navigation }) {
  const { forgotPassword } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      Alert.alert("Enter your email", "Please enter the email for your account.");
      return;
    }

    try {
      setLoading(true);
      const data = await forgotPassword(normalizedEmail);
      Alert.alert("Check your email", data.message);
      if (data.passwordResetToken) {
        navigation.navigate("ResetPassword", { token: data.passwordResetToken });
      }
    } catch (error) {
      Alert.alert("Could not request reset", error.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: theme.text }]}>Forgot password</Text>
        <Text style={[styles.copy, { color: theme.textMuted }]}>
          Enter your account email and we will send reset instructions if it exists.
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="username"
          inputMode="email"
        />
        <AppButton
          title={loading ? "Sending..." : "Send Reset Link"}
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
