import { Pressable, ScrollView, Text, View } from "react-native";
import { dateKey } from "@/lib/format";

interface DateStripProps {
  days: Date[];
  /** dateKey of the highlighted day. */
  selected: string;
  /** Optional per-day counts (keyed by dateKey) shown as a small dot. */
  counts?: Record<string, number>;
  onSelect: (day: Date) => void;
  /** true removes the built-in horizontal padding (for use inside padded modals). */
  flush?: boolean;
}

/** Horizontally scrollable day picker — selected day filled in brand emerald. */
export function DateStrip({ days, selected, counts, onSelect, flush = false }: DateStripProps) {
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: flush ? 0 : 20 }}
    >
      {days.map((day) => {
        const key = dateKey(day);
        const active = key === selected;
        const count = counts?.[key] ?? 0;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(day)}
            className={`w-16 items-center rounded-2xl border py-3 active:opacity-80 ${
              active ? "border-emerald-700 bg-emerald-700" : "border-stone-200 bg-white"
            }`}
          >
            <Text
              className={`text-[11px] font-semibold uppercase ${active ? "text-emerald-100" : "text-stone-400"}`}
            >
              {weekday.format(day)}
            </Text>
            <Text className={`mt-1 text-lg font-bold ${active ? "text-white" : "text-stone-900"}`}>
              {day.getDate()}
            </Text>
            <View
              className="mt-1.5 h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: active ? "#fcd34d" : count > 0 ? "#047857" : "#e7e5e4",
              }}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
