import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";
import SocialSignInButtons from "../../components/auth/SocialSignInButtons";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { PASSWORD_RULES_TEXT, validatePasswordStrength } from "../../utils/passwordPolicy";
import BusinessHelpScreen from "../account/BusinessHelpScreen";

export default function MemberRegisterScreen(props) {
  return props.route.params?.initialRole === "business"
    ? <BusinessHelpScreen {...props} /> : <MemberForm {...props} />;
}

function MemberForm({ navigation }) {
  const { register, isAuthLoading } = useAuth();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy || isAuthLoading) return;
    const issue = validatePasswordStrength(password);
    if (!name.trim() || !email.trim() || issue || !accepted) {
      Alert.alert("Check your details", issue || "Enter a display name and email, and confirm the account terms.");
      return;
    }
    try {
      setBusy(true);
      await register({ name: name.trim(), email: email.trim(), password, role: "local", acceptedAgeTerms: accepted });
      navigation.reset({ index: 1, routes: [{ name: "tabs" }, { name: "MemberProfile", params: { onboarding: true } }] });
    } catch (error) { Alert.alert("Could not create account", error.message); }
    finally { setBusy(false); }
  }
  const input = { borderWidth: 1, borderColor: theme.border, color: theme.text, backgroundColor: theme.card, borderRadius: 10, padding: 14, marginBottom: 14 };
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <PageHeader title="Create your account" subtitle="Save events, like your favourites, and choose reminders." />
        <SocialSignInButtons disabled={busy} onBusyChange={setBusy} />
        <Text style={{ color: theme.textMuted, marginBottom: 16 }}>Or sign up with email</Text>
        <Text style={{ color: theme.text }}>Display name</Text>
        <TextInput accessibilityLabel="Display name" value={name} onChangeText={setName} maxLength={60} style={input} autoComplete="name" />
        <Text style={{ color: theme.text }}>Email</Text>
        <TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail} style={input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Text style={{ color: theme.text }}>Password</Text>
        <TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} style={input} secureTextEntry autoComplete="new-password" />
        <Text style={{ color: theme.textMuted }}>{PASSWORD_RULES_TEXT}</Text>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={() => setAccepted(!accepted)} style={{ paddingVertical: 18 }}>
          <Text style={{ color: theme.text }}>{accepted ? "☑" : "☐"} I am 18+ and agree to the Privacy Policy and Terms.</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Legal")}><Text style={{ color: theme.accent }}>Read Privacy & Terms</Text></Pressable>
        <AppButton title="Create account" onPress={submit} loading={busy || isAuthLoading} disabled={busy || isAuthLoading} style={{ marginTop: 18 }} />
        <AppButton title="Already have an account? Log in" variant="outline" onPress={() => navigation.navigate("Login")} style={{ marginTop: 12 }} />
        <AppButton title="Continue browsing" variant="soft" onPress={() => navigation.navigate("tabs")} style={{ marginTop: 12 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
