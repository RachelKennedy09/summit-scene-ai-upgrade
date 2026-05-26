import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  applyReportAction,
  fetchReports,
  updateReport,
} from "../../services/reportsApi";

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

  function getReportId(report) {
    return String(report?._id || report?.id || "");
  }

  function handleModerateReport(report, status) {
    const reportId = getReportId(report);
    if (!reportId) return;

    const isDismissed = status === "dismissed";
    const actionLabel = isDismissed ? "Dismiss Report" : "Keep Content & Close";
    const alertMessage = isDismissed
      ? "This closes the report as not actionable and removes it from the open queue."
      : "This closes the report without deleting the reported content or user.";

    Alert.alert(`${actionLabel}?`, alertMessage, [
      { text: "Cancel", style: "cancel" },
      {
        text: actionLabel,
        onPress: async () => {
          try {
            await updateReport(
              reportId,
              {
                status,
                actionTaken: isDismissed ? "none" : "other",
              },
              token
            );
            setReports((currentReports) =>
              currentReports.filter((item) => getReportId(item) !== reportId)
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

  function handleReportAction(report, action) {
    const reportId = getReportId(report);
    if (!reportId) return;

    const isDeleteUser = action === "delete-user";
    Alert.alert(
      isDeleteUser ? "Delete this user?" : "Delete reported content?",
      isDeleteUser
        ? "This removes the user account and their posts/replies where possible."
        : "This removes the reported post or reply and marks the report reviewed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isDeleteUser ? "Delete User" : "Delete Content",
          style: "destructive",
          onPress: async () => {
            try {
              await applyReportAction(reportId, action, token);
              setReports((currentReports) =>
                currentReports.filter((item) => getReportId(item) !== reportId)
              );
              await loadReports();
            } catch (actionError) {
              Alert.alert(
                "Could not apply action",
                actionError.message || "Please try again."
              );
            }
          },
        },
      ]
    );
  }

  function getTargetLabel(report) {
    switch (report?.targetType) {
      case "buddyReply":
      case "communityReply":
        return "Reported reply";
      case "buddyPost":
      case "communityPost":
        return "Reported post";
      case "event":
        return "Reported event";
      case "user":
        return "Reported user";
      default:
        return "Reported item";
    }
  }

  function getDeleteContentLabel(report) {
    if (report?.targetType === "buddyReply" || report?.targetType === "communityReply") {
      return "Delete Reply";
    }
    if (report?.targetType === "event") return "Delete Event";
    return "Delete Content";
  }

  function getReasonLabel(reason) {
    switch (reason) {
      case "fake_event":
        return "Fake event";
      case "scam":
        return "Scam";
      case "inappropriate":
        return "Inappropriate content";
      case "misleading_business":
        return "Misleading business";
      case "harassment":
        return "Harassment or bullying";
      case "spam":
        return "Spam";
      case "unsafe":
        return "Unsafe behavior";
      default:
        return "Other";
    }
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
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          Closing a report removes it from this queue. Deleting content or users
          uses the separate delete actions.
        </Text>

        <View
          style={[
            styles.countCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.countNumber, { color: theme.text }]}>
            {reports.length}
          </Text>
          <Text style={[styles.countLabel, { color: theme.textMuted }]}>
            {reports.length === 1 ? "open report" : "open reports"}
          </Text>
        </View>

        <Pressable onPress={loadReports} style={styles.refreshButton}>
          <Text style={[styles.refreshText, { color: theme.accent }]}>Refresh</Text>
        </Pressable>

        {loading ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            Loading reports...
          </Text>
        ) : null}

        {error ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.name, { color: theme.text }]}>
              Could not load reports
            </Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {error}
            </Text>
            <Pressable
              style={[styles.outlineButton, { borderColor: theme.accent, marginTop: 10 }]}
              onPress={loadReports}
            >
              <Text style={[styles.outlineButtonText, { color: theme.accent }]}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && !reports.length ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.name, { color: theme.text }]}>
              No open reports
            </Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              New reports from posts, replies, events, and profiles will appear
              here for review.
            </Text>
          </View>
        ) : null}

        {reports.map((report) => {
          const reporterName =
            report.reporter?.name || report.reporter?.email || "Member";
          const canDeleteContent = [
            "buddyPost",
            "buddyReply",
            "communityPost",
            "communityReply",
            "event",
          ].includes(report.targetType);

          return (
            <View
              key={report._id || report.id}
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.name, { color: theme.text }]}>
                {getTargetLabel(report)} | {getReasonLabel(report.reason)}
              </Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                Reported by {reporterName}
              </Text>
              {report.details ? (
                <Text style={[styles.details, { color: theme.text }]}>
                  {report.details}
                </Text>
              ) : null}
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                Target: {report.targetId}
                {report.parentId ? ` | Parent: ${report.parentId}` : ""}
              </Text>
              <View style={styles.actions}>
                {canDeleteContent ? (
                  <Pressable
                    style={[styles.dangerButton, { borderColor: theme.accentWarm || "#B4513A" }]}
                    onPress={() => handleReportAction(report, "delete-content")}
                  >
                    <Text style={[styles.dangerButtonText, { color: theme.accentWarm || "#B4513A" }]}>
                      {getDeleteContentLabel(report)}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.dangerButton, { borderColor: theme.accentWarm || "#B4513A" }]}
                  onPress={() => handleReportAction(report, "delete-user")}
                >
                  <Text style={[styles.dangerButtonText, { color: theme.accentWarm || "#B4513A" }]}>
                    Delete Reported User
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.outlineButton, { borderColor: theme.accent }]}
                  onPress={() => handleModerateReport(report, "reviewed")}
                >
                  <Text style={[styles.outlineButtonText, { color: theme.accent }]}>
                    Keep Content & Close
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.outlineButton, { borderColor: theme.border }]}
                  onPress={() => handleModerateReport(report, "dismissed")}
                >
                  <Text style={[styles.outlineButtonText, { color: theme.textMuted }]}>
                    Dismiss Report
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
  countCard: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  countNumber: {
    fontSize: 22,
    fontWeight: "900",
  },
  countLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
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
  dangerButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  dangerButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
