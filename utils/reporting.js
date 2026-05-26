import { Alert } from "react-native";

export const REPORT_REASONS = [
  { label: "Fake event", value: "fake_event" },
  { label: "Scam", value: "scam" },
  { label: "Inappropriate content", value: "inappropriate" },
  { label: "Misleading business", value: "misleading_business" },
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
