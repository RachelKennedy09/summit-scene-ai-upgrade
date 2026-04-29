import { Alert } from "react-native";

export const REPORT_REASONS = [
  { label: "Harassment or bullying", value: "harassment" },
  { label: "Spam", value: "spam" },
  { label: "Unsafe behavior", value: "unsafe" },
  { label: "Scam or fake account", value: "scam" },
  { label: "Inappropriate content", value: "inappropriate" },
  { label: "Other", value: "other" },
];

export function openReportReasonPicker({ onSelect }) {
  Alert.alert(
    "Report this?",
    "Choose the closest reason. Reports are saved for review.",
    [
      ...REPORT_REASONS.map((reason) => ({
        text: reason.label,
        onPress: () => onSelect(reason.value),
      })),
      { text: "Cancel", style: "cancel" },
    ]
  );
}
