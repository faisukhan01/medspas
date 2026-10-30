import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { EmptyState, ErrorView, LoadingView } from "@/components";
import { api } from "@/lib/api";
import { addDays, dateKey, endOfDay, formatDate, isToday, moneyExact, startOfDay } from "@/lib/format";
import type { Appointment } from "@/lib/types";
import { useSession } from "@/store/session";

/** Week overview — appointment volume, completions and revenue per day. */
export default function Schedule() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, branchId } = useSession();

  const [days] = useState<Date[]>(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedOnce = useRef(false);

  const load = useCallback(
    async (soft = false) => {
      if (!user) return;
      if (soft) setRefreshing(true);
      setError(null);
      try {
        const { appointments: list } = await api.appointments({
          branchId: branchId ?? undefined,
          from: startOfDay(days[0]).toISOString(),
          to: endOfDay(days[days.length - 1]).toISOString(),
        });
        setAppointments(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load the week");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, branchId, days]
  );

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void load(loadedOnce.current);
      loadedOnce.current = true;
    }, [load, user])
  );

  const summary = useMemo(() => {
    const byKey: Record<string, Appointment[]> = {};
    for (const appt of appointments) {
      const key = dateKey(new Date(appt.startsAt));
      (byKey[key] ??= []).push(appt);
    }
    const rows = days.map((day) => {
      const list = byKey[dateKey(day)] ?? [];
      const activeList = list.filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW");
      const completed = list.filter((a) => a.status === "COMPLETED");
      return {
        day,
        count: activeList.length,
        completedCount: completed.length,
        revenue: completed.reduce((sum, a) => sum + a.price, 0),
      };
    });
    const max = rows.reduce((m, row) => Math.max(m, row.count), 0);
    const currency = appointments[0]?.branch.currency ?? "USD";
    return { rows, max, currency };
  }, [appointments, days]);

  if (!user || (loading && appointments.length === 0)) return <LoadingView full />;
  if (error && appointments.length === 0)
    return <ErrorView message={error} onRetry={() => void load()} full />;

  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" });

  return (
    <ScrollView
      className="flex-1 bg-stone-50"
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#047857" />
      }
    >
      {/* Header */}
      <View className="flex-row items-center px-5" style={{ paddingTop: insets.top + 10 }}>
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white active:opacity-70"
        >
          <ArrowLeft size={18} color="#57534e" />
        </Pressable>
        <View className="ml-3 flex-1">
          <Text className="text-lg font-bold text-stone-900">Week overview</Text>
          <Text className="text-xs text-stone-500">Next 7 days · appointment volume</Text>
        </View>
      </View>

      <View className="mt-5 gap-3 px-5">
        {summary.rows.every((row) => row.count === 0) ? (
          <EmptyState
            emoji="🗓️"
            title="A quiet week"
            message="No appointments on the books for the next 7 days."
          />
        ) : (
          summary.rows.map(({ day, count, completedCount, revenue }) => {
            const pct = summary.max > 0 ? Math.max((count / summary.max) * 100, count > 0 ? 6 : 0) : 0;
            return (
              <View
                key={dateKey(day)}
                className={`rounded-3xl border p-4 ${
                  isToday(day) ? "border-emerald-200 bg-emerald-50/70" : "border-stone-100 bg-white"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-[15px] font-semibold text-stone-900">
                      {weekday.format(day)}
                      {isToday(day) ? " · Today" : ""}
                    </Text>
                    <Text className="mt-0.5 text-xs text-stone-500">{formatDate(day)}</Text>
                  </View>
                  <Text className="text-sm font-bold text-stone-900">
                    {count} appt{count === 1 ? "" : "s"}
                  </Text>
                </View>
                <View className="mt-3 h-2 rounded-full bg-stone-100">
                  <View
                    className="h-2 rounded-full bg-emerald-600"
                    style={{ width: `${pct}%` }}
                  />
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-[11px] text-stone-400">{completedCount} completed</Text>
                  <Text className="text-[11px] font-semibold text-stone-600">
                    {moneyExact(revenue, summary.currency)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
