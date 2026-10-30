import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Friendly zero-state with an optional single CTA. */
export function EmptyState({ emoji = "✦", title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center rounded-3xl border border-dashed border-stone-200 bg-white px-6 py-10">
      <Text className="mb-3 text-4xl">{emoji}</Text>
      <Text className="text-center text-base font-semibold text-stone-900">{title}</Text>
      {message ? (
        <Text className="mt-1.5 text-center text-sm leading-5 text-stone-500">{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="mt-5 rounded-full bg-emerald-700 px-6 py-3 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-white">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Generic container so callers can keep a consistent layout. */
export function EmptySlot({ children }: { children: ReactNode }) {
  return <View className="px-5 pt-6">{children}</View>;
}
