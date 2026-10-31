import React, { useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "../../components/common/AppButton";
import SocialSignInButtons from "../../components/auth/SocialSignInButtons";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import AccountScreen from "./AccountScreen";

export default function MemberAccountScreen(props) {
  const { user } = useAuth();
  return user?.isAdmin ? <AccountScreen {...props} /> : <MemberAccount {...props} />;
}
function MemberAccount({ navigation }) {
  const { user, logout, deleteAccount, resendVerificationEmail, retrySessionRestore, authNoticeMessage } = useAuth();
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);
  async function verify() {
    try { setBusy(true); await resendVerificationEmail(); Alert.alert("Check your email", "Open the verification link we sent you."); }
    catch (error) { Alert.alert("Could not send email", error.message); }
    finally { setBusy(false); }
  }
  function removeAccount() {
    Alert.alert("Delete account?", "This permanently removes your account, saved events, likes, notification settings, and other account data.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete account", style: "destructive", onPress: async () => {
        try { setBusy(true); await deleteAccount(); navigation.reset({ index: 0, routes: [{ name: "tabs" }] }); }
        catch (error) { Alert.alert("Could not delete account", error.message); }
        finally { setBusy(false); }
      } },
    ]);
  }
  const row = (title, route) => <AppButton key={route} title={title} variant="outline" onPress={() => navigation.navigate(route)} disabled={busy} style={{ marginTop: 12 }} />;
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
    <PageHeader title="Account" subtitle={user ? "Your profile, events, and notification preferences." : "Create an account to save events, like favourites, and choose reminders."} />
    {authNoticeMessage ? <View style={{ marginBottom: 16 }}><Text style={{ color: theme.text }}>{authNoticeMessage}</Text><AppButton title="Retry saved login" onPress={retrySessionRestore} style={{ marginTop: 10 }} /></View> : null}
    {!user ? <>
      {row("Log in", "Login")}{row("Create account", "Register")}
      <Text style={{ color: theme.textMuted, marginTop: 20 }}>Browsing events and maps is always available without an account.</Text>
    </> : <>
      {user.profileImageUrl ? <Image source={{ uri: user.profileImageUrl }} style={{ width: 72, height: 72, borderRadius: 36 }} /> : null}
      <Text style={{ color: theme.text, fontSize: 24, fontWeight: "700", marginTop: 12 }}>{user.name}</Text>
      <Text style={{ color: theme.textMuted }}>{user.email} · Private</Text>
      {row("Edit profile", "MemberProfile")}
      {row("Saved events & reminders", "SavedEvents")}
      {row("Daily What's Happening", "DailyEventsNotification")}
      {row("Notifications", "Notifications")}
      {!user.emailVerified ? <AppButton title="Verify email" onPress={verify} disabled={busy} style={{ marginTop: 12 }} /> : null}
      {row("Change email", "ChangeEmail")}
      {user.socialAccounts?.some(account => ["apple", "google"].includes(account.provider)) ? row("Set or reset email password", "ForgotPassword") : row("Change password", "ChangePassword")}
      <Text style={{ color: theme.text, marginTop: 24, marginBottom: 10 }}>Connect another sign-in method</Text>
      <Text style={{ color: theme.textMuted, marginBottom: 12 }}>Use Google or Apple to access this same account. Connected: {user.socialAccounts?.filter(account => ["apple", "google"].includes(account.provider)).map(account => account.provider).join(", ") || "email"}.</Text>
      <SocialSignInButtons linking disabled={busy} onBusyChange={setBusy} />
      <AppButton title="Log out" variant="outline" onPress={async () => { await logout(); navigation.reset({ index: 0, routes: [{ name: "tabs" }] }); }} disabled={busy} style={{ marginTop: 24 }} />
      <AppButton title="Delete account" variant="outline" onPress={removeAccount} disabled={busy} loading={busy} style={{ marginTop: 12 }} />
    </>}
    {row("List an event / Business information", "BusinessHelp")}
    {row("Privacy & Terms", "Legal")}{user ? row("Report a problem", "ReportBug") : null}
  </ScrollView></SafeAreaView>;
}
