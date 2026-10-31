import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { accountDestination } from "../../utils/accountNavigation";

const TOWNS = ["All", "Banff", "Canmore", "Lake Louise"];
const INTERESTS = ["Live Music", "Food & Drink", "Arts & Culture", "Outdoor Adventure", "Wellness", "Markets"];
export default function MemberProfileScreen({ navigation, route }) {
  const { user, updateProfile, pendingEventAction } = useAuth();
  const { theme } = useTheme();
  const onboarding = route.params?.onboarding === true;
  const [name, setName] = useState(user?.name || "");
  const [town, setTown] = useState(user?.town || "All");
  const [photo, setPhoto] = useState(user?.profileImageUrl || "");
  const [interests, setInterests] = useState(user?.interests || []);
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  async function choosePhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.35, base64: true });
      if (!result.canceled && result.assets?.[0]?.base64) {
        const asset = result.assets[0];
        if (asset.base64.length > 1000000) throw new Error("Choose a smaller photo (under 750 KB).");
        setPhoto(`data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`);
      }
    } catch (error) { Alert.alert("Could not select photo", error.message); }
  }
  async function save() {
    if (busy) return;
    if (!name.trim()) { Alert.alert("Display name required", "Enter a name for your account."); return; }
    try {
      setBusy(true);
      const nextUser = await updateProfile({ name: name.trim(), town, profileImageUrl: photo, interests, onboardingCompleted: true });
      if (onboarding) {
        const routes = accountDestination({ ...nextUser, onboardingCompleted: true }, pendingEventAction);
        navigation.reset({ index: routes.length - 1, routes });
      } else navigation.goBack();
    } catch (error) { Alert.alert("Could not save profile", error.message); }
    finally { setBusy(false); }
  }
  const pill = (label, selected, onPress) => <Pressable key={label} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={{ padding: 12, borderWidth: 1, borderColor: selected ? theme.accent : theme.border, borderRadius: 10, margin: 4 }}><Text style={{ color: selected ? theme.accent : theme.text }}>{label === "All" ? "All Bow Valley" : label}</Text></Pressable>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
    <PageHeader title={onboarding ? "Make it yours" : "Edit profile"} subtitle="Choose a display name. Your photo, town, and interests are optional. Your email stays private." />
    {photo ? <Image source={{ uri: photo }} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }} /> : null}
    <AppButton title="Choose photo (optional)" variant="outline" onPress={choosePhoto} disabled={busy} />
    <Text style={{ color: theme.text, marginTop: 20 }}>Display name</Text>
    <TextInput accessibilityLabel="Display name" value={name} onChangeText={setName} maxLength={60} style={{ borderWidth: 1, borderColor: theme.border, color: theme.text, borderRadius: 10, padding: 14, marginVertical: 10 }} />
    <Text style={{ color: theme.text, marginTop: 16 }}>Preferred town</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{TOWNS.map(value => pill(value, town === value, () => setTown(value)))}</View>
    <Text style={{ color: theme.text, marginTop: 16 }}>Interests (optional)</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{INTERESTS.map(value => pill(value, interests.includes(value), () => setInterests(interests.includes(value) ? interests.filter(item => item !== value) : [...interests, value])))}</View>
    <Text style={{ color: theme.textMuted, marginVertical: 18 }}>Saving and liking events never turns on notifications. Choose reminders on an event page or enable a daily update in Account.</Text>
    <AppButton title={onboarding ? "Start exploring" : "Save profile"} onPress={save} loading={busy} disabled={busy} />
  </ScrollView></SafeAreaView>;
}
