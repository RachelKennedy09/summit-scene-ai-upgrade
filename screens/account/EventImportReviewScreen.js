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
  createEventSource,
  deleteEventSource,
  fetchEventSources,
  fetchImportCandidates,
  rejectImportCandidate,
  retryEventSource,
  runEventImporter,
  seedStarterEventSources,
  updateEventSource,
  updateImportCandidate,
} from "../../services/adminApi";

const TOWNS = ["Banff", "Canmore", "Lake Louise"];
const SOURCE_TYPES = ["html", "json-ld", "rss", "custom"];

function getCandidateId(candidate) {
  return String(candidate?._id || candidate?.id || "");
}

function formatDateTime(candidate) {
  if (candidate?.scheduleType === "recurring" || candidate?.recurrence) {
    const weekdays = Array.isArray(candidate?.recurrence?.weekdays)
      ? candidate.recurrence.weekdays
      : [];
    const recurrenceLabel = weekdays.length
      ? `Repeats ${weekdays.join(", ")}`
      : `Repeats ${candidate?.recurrence?.frequency || "daily"}`;
    const timeRange = [candidate.startTime, candidate.endTime]
      .filter(Boolean)
      .join(" - ");
    return [recurrenceLabel, timeRange].filter(Boolean).join(" | ");
  }

  const dateRange = [candidate.startDate, candidate.endDate]
    .filter(Boolean)
    .join(" to ");
  const timeRange = [candidate.startTime, candidate.endTime]
    .filter(Boolean)
    .join(" - ");
  return [dateRange, timeRange].filter(Boolean).join(" | ");
}

export default function EventImportReviewScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [workingLabel, setWorkingLabel] = useState("");
  const [error, setError] = useState("");
  const [sources, setSources] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [previewing, setPreviewing] = useState(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState(null);
  const [sourceEditing, setSourceEditing] = useState(null);
  const [sourceForm, setSourceForm] = useState({});

  async function loadImportData() {
    if (!user?.isAdmin || !token) return;
    try {
      setLoading(true);
      setError("");
      const [nextCandidates, nextSources] = await Promise.all([
        fetchImportCandidates(token, "pending"),
        fetchEventSources(token),
      ]);
      setCandidates(nextCandidates);
      setSources(nextSources);
    } catch (loadError) {
      setError(loadError.message || "Could not load event imports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadImportData();
  }, [token, user?.isAdmin]);

  async function handleApprove(candidate) {
    const candidateId = getCandidateId(candidate);
    if (!candidateId) return;

    try {
      setWorking(true);
      setWorkingLabel("Approving event...");
      await approveImportCandidate(candidateId, token);
      setCandidates((current) =>
        current.filter((item) => getCandidateId(item) !== candidateId)
      );
    } catch (approveError) {
      Alert.alert("Could not approve event", approveError.message);
    } finally {
      setWorking(false);
      setWorkingLabel("");
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
      endDate: candidate.endDate || "",
      startTime: candidate.startTime || "",
      endTime: candidate.endTime || "",
      scheduleType: candidate.scheduleType || "single",
      recurrence: candidate.recurrence || undefined,
      price: candidate.price || "",
      ticketUrl: candidate.ticketUrl || "",
    });
  }

  function candidateToPreviewEvent(candidate) {
    const link = candidate.ticketUrl || candidate.sourceUrl || "";
    const hasDateRange =
      candidate.endDate &&
      candidate.startDate &&
      candidate.endDate > candidate.startDate;
    const isRecurring =
      candidate.scheduleType === "recurring" || Boolean(candidate.recurrence) || hasDateRange;
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
      scheduleType: isRecurring ? "recurring" : "single",
      recurrence: isRecurring
        ? candidate.recurrence || {
            frequency: "daily",
            untilDate: candidate.endDate,
            weekdays: [],
            dates: [],
          }
        : undefined,
      locationName: candidate.venue || "",
      address: candidate.address || "",
      imageUrl: "",
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
      setWorkingLabel("Saving event changes...");
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
      setWorkingLabel("");
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
            setWorkingLabel("Rejecting imported event...");
            await rejectImportCandidate(candidateId, token);
            setCandidates((current) =>
              current.filter((item) => getCandidateId(item) !== candidateId)
            );
          } catch (rejectError) {
            Alert.alert("Could not reject event", rejectError.message);
          } finally {
            setWorking(false);
            setWorkingLabel("");
          }
        },
      },
    ]);
  }

  async function handleRunImporter() {
    try {
      setWorking(true);
      setWorkingLabel("Running importer. This can take a minute...");
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
      await loadImportData();
    } catch (runError) {
      Alert.alert("Could not run importer", runError.message);
    } finally {
      setWorking(false);
      setWorkingLabel("");
    }
  }

  async function handleSeedSources() {
    try {
      setWorking(true);
      setWorkingLabel("Adding starter sources...");
      const result = await seedStarterEventSources(token);
      Alert.alert(
        "Sources ready",
        `${result.sources?.length || 0} starter source saved. Run the importer next.`
      );
    } catch (seedError) {
      Alert.alert("Could not add sources", seedError.message);
    } finally {
      setWorking(false);
      setWorkingLabel("");
    }
  }

  async function handleApproveHighConfidence() {
    try {
      setWorking(true);
      setWorkingLabel("Approving high confidence events...");
      const result = await approveHighConfidenceImportCandidates(token);
      Alert.alert(
        "High confidence events approved",
        `${result.approved?.length || 0} approved, ${result.errors?.length || 0} errors.`
      );
      await loadImportData();
    } catch (approveError) {
      Alert.alert("Could not approve events", approveError.message);
    } finally {
      setWorking(false);
      setWorkingLabel("");
    }
  }

  async function handleCleanupStale() {
    try {
      setWorking(true);
      setWorkingLabel("Cleaning bad imports...");
      const result = await cleanupStaleImportCandidates(token);
      Alert.alert(
        "Bad imports cleaned",
        `${result.deletedCount || 0} stale date-title candidates removed.`
      );
      await loadImportData();
    } catch (cleanupError) {
      Alert.alert("Could not clean imports", cleanupError.message);
    } finally {
      setWorking(false);
      setWorkingLabel("");
    }
  }

  function openSourceEditor(source = null) {
    setSourceEditing(source || { isNew: true });
    setSourceForm({
      name: source?.name || "",
      url: source?.url || "",
      town: source?.town || "Banff",
      sourceType: source?.sourceType || "html",
      enabled: source?.enabled !== false,
      trusted: Boolean(source?.trusted),
      permittedImageUrl: source?.permittedImageUrl || "",
      imagePermissionNote: source?.imagePermissionNote || "",
    });
  }

  async function handleSaveSource() {
    try {
      setWorking(true);
      setWorkingLabel("Saving event source...");
      if (sourceEditing?.isNew) {
        const created = await createEventSource(sourceForm, token);
        setSources((current) => [...current, created].sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""))
        ));
      } else {
        const sourceId = getCandidateId(sourceEditing);
        const updated = await updateEventSource(sourceId, sourceForm, token);
        setSources((current) =>
          current.map((source) =>
            getCandidateId(source) === sourceId ? updated : source
          )
        );
      }
      setSourceEditing(null);
    } catch (sourceError) {
      Alert.alert("Could not save source", sourceError.message);
    } finally {
      setWorking(false);
      setWorkingLabel("");
    }
  }

  async function handleToggleSource(source) {
    const sourceId = getCandidateId(source);
    if (!sourceId) return;

    try {
      setWorking(true);
      setWorkingLabel(source.enabled === false ? "Enabling source..." : "Disabling source...");
      const updated = await updateEventSource(
        sourceId,
        { enabled: source.enabled === false },
        token
      );
      setSources((current) =>
        current.map((item) =>
          getCandidateId(item) === sourceId ? updated : item
        )
      );
    } catch (sourceError) {
      Alert.alert("Could not update source", sourceError.message);
    } finally {
      setWorking(false);
      setWorkingLabel("");
    }
  }

  async function handleRetrySource(source) {
    const sourceId = getCandidateId(source);
    if (!sourceId) return;

    try {
      setWorking(true);
      setWorkingLabel("Retrying source import...");
      const summary = await retryEventSource(sourceId, token);
      Alert.alert(
        "Source retry completed",
        `Events discovered: ${summary.eventsDiscovered}\nNew candidates: ${summary.newCandidates}\nDuplicates: ${summary.duplicates}\nErrors: ${summary.errors}`
      );
      await loadImportData();
    } catch (sourceError) {
      Alert.alert("Could not retry source", sourceError.message);
    } finally {
      setWorking(false);
      setWorkingLabel("");
    }
  }

  function handleDeleteSource(source) {
    const sourceId = getCandidateId(source);
    if (!sourceId) return;

    Alert.alert(
      "Delete event source?",
      `This removes "${source.name || "this source"}" from future importer runs. Existing approved events will stay in the app.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setWorking(true);
              setWorkingLabel("Deleting event source...");
              await deleteEventSource(sourceId, token);
              setSources((current) =>
                current.filter((item) => getCandidateId(item) !== sourceId)
              );
            } catch (sourceError) {
              Alert.alert("Could not delete source", sourceError.message);
            } finally {
              setWorking(false);
              setWorkingLabel("");
            }
          },
        },
      ]
    );
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
            style={[
              styles.secondaryButton,
              { borderColor: theme.border },
              working && styles.buttonDisabled,
            ]}
          >
            <View style={styles.buttonContent}>
              {workingLabel === "Adding starter sources..." ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : null}
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                {workingLabel === "Adding starter sources..."
                  ? "Adding Sources..."
                  : "Add Starter Sources"}
              </Text>
            </View>
          </Pressable>
          <Pressable
            disabled={working}
            onPress={handleRunImporter}
            style={[
              styles.primaryButton,
              { backgroundColor: theme.accent },
              working && styles.buttonDisabled,
            ]}
          >
            <View style={styles.buttonContent}>
              {workingLabel.startsWith("Running importer") ? (
                <ActivityIndicator size="small" color={theme.textOnAccent} />
              ) : null}
              <Text style={[styles.primaryButtonText, { color: theme.textOnAccent }]}>
                {workingLabel.startsWith("Running importer")
                  ? "Running Importer..."
                  : "Run Importer"}
              </Text>
            </View>
          </Pressable>
          <Pressable
            disabled={working || highConfidenceCount === 0}
            onPress={handleApproveHighConfidence}
            style={[
              styles.secondaryButton,
              { borderColor: theme.border, opacity: highConfidenceCount ? 1 : 0.5 },
              working && styles.buttonDisabled,
            ]}
          >
            <View style={styles.buttonContent}>
              {workingLabel === "Approving high confidence events..." ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : null}
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                {workingLabel === "Approving high confidence events..."
                  ? "Approving Events..."
                  : `Approve All High Confidence (${highConfidenceCount})`}
              </Text>
            </View>
          </Pressable>
          <Pressable
            disabled={working}
            onPress={handleCleanupStale}
            style={[
              styles.secondaryButton,
              { borderColor: theme.border },
              working && styles.buttonDisabled,
            ]}
          >
            <View style={styles.buttonContent}>
              {workingLabel === "Cleaning bad imports..." ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : null}
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                {workingLabel === "Cleaning bad imports..."
                  ? "Cleaning Imports..."
                  : "Clean Bad Imports"}
              </Text>
            </View>
          </Pressable>
        </View>

        {workingLabel ? (
          <View
            style={[
              styles.workingBanner,
              {
                backgroundColor: theme.accentSoft || theme.card,
                borderColor: theme.accent,
              },
            ]}
          >
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={[styles.workingBannerText, { color: theme.text }]}>
              {workingLabel}
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Event sources
          </Text>
          <Pressable
            disabled={working}
            onPress={() => openSourceEditor()}
            style={[styles.smallOutlineButton, { borderColor: theme.border }]}
          >
            <Text style={[styles.smallOutlineText, { color: theme.text }]}>
              Add Source
            </Text>
          </Pressable>
        </View>

        {sources.map((source) => (
          <View
            key={getCandidateId(source)}
            style={[
              styles.sourceCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleWrap}>
                <Text style={[styles.title, { color: theme.text }]}>
                  {source.name}
                </Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {[source.town, source.sourceType, source.enabled === false ? "Disabled" : "Enabled"]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
                <Text
                  style={[styles.meta, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  {source.url}
                </Text>
              </View>
              <Text style={[styles.sourceStatus, { color: theme.accent }]}>
                {source.trusted ? "Trusted" : "Source"}
              </Text>
            </View>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              Failures: {source.consecutiveFailures || 0}
            </Text>
            {source.permittedImageUrl ? (
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                Permitted photo set
                {source.imagePermissionNote ? ` - ${source.imagePermissionNote}` : ""}
              </Text>
            ) : null}
            <View style={styles.rowActions}>
              <Pressable
                disabled={working}
                onPress={() => handleToggleSource(source)}
                style={[
                  styles.smallButton,
                  { backgroundColor: theme.accent },
                  working && styles.buttonDisabled,
                ]}
              >
                <Text style={[styles.smallButtonText, { color: theme.textOnAccent }]}>
                  {source.enabled === false ? "Enable" : "Disable"}
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={() => openSourceEditor(source)}
                style={[
                  styles.smallOutlineButton,
                  { borderColor: theme.border },
                  working && styles.buttonDisabled,
                ]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Edit
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={() => handleRetrySource(source)}
                style={[
                  styles.smallOutlineButton,
                  { borderColor: theme.border },
                  working && styles.buttonDisabled,
                ]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Retry
                </Text>
              </Pressable>
              <Pressable
                onPress={() => source.url && Linking.openURL(source.url)}
                style={[styles.smallOutlineButton, { borderColor: theme.border }]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Open
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={() => handleDeleteSource(source)}
                style={[
                  styles.smallOutlineButton,
                  { borderColor: theme.danger || "#B42318" },
                  working && styles.buttonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.smallOutlineText,
                    { color: theme.danger || "#B42318" },
                  ]}
                >
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            New events found
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {candidates.length} pending
          </Text>
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
                    .join(" | ")}
                </Text>
              </View>
              <Text style={[styles.score, { color: theme.accent }]}>
                {candidate.confidenceScore || 0}
              </Text>
            </View>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {[candidate.category, candidate.sourceName].filter(Boolean).join(" | ")}
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
                style={[
                  styles.smallButton,
                  { backgroundColor: theme.accent },
                  working && styles.buttonDisabled,
                ]}
              >
                <Text style={[styles.smallButtonText, { color: theme.textOnAccent }]}>
                  Approve
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={() => setPreviewing(candidate)}
                style={[
                  styles.smallOutlineButton,
                  { borderColor: theme.border },
                  working && styles.buttonDisabled,
                ]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Preview
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={() => openEdit(candidate)}
                style={[
                  styles.smallOutlineButton,
                  { borderColor: theme.border },
                  working && styles.buttonDisabled,
                ]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Edit
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={() => handleReject(candidate)}
                style={[
                  styles.smallOutlineButton,
                  { borderColor: theme.border },
                  working && styles.buttonDisabled,
                ]}
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
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.previewSurface}
                keyboardShouldPersistTaps="handled"
              >
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
              </ScrollView>
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
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalFields}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  Town
                </Text>
                <View style={styles.optionRow}>
                  {TOWNS.map((town) => {
                    const selected = (editForm.town || "Banff") === town;
                    return (
                      <Pressable
                        key={town}
                        onPress={() =>
                          setEditForm((current) => ({ ...current, town }))
                        }
                        style={[
                          styles.optionChip,
                          {
                            borderColor: selected ? theme.accent : theme.border,
                            backgroundColor: selected
                              ? theme.accentSoft || theme.background
                              : theme.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            { color: selected ? theme.accent : theme.text },
                          ]}
                        >
                          {town}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  Category
                </Text>
                <View style={styles.optionGrid}>
                  {EVENT_MAIN_CATEGORIES.map((category) => {
                    const selected = (editForm.category || "Other") === category;
                    return (
                      <Pressable
                        key={category}
                        onPress={() =>
                          setEditForm((current) => ({
                            ...current,
                            category,
                            categories: [category],
                          }))
                        }
                        style={[
                          styles.optionChip,
                          styles.categoryOptionChip,
                          {
                            borderColor: selected ? theme.accent : theme.border,
                            backgroundColor: selected
                              ? theme.accentSoft || theme.background
                              : theme.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            { color: selected ? theme.accent : theme.text },
                          ]}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  Start date
                </Text>
                <Pressable
                  onPress={() => setDatePickerVisible("startDate")}
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
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  End date
                </Text>
                <Pressable
                  onPress={() => setDatePickerVisible("endDate")}
                  style={[
                    styles.inputButton,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                    },
                  ]}
                >
                  <Text style={[styles.inputButtonText, { color: theme.text }]}>
                    {editForm.endDate || "No end date"}
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
                style={[
                  styles.smallOutlineButton,
                  { borderColor: theme.border },
                  working && styles.buttonDisabled,
                ]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={handleSaveEdit}
                style={[
                  styles.smallButton,
                  { backgroundColor: theme.accent },
                  working && styles.buttonDisabled,
                ]}
              >
                <View style={styles.buttonContent}>
                  {workingLabel === "Saving event changes..." ? (
                    <ActivityIndicator size="small" color={theme.textOnAccent} />
                  ) : null}
                  <Text style={[styles.smallButtonText, { color: theme.textOnAccent }]}>
                    {workingLabel === "Saving event changes..." ? "Saving..." : "Save"}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent
        visible={Boolean(sourceEditing)}
        onRequestClose={() => setSourceEditing(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {sourceEditing?.isNew ? "Add event source" : "Edit event source"}
            </Text>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalFields}
              keyboardShouldPersistTaps="handled"
            >
              {[
                ["name", "Name"],
                ["url", "URL"],
                ["permittedImageUrl", "Permitted venue photo URL"],
                ["imagePermissionNote", "Photo permission note"],
              ].map(([key, label]) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                    {label}
                  </Text>
                  <TextInput
                    value={sourceForm[key] || ""}
                    onChangeText={(value) =>
                      setSourceForm((current) => ({ ...current, [key]: value }))
                    }
                    autoCapitalize={
                      key === "url" || key === "permittedImageUrl"
                        ? "none"
                        : "sentences"
                    }
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
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  Town
                </Text>
                <View style={styles.optionRow}>
                  {TOWNS.map((town) => {
                    const selected = (sourceForm.town || "Banff") === town;
                    return (
                      <Pressable
                        key={town}
                        onPress={() =>
                          setSourceForm((current) => ({ ...current, town }))
                        }
                        style={[
                          styles.optionChip,
                          {
                            borderColor: selected ? theme.accent : theme.border,
                            backgroundColor: selected
                              ? theme.accentSoft || theme.background
                              : theme.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            { color: selected ? theme.accent : theme.text },
                          ]}
                        >
                          {town}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>
                  Source type
                </Text>
                <View style={styles.optionRow}>
                  {SOURCE_TYPES.map((sourceType) => {
                    const selected = (sourceForm.sourceType || "html") === sourceType;
                    return (
                      <Pressable
                        key={sourceType}
                        onPress={() =>
                          setSourceForm((current) => ({ ...current, sourceType }))
                        }
                        style={[
                          styles.optionChip,
                          {
                            borderColor: selected ? theme.accent : theme.border,
                            backgroundColor: selected
                              ? theme.accentSoft || theme.background
                              : theme.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            { color: selected ? theme.accent : theme.text },
                          ]}
                        >
                          {sourceType}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.optionRow}>
                {[
                  ["enabled", "Enabled"],
                  ["trusted", "Trusted"],
                ].map(([key, label]) => {
                  const selected = Boolean(sourceForm[key]);
                  return (
                    <Pressable
                      key={key}
                      onPress={() =>
                        setSourceForm((current) => ({
                          ...current,
                          [key]: !current[key],
                        }))
                      }
                      style={[
                        styles.optionChip,
                        {
                          borderColor: selected ? theme.accent : theme.border,
                          backgroundColor: selected
                            ? theme.accentSoft || theme.background
                            : theme.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          { color: selected ? theme.accent : theme.text },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable
                disabled={working}
                onPress={() => setSourceEditing(null)}
                style={[
                  styles.smallOutlineButton,
                  { borderColor: theme.border },
                  working && styles.buttonDisabled,
                ]}
              >
                <Text style={[styles.smallOutlineText, { color: theme.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                disabled={working}
                onPress={handleSaveSource}
                style={[
                  styles.smallButton,
                  { backgroundColor: theme.accent },
                  working && styles.buttonDisabled,
                ]}
              >
                <View style={styles.buttonContent}>
                  {workingLabel === "Saving event source..." ? (
                    <ActivityIndicator size="small" color={theme.textOnAccent} />
                  ) : null}
                  <Text style={[styles.smallButtonText, { color: theme.textOnAccent }]}>
                    {workingLabel === "Saving event source..." ? "Saving..." : "Save"}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <DatePickerModal
        key={datePickerVisible || "event-import-date-picker"}
        visible={Boolean(datePickerVisible)}
        initialDate={parseDateString(editForm[datePickerVisible])}
        title={datePickerVisible === "endDate" ? "Select end date" : "Select start date"}
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={(date) => {
          const key = datePickerVisible;
          setEditForm((current) => ({
            ...current,
            [key]: formatDateString(date),
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
  workingBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  workingBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.62,
  },
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: "900" },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  sourceCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
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
  sourceStatus: { fontSize: 12, fontWeight: "900" },
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
    width: "100%",
    maxHeight: "90%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", marginBottom: 12 },
  modalBody: { flexGrow: 0, flexShrink: 1 },
  modalFields: { paddingBottom: 8 },
  previewSurface: {
    paddingVertical: 4,
    gap: 8,
  },
  previewLine: { fontSize: 13, lineHeight: 18 },
  previewLink: { fontSize: 12, lineHeight: 17, fontWeight: "800" },
  previewDescription: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  fieldGroup: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: "800", marginBottom: 5 },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 9,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  categoryOptionChip: {
    minWidth: "46%",
    flexGrow: 1,
  },
  optionChipText: { fontSize: 13, fontWeight: "800" },
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
