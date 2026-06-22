import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { fetchAdminAccounts, updateAdminAccount } from "../../services/adminApi";

export default function AdminAccountsScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadAdmins() {
    if (!user?.isAdmin || !token) return;

    try {
      setLoading(true);
      setError("");
      setAdmins(await fetchAdminAccounts(token));
    } catch (loadError) {
      setError(loadError.message || "Could not load admin accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins();
  }, [user?.isAdmin, token]);

  async function handleGrantAdmin() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert("Email required", "Enter the account email to make admin.");
      return;
    }

    try {
      setSaving(true);
      await updateAdminAccount(normalizedEmail, true, token);
      setEmail("");
      await loadAdmins();
      Alert.alert("Admin added", `${normalizedEmail} can now use admin tools.`);
    } catch (grantError) {
      Alert.alert("Could not add admin", grantError.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleRevokeAdmin(admin) {
    const adminEmail = admin?.email;
    if (!adminEmail) return;

    Alert.alert(
      "Remove admin access?",
      `${admin.name || adminEmail} will no longer be able to use admin tools.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await updateAdminAccount(adminEmail, false, token);
              await loadAdmins();
            } catch (revokeError) {
              Alert.alert(
                "Could not remove admin",
                revokeError.message || "Please try again."
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  if (!user?.isAdmin) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            Admin access required.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Admin Accounts"
          subtitle="Grant admin tools to existing Summit Scene accounts."
          rightAccessory={
            <Pressable onPress={loadAdmins} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Text style={[styles.refreshText, { color: theme.accent }]}>
                  Refresh
                </Text>
              )}
            </Pressable>
          }
        />

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Add admin by email
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={email}
            onChangeText={setEmail}
            placeholder="hello@summitscene.ca"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: theme.accent },
              saving && styles.disabled,
            ]}
            disabled={saving}
            onPress={handleGrantAdmin}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: theme.onAccent || theme.textOnAccent || "#FFFFFF" },
              ]}
            >
              {saving ? "Saving..." : "Make Admin"}
            </Text>
          </Pressable>
        </View>

        {error ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            {error}
          </Text>
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Current database admins
        </Text>

        {!loading && !admins.length ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.statusText, { color: theme.textMuted }]}>
              No database admins yet. Environment admins may still have access.
            </Text>
          </View>
        ) : null}

        {admins.map((admin) => {
          const adminId = admin._id || admin.id || admin.email;

          return (
            <View
              key={adminId}
              style={[
                styles.adminRow,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.adminCopy}>
                <Text style={[styles.adminName, { color: theme.text }]}>
                  {admin.name || "Admin account"}
                </Text>
                <Text style={[styles.adminEmail, { color: theme.textMuted }]}>
                  {admin.email}
                </Text>
              </View>
              <Pressable
                style={[styles.removeButton, { borderColor: theme.border }]}
                disabled={saving}
                onPress={() => handleRevokeAdmin(admin)}
              >
                <Text style={[styles.removeButtonText, { color: theme.textMuted }]}>
                  Remove
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: "700",
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.65,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
  },
  adminRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  adminCopy: {
    flex: 1,
  },
  adminName: {
    fontSize: 15,
    fontWeight: "700",
  },
  adminEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  removeButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
