import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarDays, Clock, CheckCircle2, DollarSign } from "lucide-react-native";
import { AppointmentCard, DateStrip, EmptyState, ErrorView, LoadingView, StatCard } from "@/components";
import { api } from "@/lib/api";
import { addDays, dateKey, endOfDay, moneyExact, startOfDay } from "@/lib/format";
import { NEXT_ACTIONS } from "@/lib/constants";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { useStaffSession as useSession } from "@/store/session";

type Scope = "mine" | "branch";

/** "My Day" — date strip, live stats and the day's appointment flow. */
export default function Today() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, branchId } = useSession();

  // Fixed 7-day window starting today; one fetch serves strip counts + lists.
  const [days] = useState<Date[]>(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)));
  const [selectedKey, setSelectedKey] = useState<string>(() => dateKey(new Date()));
  const [scope, setScope] = useState<Scope>(user?.role === "PROVIDER" ? "mine" : "branch");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const loadedOnce = useRef(false);

  const load = useCallback(
    async (soft = false) => {
      if (!user) return;
      if (soft) setRefreshing(true);
      setError(null);
      try {
        const { appointments: list } = await api.appointments({
          branchId: branchId ?? undefined,
          providerId: scope === "mine" ? user.id : undefined,
          from: startOfDay(days[0]).toISOString(),
          to: endOfDay(days[days.length - 1]).toISOString(),
        });
        setAppointments(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load the schedule");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, branchId, scope, days]
  );

  // Load on mount and soft-refresh whenever the tab regains focus or the
  // scope / day selection changes (the callback identity tracks `load`).
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void load(loadedOnce.current);
      loadedOnce.current = true;
    }, [load, user])
  );

  const { byKey, counts } = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const appt of appointments) {
      const key = dateKey(new Date(appt.startsAt));
      (map[key] ??= []).push(appt);
    }
    const tally: Record<string, number> = {};
    for (const [key, list] of Object.entries(map)) {
      tally[key] = list.filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW").length;
    }
    return { byKey: map, counts: tally };
  }, [appointments]);

  const day = useMemo(() => {
    const list = byKey[selectedKey] ?? [];
    const activeList = list.filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW");
    const completed = list.filter((a) => a.status === "COMPLETED");
    return {
      list,
      activeCount: activeList.length,
      completedCount: completed.length,
      revenue: completed.reduce((sum, a) => sum + a.price, 0),
      currency: list[0]?.branch.currency ?? "USD",
    };
  }, [byKey, selectedKey]);

  /** Optimistic status flip — revert to the snapshot if the PATCH fails. */
  const applyStatus = (appt: Appointment, status: AppointmentStatus, extra?: { cancellationReason?: string }) => {
    const snapshot = appointments;
    setBusyId(appt.id);
    setExpandedId(null);
    setAppointments((prev) =>
      prev.map((a) => (a.id === appt.id ? { ...a, status, ...extra } : a))
    );
    api
      .updateAppointment(appt.id, { status, ...extra })
      .then(() => void load(true))
      .catch((err: unknown) => {
        setAppointments(snapshot); // revert optimistic flip
        Alert.alert(
          "Update failed",
          err instanceof Error ? err.message : "Please try again in a moment."
        );
      })
      .finally(() => setBusyId(null));
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    const reason = cancelReason.trim() || "Cancelled by staff";
    setCancelTarget(null);
    setCancelReason("");
    applyStatus(target, "CANCELLED", { cancellationReason: reason });
  };

  const renderActions = (appt: Appointment) => {
    const actions = NEXT_ACTIONS[appt.status] ?? [];
    const busy = busyId === appt.id;
    if (actions.length === 0) {
      return (
        <Text className="text-xs text-stone-400">
          {appt.status === "COMPLETED" ? "Visit complete ✦" : "No actions available"}
        </Text>
      );
    }
    return (
      <View className="flex-row flex-wrap gap-2">
        {actions.map((action) =>
          action.destructive ? (
            <Pressable
              key={action.target}
              onPress={() => {
                setCancelReason("");
                setCancelTarget(appt);
              }}
              disabled={busy}
              className={`rounded-full border border-rose-200 px-4 py-2 ${
                busy ? "opacity-50" : "active:opacity-75"
              }`}
            >
              <Text className="text-[12px] font-semibold text-rose-600">{action.label}</Text>
            </Pressable>
          ) : (
            <Pressable
              key={action.target}
              onPress={() => applyStatus(appt, action.target)}
              disabled={busy}
              className={`rounded-full bg-emerald-700 px-4 py-2 ${
                busy ? "opacity-50" : "active:opacity-85"
              }`}
            >
              <Text className="text-[12px] font-semibold text-white">
                {busy ? "Saving…" : action.label}
              </Text>
            </Pressable>
          )
        )}
      </View>
    );
  };

  if (!user || (loading && appointments.length === 0)) return <LoadingView full />;
  if (error && appointments.length === 0)
    return <ErrorView message={error} onRetry={() => void load()} full />;

  const selectedLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(days.find((d) => dateKey(d) === selectedKey) ?? new Date());

  return (
    <View className="flex-1 bg-stone-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#047857" />
        }
      >
        {/* Header */}
        <View className="px-5 pb-1" style={{ paddingTop: insets.top + 10 }}>
          <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            ✦ Auralis Staff
          </Text>
          <View className="mt-1 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-stone-900">My day</Text>
              <Text className="mt-0.5 text-[13px] text-stone-500">{selectedLabel}</Text>
            </View>
            <Pressable
              onPress={() => router.push("/staff/schedule")}
              className="flex-row items-center rounded-full border border-stone-200 bg-white px-3.5 py-2 active:opacity-80"
            >
              <CalendarDays size={14} color="#047857" />
              <Text className="ml-1.5 text-xs font-semibold text-emerald-700">Week</Text>
            </Pressable>
          </View>
        </View>

        {/* Date strip */}
        <View className="mt-4">
          <DateStrip days={days} selected={selectedKey} counts={counts} onSelect={(d) => setSelectedKey(dateKey(d))} />
        </View>

        {/* Scope toggle: my book vs the whole branch */}
        <View className="mt-4 px-5">
          <View className="flex-row rounded-2xl bg-stone-200/70 p-1">
            {(["mine", "branch"] as const).map((seg) => (
              <Pressable
                key={seg}
                onPress={() => setScope(seg)}
                className={`flex-1 items-center rounded-xl py-2.5 ${scope === seg ? "bg-white" : "active:opacity-80"}`}
              >
                <Text
                  className={`text-[13px] font-semibold ${scope === seg ? "text-emerald-700" : "text-stone-500"}`}
                >
                  {seg === "mine" ? "Mine" : "All branch"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Stats row */}
        <View className="mt-4 flex-row gap-3 px-5">
          <StatCard
            label="Booked"
            value={String(day.activeCount)}
            sub="on this day"
            icon={<Clock size={15} color="#047857" />}
          />
          <StatCard
            label="Completed"
            value={String(day.completedCount)}
            sub="visits done"
            icon={<CheckCircle2 size={15} color="#047857" />}
          />
          <StatCard
            label="Revenue"
            value={moneyExact(day.revenue, day.currency)}
            sub="completed only"
            icon={<DollarSign size={15} color="#047857" />}
          />
        </View>

        {/* Appointment list */}
        <View className="mt-5 gap-3 px-5">
          {day.list.length === 0 ? (
            <EmptyState
              emoji="🌿"
              title="Clear schedule"
              message={
                scope === "mine"
                  ? "No appointments for you on this day — enjoy the calm."
                  : "No appointments at this branch on this day."
              }
            />
          ) : (
            day.list.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                showProvider={scope === "branch"}
                expanded={expandedId === appt.id}
                onPress={() => setExpandedId((prev) => (prev === appt.id ? null : appt.id))}
                actions={renderActions(appt)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Cancel reason sheet */}
      <Modal
        visible={cancelTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelTarget(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-end bg-stone-900/40"
        >
          <Pressable className="flex-1" onPress={() => setCancelTarget(null)} />
          <View className="rounded-t-3xl bg-white p-5" style={{ paddingBottom: insets.bottom + 20 }}>
            <Text className="text-lg font-bold text-stone-900">Cancel appointment</Text>
            <Text className="mt-1 text-sm text-stone-500">
              {cancelTarget
                ? `${cancelTarget.patient.firstName} ${cancelTarget.patient.lastName} · ${cancelTarget.service.name}`
                : ""}
            </Text>
            <TextInput
              multiline
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Reason — e.g. patient requested reschedule"
              placeholderTextColor="#a8a29e"
              textAlignVertical="top"
              className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900"
            />
            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => setCancelTarget(null)}
                className="flex-1 items-center rounded-2xl border border-stone-200 py-3.5 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-stone-600">Keep appointment</Text>
              </Pressable>
              <Pressable
                onPress={confirmCancel}
                className="flex-1 items-center rounded-2xl bg-rose-600 py-3.5 active:opacity-85"
              >
                <Text className="text-sm font-bold text-white">Cancel visit</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
