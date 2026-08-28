import React, { useEffect, useMemo, useState } from "react";
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
import {
  deleteAttributionAnalytics,
  fetchAnalyticsAttributions,
  fetchAnalyticsSummary,
  fetchAttributionAnalytics,
  fetchBusinessAnalytics,
} from "../../services/analyticsApi";

const DAY_OPTIONS = ["7", "30", "90", "all"];
const METRICS = [
  ["uniqueSessions", "Unique sessions"],
  ["eventImpressions", "Event impressions"],
  ["eventViews", "Event views"],
  ["businessViews", "Business views"],
  ["websiteClicks", "Website clicks"],
  ["saves", "Saves"],
  ["going", "Going"],
  ["shares", "Shares"],
];

function formatCount(value) {
  return Number(value || 0).toLocaleString();
}

function MetricGrid({ data, theme }) {
  return (
    <View style={styles.metricGrid}>
      {METRICS.map(([key, label]) => (
        <View
          key={key}
          style={[
            styles.metricCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {formatCount(data?.[key])}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textMuted }]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TopEventsList({ title, events, theme, valueKey }) {
  if (!events?.length) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {events.map((event) => (
        <View
          key={`${title}-${event.eventId}`}
          style={[
            styles.eventRow,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.eventCopy}>
            <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>
              {event.title || "Event"}
            </Text>
            <Text style={[styles.eventMeta, { color: theme.textMuted }]}>
              {formatCount(event.views)} views | {formatCount(event.saves)} saves
            </Text>
          </View>
          <Text style={[styles.eventValue, { color: theme.accent }]}>
            {formatCount(event[valueKey])}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function AdminAnalyticsScreen() {
  const { user, token } = useAuth();
  const { theme } = useTheme();
  const [days, setDays] = useState("30");
  const [summary, setSummary] = useState(null);
  const [attributions, setAttributions] = useState([]);
  const [attributionAnalytics, setAttributionAnalytics] = useState(null);
  const [businessId, setBusinessId] = useState("");
  const [businessAnalytics, setBusinessAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attributionLoadingKey, setAttributionLoadingKey] = useState("");
  const [businessLoading, setBusinessLoading] = useState(false);
  const [error, setError] = useState("");

  const dayLabel = useMemo(
    () => (days === "all" ? "All time" : `Last ${days} days`),
    [days]
  );

  async function loadSummary() {
    if (!user?.isAdmin || !token) return;

    try {
      setLoading(true);
      setError("");
      const [nextSummary, nextAttributions] = await Promise.all([
        fetchAnalyticsSummary(token, days),
        fetchAnalyticsAttributions(token, days),
      ]);
      setSummary(nextSummary);
      setAttributions(nextAttributions.attributions || []);
    } catch (loadError) {
      setError(loadError.message || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, [days, token, user?.isAdmin]);

  async function handleLoadBusinessAnalytics() {
    const id = businessId.trim();
    if (!id) {
      Alert.alert("Business ID required", "Paste a business user ID to view its analytics.");
      return;
    }

    try {
      setBusinessLoading(true);
      setBusinessAnalytics(await fetchBusinessAnalytics(id, token, days));
    } catch (loadError) {
      Alert.alert(
        "Could not load business analytics",
        loadError.message || "Please check the business ID and try again."
      );
    } finally {
      setBusinessLoading(false);
    }
  }

  async function handleLoadAttributionAnalytics(attribution) {
    const key = attribution?.attributionKey;
    if (!key) return;

    try {
      setAttributionLoadingKey(key);
      setAttributionAnalytics(await fetchAttributionAnalytics(key, token, days));
    } catch (loadError) {
      Alert.alert(
        "Could not load source analytics",
        loadError.message || "Please try again."
      );
    } finally {
      setAttributionLoadingKey("");
    }
  }

  function handleDeleteAttributionAnalytics(attribution) {
    const key = attribution?.attributionKey;
    if (!key) return;

    Alert.alert(
      "Delete source analytics?",
      `This removes tracked analytics rows for "${attribution.attributionName || "this source"}". It will not delete events or importer sources.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setAttributionLoadingKey(key);
              await deleteAttributionAnalytics(key, token);
              setAttributions((current) =>
                current.filter((item) => item.attributionKey !== key)
              );
              setAttributionAnalytics((current) =>
                current?.attributionKey === key ? null : current
              );
              await loadSummary();
            } catch (deleteError) {
              Alert.alert(
                "Could not delete analytics",
                deleteError.message || "Please try again."
              );
            } finally {
              setAttributionLoadingKey("");
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
          title="Analytics"
          subtitle="Aggregate event and business activity collected by Summit Scene."
          rightAccessory={
            <Pressable onPress={loadSummary} disabled={loading}>
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

        <View style={styles.dayRow}>
          {DAY_OPTIONS.map((option) => {
            const selected = option === days;
            return (
              <Pressable
                key={option}
                onPress={() => setDays(option)}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: selected ? theme.accent : theme.card,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayChipText,
                    {
                      color: selected
                        ? theme.onAccent || theme.textOnAccent || "#FFFFFF"
                        : theme.text,
                    },
                  ]}
                >
                  {option === "all" ? "All" : `${option}d`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.periodText, { color: theme.textMuted }]}>
          {dayLabel}
        </Text>

        {error ? (
          <Text style={[styles.statusText, { color: theme.textMuted }]}>
            {error}
          </Text>
        ) : null}

        <MetricGrid data={summary} theme={theme} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Source / organizer reports
          </Text>
          <Text style={[styles.lookupHelp, { color: theme.textMuted }]}>
            Imported events are grouped by their original organizer or source, even when Summit Scene posted them.
          </Text>
          {attributions.length ? (
            attributions.map((attribution) => {
              const loadingSource =
                attributionLoadingKey === attribution.attributionKey;
              return (
                <View
                  key={attribution.attributionKey}
                  style={[
                    styles.sourceRow,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    loadingSource && styles.disabled,
                  ]}
                >
                  <View style={styles.eventCopy}>
                    <Text
                      style={[styles.eventTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {attribution.attributionName || "Source"}
                    </Text>
                    <Text style={[styles.eventMeta, { color: theme.textMuted }]}>
                      {attribution.attributionType || "source"} | {formatCount(attribution.total)} tracked actions
                    </Text>
                  </View>
                  <View style={styles.sourceActions}>
                    <Pressable
                      onPress={() => handleLoadAttributionAnalytics(attribution)}
                      disabled={Boolean(attributionLoadingKey)}
                      style={[
                        styles.sourceActionButton,
                        { borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.sourceActionText, { color: theme.accent }]}>
                        {loadingSource ? "..." : "View"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteAttributionAnalytics(attribution)}
                      disabled={Boolean(attributionLoadingKey)}
                      style={[
                        styles.sourceActionButton,
                        { borderColor: theme.danger || "#B42318" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourceActionText,
                          { color: theme.danger || "#B42318" },
                        ]}
                      >
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={[styles.statusText, { color: theme.textMuted }]}>
              No source analytics yet. New activity will appear here after the updated backend is deployed.
            </Text>
          )}
        </View>

        {attributionAnalytics ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {attributionAnalytics.attributionName || "Source"} totals
            </Text>
            <MetricGrid data={attributionAnalytics} theme={theme} />
            <TopEventsList
              title="Top source events by views"
              events={attributionAnalytics.topEventsByViews}
              theme={theme}
              valueKey="views"
            />
            <TopEventsList
              title="Top source events by saves"
              events={attributionAnalytics.topEventsBySaves}
              theme={theme}
              valueKey="saves"
            />
          </>
        ) : null}

        <View
          style={[
            styles.lookupCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.lookupTitle, { color: theme.text }]}>
            Business account lookup
          </Text>
          <Text style={[styles.lookupHelp, { color: theme.textMuted }]}>
            Paste a business user ID for events posted directly by that business account.
          </Text>
          <TextInput
            value={businessId}
            onChangeText={setBusinessId}
            placeholder="Business user ID"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
          />
          <Pressable
            onPress={handleLoadBusinessAnalytics}
            disabled={businessLoading}
            style={[
              styles.primaryButton,
              { backgroundColor: theme.accent },
              businessLoading && styles.disabled,
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: theme.onAccent || theme.textOnAccent || "#FFFFFF" },
              ]}
            >
              {businessLoading ? "Loading..." : "Load business report"}
            </Text>
          </Pressable>
        </View>

        {businessAnalytics ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Business totals
            </Text>
            <MetricGrid data={businessAnalytics} theme={theme} />
            <TopEventsList
              title="Top events by views"
              events={businessAnalytics.topEventsByViews}
              theme={theme}
              valueKey="views"
            />
            <TopEventsList
              title="Top events by saves"
              events={businessAnalytics.topEventsBySaves}
              theme={theme}
              valueKey="saves"
            />
          </>
        ) : null}
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
    paddingBottom: 36,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "800",
  },
  dayRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  dayChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "900",
  },
  periodText: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 12,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  metricCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 84,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  lookupCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 18,
  },
  lookupTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 5,
  },
  lookupHelp: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.65,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  eventRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sourceRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sourceActions: {
    gap: 6,
  },
  sourceActionButton: {
    borderWidth: 1,
    borderRadius: 8,
    minWidth: 64,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  sourceActionText: {
    fontSize: 12,
    fontWeight: "900",
  },
  eventCopy: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  eventMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  eventValue: {
    fontSize: 18,
    fontWeight: "900",
  },
});
