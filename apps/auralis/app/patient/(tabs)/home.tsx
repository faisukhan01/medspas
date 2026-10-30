import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  CalendarPlus,
  ChevronRight,
  Clock,
  Phone,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, BranchChip, ErrorView, LoadingView, ServiceCard } from "@/components";
import { api, loadBootstrap } from "@/lib/api";
import { flagFor, formatDateTime } from "@/lib/format";
import type { Appointment, BootstrapPayload, Service } from "@/lib/types";
import { usePatientSession as useSession } from "@/store/session";

const UPCOMING_BLOCKED: Appointment["status"][] = ["CANCELLED", "NO_SHOW", "COMPLETED"];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patient, isGuest } = useSession();

  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [nextAppt, setNextAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const load = useCallback(
    async (soft = false) => {
      if (soft) setRefreshing(true);
      setError(null);
      try {
        const data = await loadBootstrap();
        setBootstrap(data);
        if (patient) {
          const from = new Date(Date.now() - 86400000).toISOString();
          const to = new Date(Date.now() + 60 * 86400000).toISOString();
          const { appointments } = await api.appointments(patient.id, from, to);
          const upcoming = appointments
            .filter(
              (a) =>
                new Date(a.startsAt).getTime() >= Date.now() &&
                !UPCOMING_BLOCKED.includes(a.status)
            )
            .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
          setNextAppt(upcoming[0] ?? null);
        } else {
          setNextAppt(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load the clinic menu");
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

  const homeBranch = useMemo(
    () => bootstrap?.branches.find((b) => b.id === patient?.branchId) ?? null,
    [bootstrap, patient]
  );
  const displayCurrency = homeBranch?.currency ?? "USD";

  const categories = useMemo(
    () => [{ id: "all", name: "All" }, ...(bootstrap?.categories ?? []).map((c) => ({ id: c.name, name: c.name }))],
    [bootstrap]
  );

  const popularServices = useMemo(() => {
    const all = bootstrap?.services ?? [];
    const filtered = selectedCategory && selectedCategory !== "All"
      ? all.filter((s) => s.category === selectedCategory)
      : all;
    return filtered.slice(0, 6);
  }, [bootstrap, selectedCategory]);

  const onServicePress = (service: Service) =>
    router.push({ pathname: "/patient/service/[id]", params: { id: service.id } });

  if (loading && !bootstrap) return <LoadingView full />;
  if (error && !bootstrap) return <ErrorView message={error} onRetry={() => void load()} full />;

  return (
    <ScrollView
      className="flex-1 bg-stone-50"
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#047857" />
      }
    >
      {/* Header */}
      <View className="px-5 pb-1" style={{ paddingTop: insets.top + 10 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
              ✦ Auralis
            </Text>
            <Text className="mt-1 text-2xl font-bold text-stone-900">
              {patient ? `${greeting()}, ${patient.firstName}` : "Welcome to Auralis"}
            </Text>
          </View>
          {patient ? (
            <Pressable onPress={() => router.push("/patient/profile")} className="active:opacity-80">
              <Avatar
                name={`${patient.firstName} ${patient.lastName}`}
                color={patient.avatarColor}
                size={44}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/auth/patient-login")}
              className="rounded-full bg-emerald-700 px-4 py-2.5 active:opacity-85"
            >
              <Text className="text-xs font-bold text-white">Sign in</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View className="gap-5 px-5 pt-4">
        {/* Next appointment hero / guest prompt */}
        {patient && nextAppt ? (
          <LinearGradient colors={["#065f46", "#047857"]} className="rounded-3xl p-5">
            <Text className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200">
              Your next visit
            </Text>
            <View className="mt-3 flex-row items-center">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Text className="text-3xl">{nextAppt.service.emoji}</Text>
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold leading-6 text-white">{nextAppt.service.name}</Text>
                <Text className="mt-0.5 text-[13px] text-emerald-100/90">
                  {nextAppt.provider.name}
                  {nextAppt.provider.title ? ` · ${nextAppt.provider.title}` : ""}
                </Text>
              </View>
            </View>
            <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
              <Text className="text-sm font-semibold text-white">
                {formatDateTime(nextAppt.startsAt)}
              </Text>
              <Text className="text-xs text-emerald-100/80">{nextAppt.branch.name}</Text>
            </View>
            <View className="mt-3 flex-row items-center">
              <CalendarPlus size={14} color="#fcd34d" />
              <Text className="ml-2 flex-1 text-[12px] text-emerald-100/75">
                Add to calendar — we&apos;ll also remind you 24h before ✦
              </Text>
            </View>
          </LinearGradient>
        ) : patient ? (
          <LinearGradient colors={["#065f46", "#047857"]} className="rounded-3xl p-5">
            <Text className="text-lg font-bold text-white">Nothing booked yet ✦</Text>
            <Text className="mt-1 text-[13px] text-emerald-100/85">
              Your calendar is beautifully empty — let&apos;s fix that.
            </Text>
            <Pressable
              onPress={() => router.push("/patient/(tabs)/book")}
              className="mt-4 self-start rounded-full bg-amber-400 px-5 py-2.5 active:opacity-85"
            >
              <Text className="text-[13px] font-bold text-stone-900">Book a treatment</Text>
            </Pressable>
          </LinearGradient>
        ) : (
          <LinearGradient colors={["#065f46", "#047857"]} className="rounded-3xl p-5">
            <Text className="text-lg font-bold text-white">Browsing as guest ✦</Text>
            <Text className="mt-1 text-[13px] text-emerald-100/85">
              Sign in to see your visits, perks and bookings.
            </Text>
            <Pressable
              onPress={() => router.push("/auth/patient-login")}
              className="mt-4 self-start rounded-full bg-amber-400 px-5 py-2.5 active:opacity-85"
            >
              <Text className="text-[13px] font-bold text-stone-900">Sign in</Text>
            </Pressable>
          </LinearGradient>
        )}

        {/* Category chips */}
        <View>
          <Text className="text-base font-semibold text-stone-900">Explore the menu</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            contentContainerStyle={{ gap: 8, paddingRight: 20 }}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat.id || (!selectedCategory && cat.id === "all");
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id === "all" ? null : cat.name)}
                  className={`rounded-full border px-4 py-2 active:opacity-80 ${
                    active
                      ? "border-emerald-700 bg-emerald-700"
                      : "border-stone-200 bg-white"
                  }`}
                >
                  <Text className={`text-[13px] font-semibold ${active ? "text-white" : "text-stone-600"}`}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Popular services grid */}
        <View>
          <Text className="text-base font-semibold text-stone-900">Popular treatments</Text>
          <View className="mt-3 flex-row flex-wrap justify-between">
            {popularServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                currency={displayCurrency}
                width="48%"
                onPress={onServicePress}
              />
            ))}
            {popularServices.length === 0 && (
              <Text className="py-4 text-sm text-stone-500">Nothing in this category yet ✦</Text>
            )}
          </View>
        </View>

        {/* Branches */}
        <View>
          <Text className="text-base font-semibold text-stone-900">Our clinics</Text>
          <View className="mt-3 gap-3">
            {(bootstrap?.branches ?? []).map((branch) => (
              <View key={branch.id} className="rounded-3xl border border-stone-100 bg-white p-5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Text className="text-xl">{flagFor(branch.country)}</Text>
                    <Text className="ml-2 text-[15px] font-semibold text-stone-900">{branch.name}</Text>
                  </View>
                  <BranchChip branch={branch} showFlag={false} />
                </View>
                <Text className="mt-2 text-[13px] text-stone-500">
                  {branch.city ?? branch.code} · Prices in {branch.currency === "GBP" ? "£ GBP" : "$ USD"}
                </Text>
                <View className="mt-3 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Clock size={13} color="#a8a29e" />
                    <Text className="ml-1.5 text-[12px] text-stone-500">
                      Open {branch.openTime}–{branch.closeTime}
                    </Text>
                  </View>
                  {branch.phone ? (
                    <Pressable
                      onPress={() => void Linking.openURL(`tel:${branch.phone}`)}
                      className="flex-row items-center rounded-full bg-stone-100 px-3 py-1.5 active:opacity-80"
                    >
                      <Phone size={12} color="#047857" />
                      <Text className="ml-1.5 text-[12px] font-semibold text-emerald-700">Call</Text>
                    </Pressable>
                  ) : (
                    <ChevronRight size={16} color="#d6d3d1" />
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
