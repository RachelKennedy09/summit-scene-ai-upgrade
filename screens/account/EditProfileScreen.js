// screens/account/EditProfileScreen.js
// Lets logged-in users edit their profile fields (not email/password yet)

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import AppButton from "../../components/common/AppButton";
import PageHeader from "../../components/common/PageHeader";
import {
  PROFILE_INTEREST_GROUPS,
  VIBE_TAG_GROUPS,
} from "../../constants/eventCategories";
import { getCategoryAccent } from "../../utils/categoryVisuals";

const SOCIAL_PROVIDERS = [
  {
    provider: "instagram",
    label: "Instagram",
    placeholder: "@yourhandle",
    actionLabel: "Add Instagram link",
  },
  {
    provider: "facebook",
    label: "Facebook",
    placeholder: "facebook.com/yourprofile",
    actionLabel: "Add Facebook link",
  },
];
const PROFILE_PHOTO_MAX_BASE64_LENGTH = 2200000;
const TOWN_OPTIONS = ["Banff", "Canmore", "Lake Louise", "All"];
const USER_TYPE_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "seasonal", label: "Seasonal" },
  { value: "visitor", label: "Visitor" },
];
function ChipGroup({ options, value, values, onChange, onToggle, theme }) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;
        const isSelected = values
          ? values.includes(optionValue)
          : value === optionValue;
        const optionAccent = values
          ? getCategoryAccent(optionLabel, theme)
          : null;

        return (
          <Pressable
            key={optionValue}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? optionAccent?.tint || theme.accentSoft || theme.card
                  : theme.card,
                borderColor: isSelected
                  ? optionAccent?.border || theme.accent
                  : theme.border,
              },
            ]}
            onPress={() =>
              onToggle ? onToggle(optionValue) : onChange(optionValue)
            }
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isSelected
                    ? optionAccent?.text || theme.accent
                    : theme.textMuted,
                },
              ]}
            >
              {optionLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function InterestGroupList({ groups, values, onToggle, theme }) {
  const [openGroup, setOpenGroup] = useState(null);

  return (
    <View style={styles.interestGroups}>
      {groups.map((group) => {
        const isOpen = openGroup === group.title;
        const groupAccent = getCategoryAccent(group.title, theme);
        const selectedCount = group.options.filter((option) =>
          values.includes(option)
        ).length;

        return (
          <View
            key={group.title}
            style={[
              styles.interestGroup,
              {
                backgroundColor: theme.card,
                borderColor: selectedCount ? groupAccent.border : theme.border,
              },
            ]}
          >
            <Pressable
              style={[
                styles.interestGroupHeader,
                { backgroundColor: groupAccent.tint },
              ]}
              onPress={() => setOpenGroup(isOpen ? null : group.title)}
            >
              <View style={styles.interestGroupCopy}>
                <Text
                  style={[
                    styles.interestGroupTitle,
                    { color: groupAccent.text || theme.text },
                  ]}
                >
                  {group.title}
                </Text>
                <Text
                  style={[
                    styles.interestGroupMeta,
                    { color: selectedCount ? groupAccent.text : theme.textMuted },
                  ]}
                >
                  {selectedCount
                    ? `${selectedCount} selected`
                    : "Tap to choose"}
                </Text>
              </View>
              <Text
                style={[
                  styles.interestGroupChevron,
                  { color: groupAccent.text || theme.accent },
                ]}
              >
                {isOpen ? "-" : "+"}
              </Text>
            </Pressable>
            {isOpen ? (
              <View style={styles.interestGroupOptions}>
                <ChipGroup
                  options={group.options}
                  values={values}
                  onToggle={onToggle}
                  theme={theme}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function getSocialValue(accounts, provider, fallback = "") {
  const account = accounts.find((item) => item.provider === provider);
  return account?.handle || account?.url || fallback || "";
}

function buildSocialAccounts(values, profileImageUrl = "") {
  const socialProfileImageUrl = profileImageUrl.startsWith("data:")
    ? ""
    : profileImageUrl;

  return SOCIAL_PROVIDERS.map(({ provider }) => {
    const value = normalizeSocialInput(provider, values[provider]);
    if (!value) return null;

    const isHandle = value.startsWith("@") || !value.includes(".");
    return {
      provider,
      handle: isHandle ? value : undefined,
      url: isHandle ? undefined : value,
      profileImageUrl:
        socialProfileImageUrl && ["facebook", "instagram"].includes(provider)
          ? socialProfileImageUrl
          : undefined,
      verified: false,
    };
  }).filter(Boolean);
}

function normalizeSocialInput(provider, value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (provider === "instagram") {
    return trimmed.startsWith("@") || trimmed.includes("/")
      ? trimmed
      : `@${trimmed}`;
  }

  return trimmed;
}

function SocialConnectFields({ values, onChange, theme }) {
  return (
    <View>
      {SOCIAL_PROVIDERS.map(({ provider, label, placeholder, actionLabel }) => {
        const value = values[provider] || "";
        const connected = Boolean(value.trim());

        return (
          <View
            key={provider}
            style={[
              styles.connectPanel,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.connectPanelCopy}>
              <Text style={[styles.connectPanelTitle, { color: theme.text }]}>
                {label}
              </Text>
              <Text style={[styles.helperText, { color: theme.textMuted }]}>
                {connected ? "Link added." : actionLabel}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: connected ? theme.accent : theme.border,
                    color: theme.text,
                  },
                ]}
                value={value}
                onChangeText={(nextValue) => onChange(provider, nextValue)}
                placeholder={placeholder}
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function EditProfileScreen({ navigation }) {
  const { user, updateProfile, isAuthLoading } = useAuth();
  const { theme } = useTheme();

  // Safeguard – if somehow no user
  const isBusiness = user?.role === "business";

  // Role-based heading + helper text
  const titleText = isBusiness ? "Event posting profile" : "Edit profile";
  const helperText = isBusiness
    ? "This is how your profile appears when you make an event."
    : "Update the profile details people see when you post, reply, or join plans.";

  // Pre-fill fields from current user
  const [name, setName] = useState(user?.name || "");
  const [town, setTown] = useState(user?.town || "");
  const [userType, setUserType] = useState(user?.userType || "local");
  const [originallyFrom, setOriginallyFrom] = useState(user?.originallyFrom || "");
  const [languagesText, setLanguagesText] = useState(
    Array.isArray(user?.languages) ? user.languages.join(", ") : ""
  );
  const [interests, setInterests] = useState(
    Array.isArray(user?.interests) ? user.interests : []
  );
  const [businessVibeTags, setBusinessVibeTags] = useState(
    Array.isArray(user?.businessVibeTags) ? user.businessVibeTags : []
  );
  const [bio, setBio] = useState(user?.bio || "");
  const [lookingFor, setLookingFor] = useState(user?.lookingFor || "");
  const instagram = user?.instagram || "";
  const facebook = user?.facebook || "";
  const [website, setWebsite] = useState(user?.website || "");
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState(
    user?.googleBusinessUrl || ""
  );
  const [phone, setPhone] = useState(user?.phone || "");
  const [profileImageUrl, setProfileImageUrl] = useState(
    user?.profileImageUrl || ""
  );
  const [socialValues, setSocialValues] = useState(() => {
    const accounts = Array.isArray(user?.socialAccounts)
      ? user.socialAccounts
      : [];
    const fallbacks = {
      instagram: user?.instagram || "",
      facebook: user?.facebook || "",
    };

    return SOCIAL_PROVIDERS.reduce((current, { provider }) => {
      current[provider] = getSocialValue(accounts, provider, fallbacks[provider]);
      return current;
    }, {});
  });

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.container}>
          <PageHeader
            title="Edit profile"
            subtitle="You need to be logged in to edit your profile."
          />
        </View>
      </SafeAreaView>
    );
  }

  async function handleSave() {
    try {
      if (isBusiness) {
        const hasProofLink = Boolean(
          website.trim() ||
            Object.values(socialValues).some((value) => value.trim()) ||
            googleBusinessUrl.trim()
        );
        if (!name.trim() || !town.trim() || !lookingFor.trim() || !bio.trim()) {
          Alert.alert(
            "Business verification info needed",
            "Please add business name, town, category, and a short description."
          );
          return;
        }
        if (!hasProofLink) {
          Alert.alert(
            "Proof link needed",
            "Please add one proof link or connected social profile."
          );
          return;
        }
      }

      const languages = languagesText
        .split(",")
        .map((language) => language.trim())
        .filter(Boolean);

      const updates = {
        name,
        town,
        bio,
        userType: isBusiness ? undefined : userType,
        originallyFrom: isBusiness ? undefined : originallyFrom,
        languages: isBusiness ? undefined : languages,
        interests,
        businessVibeTags: isBusiness ? businessVibeTags : undefined,
        lookingFor: isBusiness ? lookingFor : "",
        instagram: socialValues.instagram || instagram,
        website,
        avatarKey: null,
        profileImageUrl,
        socialAccounts: buildSocialAccounts(socialValues, profileImageUrl),
      };

      if (isBusiness) {
        updates.facebook = socialValues.facebook || facebook;
        updates.googleBusinessUrl = googleBusinessUrl;
        updates.phone = phone;
      }

      await updateProfile(updates);

      Alert.alert("Profile updated", "Your changes have been saved.");
      navigation.goBack();
    } catch (error) {
      console.error("updateProfile error:", error);
      Alert.alert(
        "Update failed",
        error.message || "Could not save your profile."
      );
    }
  }

  function handleCancel() {
    navigation.goBack();
  }

  function handleSocialChange(provider, value) {
    setSocialValues((current) => ({
      ...current,
      [provider]: value,
    }));
  }

  function handleToggleInterest(interest) {
    setInterests((current) => {
      if (current.includes(interest)) {
        return current.filter((item) => item !== interest);
      }

      return [...current, interest];
    });
  }

  function handleToggleBusinessVibeTag(tag) {
    setBusinessVibeTags((current) => {
      if (current.includes(tag)) {
        return current.filter((item) => item !== tag);
      }

      return [...current, tag];
    });
  }

  async function handleChooseProfilePhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo access needed",
          "Allow photo library access to choose a profile photo from your camera roll."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.45,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.base64) {
        Alert.alert(
          "Photo not selected",
          "We could not read that photo. Please try another image."
        );
        return;
      }

      if (asset.base64.length > PROFILE_PHOTO_MAX_BASE64_LENGTH) {
        Alert.alert(
          "Photo too large",
          "Please choose a smaller photo or crop it tighter before saving."
        );
        return;
      }

      const mimeType = asset.mimeType || "image/jpeg";
      setProfileImageUrl(`data:${mimeType};base64,${asset.base64}`);
    } catch (error) {
      Alert.alert(
        "Could not choose photo",
        error.message || "Please try again."
      );
    }
  }

  function handleClearProfilePhoto() {
    setProfileImageUrl("");
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <PageHeader title={titleText} subtitle={helperText} />

          {/* Name */}
          <Text style={[styles.label, { color: theme.text }]}>Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.textMuted}
          />

          {isBusiness ? (
            <>
              <Text style={[styles.label, { color: theme.text }]}>
                Where is your business located?
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={town}
                onChangeText={setTown}
                placeholder="Banff, Canmore, Lake Louise..."
                placeholderTextColor={theme.textMuted}
              />
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: theme.text }]}>
                Where are you based?
              </Text>
              <ChipGroup
                options={TOWN_OPTIONS}
                value={town}
                onChange={setTown}
                theme={theme}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Profile type
              </Text>
              <ChipGroup
                options={USER_TYPE_OPTIONS}
                value={userType}
                onChange={setUserType}
                theme={theme}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Originally from (optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Toronto, Australia, Japan..."
                placeholderTextColor={theme.textMuted}
                value={originallyFrom}
                onChangeText={setOriginallyFrom}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Languages spoken (optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="English, French, Spanish..."
                placeholderTextColor={theme.textMuted}
                value={languagesText}
                onChangeText={setLanguagesText}
              />

              <Text style={[styles.label, { color: theme.text }]}>
                Main interests (optional)
              </Text>
              <Text style={[styles.helperText, { color: theme.textMuted }]}>
                Pick optional interests you are comfortable showing on your
                profile. These help your Hub start with events you care about,
                and you can change them at any time.
              </Text>
              <InterestGroupList
                groups={PROFILE_INTEREST_GROUPS}
                values={interests}
                onToggle={handleToggleInterest}
                theme={theme}
              />
            </>
          )}

          {/* Looking for / business type */}
          {isBusiness ? (
            <>
              <Text style={[styles.label, { color: theme.text }]}>
                Business category
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multiline,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={lookingFor}
                onChangeText={setLookingFor}
                multiline
                numberOfLines={3}
                placeholder="Cafe, hiking guide, tour company, yoga studio..."
                placeholderTextColor={theme.textMuted}
              />
              <Text style={[styles.label, { color: theme.text }]}>
                Business tags
              </Text>
              <Text style={[styles.helperText, { color: theme.textMuted }]}>
                Pick the activities, services, or event types people should
                recognize you for.
              </Text>
              <InterestGroupList
                groups={PROFILE_INTEREST_GROUPS}
                values={interests}
                onToggle={handleToggleInterest}
                theme={theme}
              />
              <Text style={[styles.label, { color: theme.text }]}>
                Business vibe
              </Text>
              <Text style={[styles.helperText, { color: theme.textMuted }]}>
                Choose tags that describe the
                feel of your events or experiences.
              </Text>
              <InterestGroupList
                groups={VIBE_TAG_GROUPS}
                values={businessVibeTags}
                onToggle={handleToggleBusinessVibeTag}
                theme={theme}
              />
            </>
          ) : null}

          {/* Bio */}
          <Text style={[styles.label, { color: theme.text }]}>
            {isBusiness ? "Short description" : "Short bio"}
            {isBusiness ? "" : " (optional)"}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            placeholder={
              isBusiness
                ? "Tell people about your business, vibe, and what events, tours, or experiences you host."
                : "A little about you or what you like doing around town..."
            }
            placeholderTextColor={theme.textMuted}
          />

          <Text style={[styles.label, { color: theme.text }]}>
            Website {isBusiness ? "" : "(optional)"}
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            {isBusiness
              ? "Add your official website or use a connected social profile below for review."
              : "Add a personal site, portfolio, blog, or public page if you want it shown on your profile."}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={website}
            onChangeText={setWebsite}
            placeholder={
              isBusiness ? "https://your-business.com" : "https://your-site.com"
            }
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Social profiles */}
          <Text
            style={[
              styles.label,
              { marginTop: 16, fontWeight: "700", color: theme.text },
            ]}
          >
            Social links
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Optional public profiles people can use to recognize you.
          </Text>

          <SocialConnectFields
            values={socialValues}
            onChange={handleSocialChange}
            theme={theme}
          />

          <Text style={[styles.label, { color: theme.text }]}>
            Profile photo
          </Text>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            Choose a photo from your camera roll. This will be shown on your
            public profile, posts, replies, and event hosting card.
          </Text>
          <Pressable
            style={[
              styles.photoPickerButton,
              { backgroundColor: theme.card, borderColor: theme.accent },
            ]}
            onPress={handleChooseProfilePhoto}
          >
            <Text style={[styles.photoPickerText, { color: theme.accent }]}>
              Choose from camera roll
            </Text>
          </Pressable>
          {profileImageUrl ? (
            <View style={styles.socialPhotoRow}>
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.socialPhotoPreview}
              />
              <View style={styles.socialPhotoCopy}>
                <Text style={[styles.socialPhotoTitle, { color: theme.text }]}>
                  Profile photo ready
                </Text>
                <Text style={[styles.helperText, { color: theme.textMuted }]}>
                  This photo will be used publicly.
                </Text>
                <View style={styles.photoActionRow}>
                  <Pressable
                    style={[
                      styles.smallOutlineButton,
                      { borderColor: theme.border },
                    ]}
                    onPress={handleClearProfilePhoto}
                  >
                    <Text
                      style={[
                        styles.smallOutlineText,
                        { color: theme.textMuted },
                      ]}
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {isBusiness && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>
                Google Business listing
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={googleBusinessUrl}
                onChangeText={setGoogleBusinessUrl}
                placeholder="Google Business profile link"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
              />
              <Text style={[styles.label, { color: theme.text }]}>
                Public phone number (optional)
              </Text>
              <Text style={[styles.helperText, { color: theme.textMuted }]}>
                Only add a number you want shown on your event posting profile.
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Business phone number"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
              />
            </>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <AppButton
              title="Cancel"
              onPress={handleCancel}
              disabled={isAuthLoading}
              variant="outline"
              style={styles.flexButton}
            />

            <AppButton
              title={isAuthLoading ? "Saving..." : "Save changes"}
              onPress={handleSave}
              loading={isAuthLoading}
              variant="primary"
              style={styles.flexButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
    marginTop: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  interestGroups: {
    gap: 10,
    marginBottom: 4,
  },
  interestGroup: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  interestGroupHeader: {
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  interestGroupCopy: {
    flex: 1,
  },
  interestGroupTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  interestGroupMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  interestGroupChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 20,
    fontWeight: "800",
  },
  interestGroupOptions: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  photoPickerButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
  },
  photoPickerText: {
    fontSize: 13,
    fontWeight: "800",
  },
  socialPhotoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  socialPhotoPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ddd",
  },
  socialPhotoCopy: {
    flex: 1,
  },
  connectPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  connectPanelCopy: {
    flex: 1,
  },
  connectPanelTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  socialPhotoTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
  },
  smallOutlineButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  smallOutlineText: {
    fontSize: 12,
    fontWeight: "800",
  },
  photoActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  clearAvatarButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -4,
  },
  clearAvatarText: {
    fontSize: 12,
    fontWeight: "800",
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  flexButton: {
    flex: 1,
  },
});
