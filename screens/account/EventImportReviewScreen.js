import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";

import EventCard from "../../components/cards/EventCard";
import DatePickerModal from "../../components/events/DatePickerModal";
import PageHeader from "../../components/common/PageHeader";
import TimePickerModal from "../../components/events/TimePickerModal";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { EVENT_MAIN_CATEGORIES } from "../../constants/eventCategories";
import {
  approveHighConfidenceImportCandidates,
  approveImportCandidate,
  cleanupStaleImportCandidates,
  fetchImportCandidates,
  rejectImportCandidate,
  runEventImporter,
  seedStarterEventSources,
  updateImportCandidate,
} from "../../services/adminApi";

function getCandidateId(candidate) {
  return String(candidate?._id || candidate?.id || "");
}

function formatDateTime(candidate) {
  return [
    candidate.startDate,
    [candidate.startTime, candidate.endTime].filter(Boolean).join(" - "),
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function EventImportReviewScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [previewing, setPreviewing] = useState(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState(null);

  async function loadCandidates() {
    if (!user?.isAdmin || !token) return;
    try {
      setLoading(true);
      setError("");
      setCandidates(await fetchImportCandidates(token, "pending"));
    } catch (loadError) {
      setError(loadError.message || "Could not load event imports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCandidates();
  }, [token, user?.isAdmin]);

  async function handleApprove(candidate) {
    const candidateId = getCandidateId(candidate);
    if (!candidateId) return;

    try {
      setWorking(true);
      await approveImportCandidate(candidateId, token);
      setCandidates((current) =>
        current.filter((item) => getCandidateId(item) !== candidateId)
      );
    } catch (approveError) {
      Alert.alert("Could not approve event", approveError.message);
    } finally {
      setWorking(false);
    }
  }

  function openEdit(candidate) {
    setEditing(candidate);
    setEditForm({
      title: candidate.title || "",
      town: candidate.town || "",
      category: candidate.category || "Other",
      venue: candidate.venue || "",
      address: candidate.address || "",
      startDate: candidate.startDate || "",
      startTime: candidate.startTime || "",
      endTime: candidate.endTime || "",
      price: candidate.price || "",
      ticketUrl: candidate.ticketUrl || "",
    });
  }

  function candidateToPreviewEvent(candidate) {
    const link = candidate.ticketUrl || candidate.sourceUrl || "";
    return {
      title: candidate.title || "Untitled event",
      town: candidate.town || "",
      category: candidate.category || "Other",
      categories: candidate.categories?.length
        ? candidate.categories
        : [candidate.category || "Other"],
      date: candidate.startDate || "",
      time: candidate.startTime || "",
      endTime: candidate.endTime || "",
      locationName: candidate.venue || "",
      address: candidate.address || "",
      imageUrl: candidate.imageUrl || "",
      priceRange: candidate.price || "",
      bookingUrl: link,
      sourceUrl: candidate.sourceUrl || "",
      sourceName: candidate.sourceName || "",
      importedBySummitScene: true,
    };
  }

  function parseDateString(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    if (!year || !month || !day) return new Date();
    return new Date(year, month - 1, day);
  }

  function parseTimeString(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const date = new Date();
    if (!match) return date;

    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    date.setHours(hour, Number(match[2]), 0, 0);
    return date;
  }

  function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatTimeString(date) {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const meridiem = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${meridiem}`;
  }

  async function handleSaveEdit() {
    const candidateId = getCandidateId(editing);
    if (!candidateId) return;

    try {
      setWorking(true);
      const updated = await updateImportCandidate(candidateId, editForm, token);
      setCandidates((current) =>
        current.map((item) =>
          getCandidateId(item) === candidateId ? updated : item
        )
      );
      setEditing(null);
    } catch (saveError) {
      Alert.alert("Could not save event", saveError.message);
    } finally {
      setWorking(false);
    }
  }

  async function handleReject(candidate) {
    const candidateId = getCandidateId(candidate);
    if (!candidateId) return;

    Alert.alert("Reject imported event?", "This removes it from the pending queue.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          try {
            setWorking(true);
            await rejectImportCandidate(candidateId, token);
            setCandidates((current) =>
              current.filter((item) => getCandidateId(item) !== candidateId)
            );
          } catch (rejectError) {
            Alert.alert("Could not reject event", rejectError.message);
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  }

  async function handleRunImporter() {
    try {
      setWorking(true);
      const summary = await runEventImporter(token);
      const sourceErrorText = Array.isArray(summary.sourceErrors) && summary.sourceErrors.length
        ? `\nSource errors: ${summary.sourceErrors
            .map((item) => item.sourceName || item.message)
            .join(", ")}`
        : "";
      Alert.alert(
        "Event import completed",
        `Sources checked: ${summary.sourcesChecked}\nEvents discovered: ${summary.eventsDiscovered}\nNew candidates: ${summary.newCandidates}\nDuplicates: ${summary.duplicates}\nErrors: ${summary.errors}${sourceErrorText}`
      );
      await loadCandidates();
    } catch (runError) {
      Alert.alert("Could not run importer", runError.message);
    } finally {
      setWorking(false);
    }
  }

  async function handleSeedSources() {
    try {
      setWorking(true);
      const result = await seedStarterEventSources(token);
      Alert.alert(
        "Sources ready",
        `${result.sources?.length || 0} starter source saved. Run the importer next.`
      );
    } catch (seedError) {
      Alert.alert("Could not add sources", seedError.message);
    } finally {
      setWorking(false);
    }
  }

  async function handleApproveHighConfidence() {
    try {
      setWorking(true);
      const result = await approveHighConfidenceImportCandidates(token);
      Alert.alert(
        "High confidence events approved",
        `${result.approved?.length || 0} approved, ${result.errors?.length || 0} errors.`
      );
      await loadCandidates();
    } catch (approveError) {
      Alert.alert("Could not approve events", approveError.message);
    } finally {
      setWorking(false);
    }
  }

  async function handleCleanupStale() {
    try {
      setWorking(true);
      const result = await cleanupStaleImportCandidates(token);
      Alert.alert(
        "Bad imports cleaned",
        `${result.deletedCount || 0} stale date-title candidates removed.`
      );
      await loadCandidates();
    } catch (cleanupError) {
      Alert.alert("Could not clean imports", cleanupError.message);
    } finally {
      setWorking(false);
    }
  }

  if (!user?.isAdmin) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <PageHeader title="Event Imports" subtitle="Admin access required." />
        </View>
      </SafeAreaView>
    );
  }

  const highConfidenceCount = candidates.filter(
    (candidate) =>
      Number(candidate.confidenceScore) >= 90 && !candidate.duplicateOf
  ).length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="Event Imports"
          subtitle="New events found"
        />

        <View style={styles.actions}>
          <Pressable
            disabled={working}
            onPress={handleSeedSources}
            style={[styles.secondaryButton, { borderColor: theme.border }]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
              Add Starter Sources
            </Text>
          </Pressable>
          <Pressable
            disabled={working}
            onPress={handleRunImporter}
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.primaryButtonText, { color: theme.textOnAccent }]}>
              Run Importer
            </Text>
          </Pressable>
          <Pressable
            disabled={working || highConfidenceCount === 0}
            onPress={handleApproveHighConfidence}
            style={[
              styles.secondaryButton,
              { borderColor: theme.border, opacity: highConfidenceCount ? 1 : 0.5 },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
              Approve All High Confidence ({highConfidenceCount})
            </Text>
          </Pressable>
          <Pressable
            disabled={working}
            onPress={handleCleanupStale}
            style={[styles.secondaryButton, { borderColor: theme.border }]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
              Clean Bad Imports
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={theme.accent} style={styles.loader} />
        ) : null}
        {error ? <Text style={[styles.statusText, { color: theme.textMuted }]}>{error}</Text> : null}
        {!loading && candidates.length === 0 ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            No pending import candidates.
          </Text>
        ) : null}

        {candidates.map((candidate) => (
          <View
            key={getCandidateId(candidate)}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleWrap}>
                <Text style={[styles.title, { color: theme.text }]}>{candidate.title}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {[candidate.town, candidate.venue, formatDateTime(candidate)]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <Text style={[styles.score, { color: theme.accent }]}>
                {candidate.confidenceScore || 0}
              </Text>
            </View>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {[candidate.category, candidate.sourceName].filter(Boolean).join(" · ")}
            </Text>
            {candidate.importNotes ? (
              <Text style={[styles.notes, { color: theme.textMuted }]}>
                {candidate.importNotes}
              </Text>
            ) : null}
            <View style={styles.rowActions}>
              <Pressable
                disabled={working}
                onPress={() => handleApprove(candidate)}
                style={[styles.smallButton, { backgroundColor: theme.accent }]}
              >
                <Text style={[styles.smallButtonText, { color: theme.textOnAccent }]}>
                  Approve
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={() => setPreviewing(candidate)}
                style={[styles.smallOutlineButton, { borderColor: theme.border }]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Preview
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={() => openEdit(candidate)}
                style={[styles.smallOutlineButton, { borderColor: theme.border }]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Edit
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={() => handleReject(candidate)}
                style={[styles.smallOutlineButton, { borderColor: theme.border }]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Reject
                </Text>
              </Pressable>
              <Pressable
                onPress={() => candidate.sourceUrl && Linking.openURL(candidate.sourceUrl)}
                style={[styles.smallOutlineButton, { borderColor: theme.border }]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Open Source
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <Modal
        animationType="slide"
        transparent
        visible={Boolean(previewing)}
        onRequestClose={() => setPreviewing(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Approval preview
            </Text>
            {previewing ? (
              <View style={styles.previewSurface}>
                <EventCard
                  event={candidateToPreviewEvent(previewing)}
                  onPress={() => {}}
                />
                <Text style={[styles.previewLine, { color: theme.textMuted }]}>
                  Source: {previewing.sourceName || "Imported event"}
                </Text>
                <Text style={[styles.previewLink, { color: theme.accent }]}>
                  Link: {candidateToPreviewEvent(previewing).bookingUrl || "No link found"}
                </Text>
                {previewing.description ? (
                  <Text
                    style={[styles.previewDescription, { color: theme.text }]}
                    numberOfLines={8}
                  >
                    {previewing.description}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setPreviewing(null)}
                style={[styles.smallOutlineButton, { borderColor: theme.border }]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Close
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={() => {
                  const candidate = previewing;
                  setPreviewing(null);
                  if (candidate) handleApprove(candidate);
                }}
                style={[styles.smallButton, { backgroundColor: theme.accent }]}
              >
                <Text style={[styles.smallButtonText, { color: theme.textOnAccent }]}>
                  Approve
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent
        visible={Boolean(editing)}
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Edit imported event
            </Text>
            <ScrollView style={styles.modalFields}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  Town
                </Text>
                <View
                  style={[
                    styles.pickerWrap,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                    },
                  ]}
                >
                  <Picker
                    selectedValue={editForm.town || "Banff"}
                    onValueChange={(value) =>
                      setEditForm((current) => ({ ...current, town: value }))
                    }
                  >
                    {["Banff", "Canmore", "Lake Louise"].map((town) => (
                      <Picker.Item key={town} label={town} value={town} />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  Category
                </Text>
                <View
                  style={[
                    styles.pickerWrap,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                    },
                  ]}
                >
                  <Picker
                    selectedValue={editForm.category || "Other"}
                    onValueChange={(value) =>
                      setEditForm((current) => ({
                        ...current,
                        category: value,
                        categories: [value],
                      }))
                    }
                  >
                    {EVENT_MAIN_CATEGORIES.map((category) => (
                      <Picker.Item
                        key={category}
                        label={category}
                        value={category}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  Date
                </Text>
                <Pressable
                  onPress={() => setDatePickerVisible(true)}
                  style={[
                    styles.inputButton,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                    },
                  ]}
                >
                  <Text style={[styles.inputButtonText, { color: theme.text }]}>
                    {editForm.startDate || "Choose date"}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.timeRow}>
                {[
                  ["startTime", "Start time"],
                  ["endTime", "End time"],
                ].map(([key, label]) => (
                  <View key={key} style={[styles.fieldGroup, styles.timeField]}>
                    <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                      {label}
                    </Text>
                    <Pressable
                      onPress={() => setTimePickerTarget(key)}
                      style={[
                        styles.inputButton,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.background,
                        },
                      ]}
                    >
                      <Text style={[styles.inputButtonText, { color: theme.text }]}>
                        {editForm[key] || "Choose time"}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              {[
                ["title", "Title"],
                ["venue", "Venue"],
                ["address", "Address"],
                ["price", "Price"],
                ["ticketUrl", "Ticket URL"],
              ].map(([key, label]) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                    {label}
                  </Text>
                  <TextInput
                    value={editForm[key] || ""}
                    onChangeText={(value) =>
                      setEditForm((current) => ({ ...current, [key]: value }))
                    }
                    autoCapitalize={key === "ticketUrl" ? "none" : "sentences"}
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                      },
                    ]}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                disabled={working}
                onPress={() => setEditing(null)}
                style={[styles.smallOutlineButton, { borderColor: theme.border }]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={handleSaveEdit}
                style={[styles.smallButton, { backgroundColor: theme.accent }]}
              >
                <Text style={[styles.smallButtonText, { color: theme.textOnAccent }]}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <DatePickerModal
        visible={datePickerVisible}
        initialDate={parseDateString(editForm.startDate)}
        title="Select event date"
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={(date) => {
          setEditForm((current) => ({
            ...current,
            startDate: formatDateString(date),
          }));
          setDatePickerVisible(false);
        }}
      />
      <TimePickerModal
        key={timePickerTarget || "event-import-time-picker"}
        visible={Boolean(timePickerTarget)}
        initialTime={parseTimeString(editForm[timePickerTarget])}
        title={
          timePickerTarget === "endTime"
            ? "Select end time"
            : "Select start time"
        }
        onCancel={() => setTimePickerTarget(null)}
        onConfirm={(date) => {
          const key = timePickerTarget;
          setEditForm((current) => ({
            ...current,
            [key]: formatTimeString(date),
          }));
          setTimePickerTarget(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  actions: { gap: 10, marginBottom: 16 },
  primaryButton: {
    minHeight: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryButtonText: { fontSize: 14, fontWeight: "800" },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryButtonText: { fontSize: 13, fontWeight: "800" },
  loader: { marginVertical: 12 },
  statusText: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTitleWrap: { flex: 1 },
  title: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  meta: { fontSize: 12, lineHeight: 17 },
  notes: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  score: { fontSize: 22, fontWeight: "900" },
  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  smallButton: {
    minHeight: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  smallButtonText: { fontSize: 12, fontWeight: "900" },
  smallOutlineButton: {
    minHeight: 36,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  smallOutlineText: { fontSize: 12, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCard: {
    maxHeight: "86%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", marginBottom: 12 },
  modalFields: { maxHeight: 480 },
  previewSurface: {
    paddingVertical: 4,
    gap: 8,
  },
  previewLine: { fontSize: 13, lineHeight: 18 },
  previewLink: { fontSize: 12, lineHeight: 17, fontWeight: "800" },
  previewDescription: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  fieldGroup: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: "800", marginBottom: 5 },
  pickerWrap: {
    borderWidth: 1,
    borderRadius: 9,
    overflow: "hidden",
  },
  inputButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  inputButtonText: { fontSize: 14, fontWeight: "700" },
  timeRow: { flexDirection: "row", gap: 10 },
  timeField: { flex: 1 },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
});
