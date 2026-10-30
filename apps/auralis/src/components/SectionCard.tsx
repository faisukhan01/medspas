import { Text, View } from "react-native";
import type { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  /** Small action element rendered on the title row (e.g. "See all"). */
  action?: ReactNode;
  children: ReactNode;
  extraClasses?: string;
}

/** White rounded-3xl card with an optional title row. */
export function SectionCard({ title, subtitle, action, children, extraClasses = "" }: SectionCardProps) {
  return (
    <View className={`rounded-3xl border border-stone-100 bg-white p-5 ${extraClasses}`}>
      {(title || action) && (
        <View className="mb-3 flex-row items-end justify-between">
          <View className="flex-1">
            {title ? <Text className="text-base font-semibold text-stone-900">{title}</Text> : null}
            {subtitle ? <Text className="mt-0.5 text-xs text-stone-500">{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );
}
