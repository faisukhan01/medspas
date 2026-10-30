import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Building2, CheckCircle2, LogOut, Star } from "lucide-react-native";
import { Avatar, ErrorView, LoadingView, SectionCard, StatCard } from "@/components";
import { api } from "@/lib/api";
import { csvList, endOfDay, flagFor, startOfDay } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import type { Appointment, BranchDetail } from "@/lib/types";
import { useSession } from "@/store/session";

/** Signed-in staff profile: identity, branch switcher, today's stats, logout. */
export default function Profile() {
  const insets = useSafeAreaInsets();
  const { user, branchId, setBranchId, logout } = useSession();

  const [branches, setBranches] = useState<BranchDetail[] | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState<{ total: number; completed: number } | null>(null);

  const loadBranches = useCallback(async () => {
    setBranchesError(null);
    try {
      const { branches: list } = await api.branches();
      setBranches(list.filter((b) => b.isActive !== false));
    } catch (err) {
      setBranchesError(err instanceof Error ? err.message : "Couldn't load branches");
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (!branchId) {
      setTodayStats(null);
      return;
    }
    try {
      const { appointments } = await api.appointments({
        branchId,
        from: startOfDay(new Date()).toISOString(),
        to: endOfDay(new Date()).toISOString(),
      });
      setTodayStats({
        total: appointments.filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW").length,
        completed: appointments.filter((a: Appointment) => a.status === "COMPLETED").length,
      });
    } catch {
      setTodayStats(null);
    }
  }, [branchId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadBranches(), loadStats()]);
    setRefreshing(false);
  }, [loadBranches, loadStats]);

  useFocusEffect(
    useCallback(() => {
      void loadBranches();
      void loadStats();
    }, [loadBranches, loadStats])
  );

  if (!user) return <LoadingView full />;

  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const specialties = csvList(user.specialties);

  const confirmLogout = () =>
    Alert.alert("Sign out", "End your Auralis Staff session on this device?", [
      { text: "Stay", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ]);

  return (
    <ScrollView
      className="flex-1 bg-stone-50"
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor="#047857" />
      }
    >
      <View className="px-5" style={{ paddingTop: insets.top + 14 }}>
        <Text className="text-2xl font-bold text-stone-900">Profile</Text>
        <Text className="mt-1 text-sm text-stone-500">Your account, branch and day at a glance ✦</Text>

        {/* Identity hero */}
        <LinearGradient colors={["#065f46", "#047857"]} className="mt-5 rounded-3xl p-5">
          <View className="flex-row items-center">
            <Avatar name={user.name} color={user.avatarColor} size={56} />
            <View className="ml-4 flex-1">
              <Text className="text-xl font-bold text-white">{user.name}</Text>
              <Text className="mt-0.5 text-[13px] text-emerald-100/90">
                {roleLabel}
                {user.title ? ` · ${user.title}` : ""}
              </Text>
            </View>
          </View>
          <View className="mt-4 flex-row items-center gap-2">
            <View className="flex-row items-center rounded-full bg-white/10 px-3 py-1.5">
              <Star size={13} color="#fbbf24" fill="#fbbf24" />
              <Text className="ml-1.5 text-xs font-semibold text-white">
                {typeof user.rating === "number" ? user.rating.toFixed(1) : "—"}
              </Text>
            </View>
            {specialties.slice(0, 2).map((spec) => (
              <View key={spec} className="rounded-full bg-white/10 px-3 py-1.5">
                <Text className="text-xs font-semibold text-white">{spec}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Today at this branch */}
        <View className="mt-5 flex-row gap-3">
          <StatCard
            label="Today"
            value={todayStats ? String(todayStats.total) : "—"}
            sub="appointments"
          />
          <StatCard
            label="Completed"
            value={todayStats ? String(todayStats.completed) : "—"}
            sub="today"
          />
        </View>

        {/* Branch switcher */}
        <SectionCard
          title="Branch"
          subtitle="Switch the clinic this app queries"
          extraClasses="mt-5"
          action={<Building2 size={16} color="#a8a29e" />}
        >
          {branchesLoading ? (
            <LoadingView label="Loading branches…" />
          ) : branchesError ? (
            <ErrorView message={branchesError} onRetry={() => void loadBranches()} />
          ) : (
            <View className="gap-2">
              {(branches ?? []).map((branch) => {
                const active = branchId === branch.id;
                return (
                  <Pressable
                    key={branch.id}
                    onPress={() => setBranchId(branch.id)}
                    className={`flex-row items-center rounded-2xl border px-4 py-3.5 active:opacity-80 ${
                      active ? "border-emerald-700 bg-emerald-50" : "border-stone-200 bg-white"
                    }`}
                  >
                    <Text className="text-lg">{flagFor(branch.country)}</Text>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-stone-900">{branch.name}</Text>
                      <Text className="mt-0.5 text-xs text-stone-500">
                        {branch.city ?? branch.code} · {branch.openTime}–{branch.closeTime}
                      </Text>
                    </View>
                    {active ? <CheckCircle2 size={18} color="#047857" /> : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </SectionCard>

        {/* Account */}
        <SectionCard title="Account" subtitle={user.email} extraClasses="mt-5">
          <Pressable
            onPress={confirmLogout}
            className="flex-row items-center justify-center rounded-2xl border border-rose-200 py-3.5 active:opacity-80"
          >
            <LogOut size={16} color="#e11d48" />
            <Text className="ml-2 text-sm font-semibold text-rose-600">Sign out</Text>
          </Pressable>
        </SectionCard>

        {/* Footer */}
        <View className="mt-8 items-center">
          <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
            ✦ Auralis OS v1.0
          </Text>
          <Text className="mt-1 text-[11px] text-stone-400">Staff companion · build 1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}
