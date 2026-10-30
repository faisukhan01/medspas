import { Text, View } from "react-native";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  /** Small icon rendered in a tinted tile above the value. */
  icon?: ReactNode;
}

/** Compact white metric tile for stat rows. */
export function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <View className="flex-1 rounded-2xl border border-stone-100 bg-white p-4">
      {icon ? (
        <View className="mb-2 h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
          {icon}
        </View>
      ) : null}
      <Text className="text-xl font-bold text-stone-900" numberOfLines={1}>
        {value}
      </Text>
      <Text className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-400" numberOfLines={1}>
        {label}
      </Text>
      {sub ? (
        <Text className="mt-1 text-[11px] text-stone-400" numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
