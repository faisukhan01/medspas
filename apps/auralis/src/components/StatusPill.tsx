import { Text, View } from "react-native";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";
import type { AppointmentStatus } from "@/lib/types";

interface StatusPillProps {
  status: AppointmentStatus;
  extraClasses?: string;
}

/** Status pill using the spec's hex palette, tinted at ~10% alpha. */
export function StatusPill({ status, extraClasses = "" }: StatusPillProps) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${extraClasses}`}
      style={{ backgroundColor: `${color}1A` }}
    >
      <Text style={{ color }} className="text-[11px] font-semibold">
        {STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
}
