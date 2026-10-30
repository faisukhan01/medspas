import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { Avatar } from "./Avatar";
import { StatusPill } from "./StatusPill";
import { formatTime, moneyExact } from "@/lib/format";
import type { Appointment } from "@/lib/types";

interface AppointmentCardProps {
  appointment: Appointment;
  /** Show the provider name under the service line (branch-wide views). */
  showProvider?: boolean;
  /** Reveals the notes + action row. */
  expanded?: boolean;
  onPress?: () => void;
  /** Action buttons rendered inside the expanded footer. */
  actions?: ReactNode;
}

/**
 * One row of the day sheet: time range, patient avatar + name, service
 * emoji + name, price and status pill. Tapping toggles the action footer.
 */
export function AppointmentCard({
  appointment,
  showProvider = false,
  expanded = false,
  onPress,
  actions,
}: AppointmentCardProps) {
  const { startsAt, endsAt, status, price, notes, patient, provider, service, branch } = appointment;
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-3xl border bg-white p-4 active:opacity-90 ${
        expanded ? "border-emerald-200" : "border-stone-100"
      }`}
    >
      <View className="flex-row items-center">
        {/* Time range */}
        <View className="w-[76px]">
          <Text className="text-[15px] font-bold text-stone-900">{formatTime(startsAt)}</Text>
          <Text className="mt-0.5 text-[11px] text-stone-400">to {formatTime(endsAt)}</Text>
        </View>

        {/* Patient */}
        <Avatar name={`${patient.firstName} ${patient.lastName}`} color={patient.avatarColor} size={40} />
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-semibold text-stone-900" numberOfLines={1}>
            {patient.firstName} {patient.lastName}
          </Text>
          <Text className="mt-0.5 text-xs text-stone-500" numberOfLines={1}>
            {service.emoji} {service.name}
            {showProvider && provider?.name ? ` · ${provider.name}` : ""}
          </Text>
        </View>

        {/* Price + status */}
        <View className="items-end">
          <Text className="text-[15px] font-bold text-stone-900">{moneyExact(price, branch.currency)}</Text>
          <View className="mt-1">
            <StatusPill status={status} />
          </View>
        </View>
      </View>

      {expanded ? (
        <View className="mt-3 border-t border-stone-100 pt-3">
          {notes ? <Text className="mb-2.5 text-xs leading-4 text-stone-500">📝 {notes}</Text> : null}
          {actions}
        </View>
      ) : null}
    </Pressable>
  );
}
