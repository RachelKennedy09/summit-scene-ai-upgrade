import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { fetchReports, updateReport } from "../../services/reportsApi";

export default function ModerationQueueScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadReports() {
    if (!user?.isAdmin || !token) return;

    try {
      setLoading(true);
      setError("");
      const openReports = await fetchReports(token, "open");
      setReports(openReports);
    } catch (loadError) {
      setError(loadError.message || "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [user?._id, user?.id, user?.isAdmin, token]);

  function handleModerateReport(report, status) {
    const reportId = report?._id || report?.id;
    if (!reportId) return;

    const actionLabel = status === "dismissed" ? "Dismiss" : "Mark reviewed";
    Alert.alert(`${actionLabel} report?`, "This updates the moderation queue.", [
      { text: "Cancel", style: "cancel" },
      {
        text: actionLabel,
        onPress: async () => {
          try {
            await updateReport(
              reportId,
              {
                status,
                actionTaken: status === "dismissed" ? "none" : "other",
              },
              token
            );
            await loadReports();
          } catch (updateError) {
            Alert.alert(
              "Could not update report",
              updateError.message || "Please try again."
            );
          }
        },
      },
    ]);
  }

  if (!user?.isAdmin) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <PageHeader title="Moderation Queue" subtitle="Admin access required." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Moderation Queue"
          subtitle="Review open reports before launch and during live operation."
        />

        <Pressable onPress={loadReports} style={styles.refreshButton}>
          <Text style={[styles.refreshText, { color: theme.accent }]}>Refresh</Text>
        </Pressable>

        {loading ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            Loading reports...
          </Text>
        ) : null}

        {error ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            {error}
          </Text>
        ) : null}

        {!loading && !error && !reports.length ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            No open reports.
          </Text>
        ) : null}

        {reports.map((report) => {
          const reporterName =
            report.reporter?.name || report.reporter?.email || "Member";

          return (
            <View
              key={report._id || report.id}
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.name, { color: theme.text }]}>
                {report.targetType} | {report.reason}
              </Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                Reported by {reporterName}
              </Text>
              {report.details ? (
                <Text style={[styles.details, { color: theme.text }]}>
                  {report.details}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  style={[styles.outlineButton, { borderColor: theme.accent }]}
                  onPress={() => handleModerateReport(report, "reviewed")}
                >
                  <Text style={[styles.outlineButtonText, { color: theme.accent }]}>
                    Reviewed
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.outlineButton, { borderColor: theme.border }]}
                  onPress={() => handleModerateReport(report, "dismissed")}
                >
                  <Text style={[styles.outlineButtonText, { color: theme.textMuted }]}>
                    Dismiss
                  </Text>
                </Pressable>
              </View>
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
    padding: 20,
    paddingBottom: 36,
  },
  refreshButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "800",
  },
  statusText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: "800",
  },
  meta: {
    fontSize: 12,
    marginTop: 3,
  },
  details: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  outlineButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
