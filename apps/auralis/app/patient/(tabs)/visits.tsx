import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, EmptyState, ErrorView, LoadingView, StatusPill } from "@/components";
import { ApiError, api } from "@/lib/api";
import { formatDate, formatDateTime, money } from "@/lib/format";
import type { Appointment } from "@/lib/types";
import { usePatientSession as useSession } from "@/store/session";

const DONE_STATUSES: Appointment["status"][] = ["COMPLETED", "CANCELLED", "NO_SHOW"];
type Segment = "upcoming" | "history";

export default function Visits() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patient, isGuest } = useSession();

  const [segment, setSegment] = useState<Segment>("upcoming");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(
    async (soft = false) => {
      if (!patient) return;
      if (soft) setRefreshing(true);
      setError(null);
      try {
        const from = new Date(Date.now() - 180 * 86400000).toISOString();
        const to = new Date(Date.now() + 180 * 86400000).toISOString();
        const { appointments: appts } = await api.appointments(patient.id, from, to);
        setAppointments(
          [...appts].sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load your visits");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [patient]
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Re-sync when returning to the tab (e.g. right after booking).
  useFocusEffect(
    useCallback(() => {
      if (patient && appointments.length === 0) void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patient])
  );

  const { upcoming, history } = useMemo(() => {
    const now = Date.now();
    const up = appointments
      .filter((a) => new Date(a.startsAt).getTime() >= now && !DONE_STATUSES.includes(a.status))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    const past = appointments.filter(
      (a) => new Date(a.startsAt).getTime() < now || DONE_STATUSES.includes(a.status)
    );
    return { upcoming: up, history: past };
  }, [appointments]);

  /** Optimistic cancel: flip the pill instantly, PATCH behind it, revert on failure. */
  const cancelVisit = (appt: Appointment) => {
    Alert.alert(
      "Cancel this visit?",
      `${appt.service.name} on ${formatDateTime(appt.startsAt)}. We'd love 24h notice where possible.`,
      [
        { text: "Keep visit", style: "cancel" },
        {
          text: "Cancel visit",
          style: "destructive",
          onPress: () => {
            const snapshot = appointments;
            setCancellingId(appt.id);
            setAppointments((prev) =>
              prev.map((a) => (a.id === appt.id ? { ...a, status: "CANCELLED" as const } : a))
            );
            api
              .cancelAppointment(appt.id)
              .then(() => void load(true))
              .catch((err: unknown) => {
                setAppointments(snapshot); // revert optimistic flip
                Alert.alert(
                  "Couldn't cancel",
                  err instanceof ApiError ? err.message : "Please try again in a moment."
                );
              })
              .finally(() => setCancellingId(null));
          },
        },
      ]
    );
  };

  if (isGuest || !patient) {
    return (
      <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
        <View className="px-5">
          <EmptyState
            emoji="🗓️"
            title="Your visits live here"
            message="Sign in to see upcoming treatments, history and receipts."
            actionLabel="Sign in"
            onAction={() => router.push("/auth/patient-login")}
          />
        </View>
      </View>
    );
  }
  if (loading) return <LoadingView full />;
  if (error && appointments.length === 0)
    return <ErrorView message={error} onRetry={() => void load()} full />;

  const list = segment === "upcoming" ? upcoming : history;

  return (
    <ScrollView
      className="flex-1 bg-stone-50"
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#047857" />
      }
    >
      <View className="px-5" style={{ paddingTop: insets.top + 14 }}>
        <Text className="text-2xl font-bold text-stone-900">My visits</Text>
        <Text className="mt-1 text-sm text-stone-500">
          {upcoming.length} upcoming · {history.length} in history ✦
        </Text>

        {/* Segment toggle */}
        <View className="mt-4 flex-row rounded-2xl bg-stone-200/70 p-1">
          {(["upcoming", "history"] as const).map((seg) => (
            <Pressable
              key={seg}
              onPress={() => setSegment(seg)}
              className={`flex-1 items-center rounded-xl py-2.5 ${
                segment === seg ? "bg-white" : "active:opacity-80"
              }`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  segment === seg ? "text-emerald-700" : "text-stone-500"
                }`}
              >
                {seg === "upcoming" ? "Upcoming" : "History"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-4 gap-3">
          {list.length === 0 && segment === "upcoming" && (
            <EmptyState
              emoji="🫧"
              title="No upcoming visits"
              message="Treat yourself — the menu is waiting."
              actionLabel="Book a treatment"
              onAction={() => router.push("/patient/(tabs)/book")}
            />
          )}
          {list.length === 0 && segment === "history" && (
            <EmptyState
              emoji="📖"
              title="No history yet"
              message="Past treatments, prices and outcomes will appear here after your first visit."
            />
          )}

          {list.map((appt) => {
            const cancelling = cancellingId === appt.id;
            return (
              <View key={appt.id} className="rounded-3xl border border-stone-100 bg-white p-5">
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center">
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                      <Text className="text-2xl">{appt.service.emoji}</Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-[15px] font-semibold text-stone-900">
                        {appt.service.name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-stone-500" numberOfLines={1}>
                        {appt.branch.name} · {appt.service.category}
                      </Text>
                    </View>
                  </View>
                  <StatusPill status={appt.status} />
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Avatar name={appt.provider.name} color={appt.provider.avatarColor} size={28} />
                    <Text className="ml-2 text-[13px] text-stone-600">{appt.provider.name}</Text>
                  </View>
                  <Text className="text-[13px] font-semibold text-stone-700">
                    {formatDate(appt.startsAt)}
                  </Text>
                </View>

                {segment === "upcoming" ? (
                  <View className="mt-4 flex-row items-center justify-between border-t border-stone-100 pt-3.5">
                    <Text className="text-[13px] text-stone-500">
                      {formatDateTime(appt.startsAt)}
                    </Text>
                    <Pressable
                      onPress={() => cancelVisit(appt)}
                      disabled={cancelling}
                      className={`rounded-full border border-rose-200 px-4 py-2 ${
                        cancelling ? "opacity-50" : "active:opacity-75"
                      }`}
                    >
                      <Text className="text-[12px] font-semibold text-rose-600">
                        {cancelling ? "Cancelling…" : "Cancel"}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="mt-3.5 flex-row items-center justify-between border-t border-stone-100 pt-3.5">
                    <Text className="text-[13px] text-stone-500">{formatDate(appt.startsAt)}</Text>
                    <Text className="text-[13px] font-bold text-emerald-700">
                      {money(appt.price, appt.branch.currency)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
