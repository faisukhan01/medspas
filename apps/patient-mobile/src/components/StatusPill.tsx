import { Text, View } from "react-native";
import type { AppointmentStatus } from "@/lib/types";

interface PillStyle {
  label: string;
  bg: string;
  text: string;
}

/** Patient-friendly labels — internal statuses never leak to the UI. */
const STYLES: Record<AppointmentStatus, PillStyle> = {
  PENDING: { label: "Pending review", bg: "bg-amber-100", text: "text-amber-700" },
  CONFIRMED: { label: "Confirmed", bg: "bg-emerald-100", text: "text-emerald-700" },
  CHECKED_IN: { label: "You're checked in", bg: "bg-emerald-100", text: "text-emerald-700" },
  IN_PROGRESS: { label: "In treatment", bg: "bg-amber-100", text: "text-amber-700" },
  COMPLETED: { label: "Completed", bg: "bg-stone-200", text: "text-stone-600" },
  CANCELLED: { label: "Cancelled", bg: "bg-rose-100", text: "text-rose-700" },
  NO_SHOW: { label: "Missed", bg: "bg-stone-200", text: "text-stone-500" },
};

export function StatusPill({ status, extraClasses = "" }: { status: AppointmentStatus; extraClasses?: string }) {
  const style = STYLES[status] ?? STYLES.PENDING;
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${style.bg} ${extraClasses}`}>
      <Text className={`text-[11px] font-semibold ${style.text}`}>{style.label}</Text>
    </View>
  );
}
