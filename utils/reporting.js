import { Alert } from "react-native";

const EVENT_REPORT_REASONS = [
  { label: "Fake event", value: "fake_event" },
  { label: "Scam", value: "scam" },
  { label: "Inappropriate content", value: "inappropriate" },
  { label: "Misleading business", value: "misleading_business" },
  { label: "Other", value: "other" },
];

const COMMUNITY_REPORT_REASONS = [
  { label: "Harassment or bullying", value: "harassment" },
  { label: "Spam", value: "spam" },
  { label: "Unsafe behavior", value: "unsafe" },
  { label: "Scam", value: "scam" },
  { label: "Inappropriate content", value: "inappropriate" },
  { label: "Other", value: "other" },
];

const PROFILE_REPORT_REASONS = [
  { label: "Harassment or bullying", value: "harassment" },
  { label: "Spam or fake profile", value: "spam" },
  { label: "Unsafe behavior", value: "unsafe" },
  { label: "Scam", value: "scam" },
  { label: "Inappropriate profile content", value: "inappropriate" },
  { label: "Other", value: "other" },
];

export const REPORT_REASONS = EVENT_REPORT_REASONS;

function getReportReasons(targetType) {
  if (targetType === "user") return PROFILE_REPORT_REASONS;

  if (
    targetType === "communityPost" ||
    targetType === "communityReply" ||
    targetType === "buddyPost" ||
    targetType === "buddyReply"
  ) {
    return COMMUNITY_REPORT_REASONS;
  }

  return EVENT_REPORT_REASONS;
}

export function openReportReasonPicker({ targetType, onSelect }) {
  const reasons = getReportReasons(targetType);

  Alert.alert(
    "Report this?",
    "Choose the closest reason. Reports are saved for review.",
    [
      ...reasons.map((reason) => ({
        text: reason.label,
        onPress: () => onSelect(reason.value),
      })),
      { text: "Cancel", style: "cancel" },
    ]
  );
}
