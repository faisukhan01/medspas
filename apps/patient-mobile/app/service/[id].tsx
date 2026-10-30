import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Clock, Sparkles, Star } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, ErrorView, LoadingView, PriceTag } from "@/components";
import { loadBootstrap, loadStaff } from "@/lib/api";
import { csvList, money } from "@/lib/format";
import type { Branch, Service, StaffMember } from "@/lib/types";
import { useSession } from "@/store/session";

export default function ServiceDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const { patient } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [providers, setProviders] = useState<StaffMember[]>([]);
  const [providerId, setProviderId] = useState<string>("any");

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [bootstrap, staff] = await Promise.all([loadBootstrap(), loadStaff()]);
      const found = bootstrap.services.find((s) => s.id === params.id) ?? null;
      if (!found) {
        setError("We couldn't find that treatment — it may have moved.");
        setService(null);
      } else {
        setService(found);
        const relevant = bootstrap.branches.find((b) => b.id === patient?.branchId) ?? bootstrap.branches[0];
        setBranch(relevant ?? null);
        const inBranch = staff.staff.filter(
          (s) => s.role === "PROVIDER" && s.isActive && s.branchId === relevant?.id
        );
        setProviders(inBranch.length > 0 ? inBranch : staff.staff.filter((s) => s.role === "PROVIDER" && s.isActive));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this treatment");
    } finally {
      setLoading(false);
    }
  }, [params.id, patient]);

  useEffect(() => {
    void load();
  }, [load]);

  const currency = branch?.currency ?? service?.currency ?? "USD";

  const depositNote = useMemo(() => {
    if (!service) return "";
    return `${money(service.depositAmount, currency)} deposit secures your slot — the balance is settled in clinic.`;
  }, [service, currency]);

  if (loading && !service) return <LoadingView full />;
  if (error || !service) return <ErrorView message={error ?? "Treatment unavailable"} onRetry={() => void load()} full />;

  const book = () => {
    if (!patient) {
      router.push("/login");
      return;
    }
    router.push({
      pathname: "/(tabs)/book",
      params: { serviceId: service.id, branchId: branch?.id ?? "", providerId },
    });
  };

  return (
    <View className="flex-1 bg-stone-50">
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Emoji header */}
        <LinearGradient colors={["#065f46", "#047857"]} style={{ paddingTop: insets.top + 10, paddingBottom: 28 }}>
          <Pressable
            onPress={() => router.back()}
            className="ml-5 h-10 w-10 items-center justify-center rounded-full bg-white/15 active:opacity-80"
          >
            <ArrowLeft size={18} color="#ffffff" />
          </Pressable>
          <View className="mt-5 items-center px-6">
            <View className="h-24 w-24 items-center justify-center rounded-3xl bg-white/15">
              <Text className="text-5xl">{service.emoji}</Text>
            </View>
            <Text className="mt-4 text-center text-2xl font-bold text-white">{service.name}</Text>
            <View className="mt-2 flex-row items-center gap-2">
              <View className="rounded-full bg-white/15 px-3 py-1">
                <Text className="text-[11px] font-semibold text-emerald-100">{service.category}</Text>
              </View>
              <View className="flex-row items-center rounded-full bg-white/15 px-3 py-1">
                <Clock size={11} color="#a7f3d0" />
                <Text className="ml-1 text-[11px] font-semibold text-emerald-100">
                  {service.durationMin} min
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View className="gap-4 px-5 pt-5">
          {/* Price + deposit */}
          <View className="rounded-3xl border border-stone-100 bg-white p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-stone-500">Treatment price</Text>
              <PriceTag amountUsd={service.price} currency={currency} size="lg" />
            </View>
            <View className="mt-3 rounded-2xl bg-amber-50 px-4 py-3">
              <Text className="text-[13px] leading-5 text-amber-800">✦ {depositNote}</Text>
            </View>
            {service.requiresConsultation && (
              <View className="mt-3 flex-row items-center rounded-2xl bg-emerald-50 px-4 py-3">
                <Sparkles size={14} color="#047857" />
                <Text className="ml-2 text-[13px] font-semibold text-emerald-700">
                  Free consult included — your expert plans the treatment with you first
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {service.description ? (
            <View className="rounded-3xl border border-stone-100 bg-white p-5">
              <Text className="text-base font-semibold text-stone-900">About this treatment</Text>
              <Text className="mt-2 text-[14px] leading-6 text-stone-600">{service.description}</Text>
            </View>
          ) : null}

          {/* Provider selection */}
          <View className="rounded-3xl border border-stone-100 bg-white p-5">
            <Text className="text-base font-semibold text-stone-900">Choose your expert</Text>
            <Text className="mt-0.5 text-xs text-stone-500">
              At {branch?.name ?? "your clinic"} · you can change this later
            </Text>
            <View className="mt-3 gap-2.5">
              <Pressable
                onPress={() => setProviderId("any")}
                className={`flex-row items-center justify-between rounded-2xl border px-4 py-3.5 active:opacity-80 ${
                  providerId === "any" ? "border-emerald-600 bg-emerald-50" : "border-stone-200 bg-white"
                }`}
              >
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-700">
                    <Text className="text-base text-white">✦</Text>
                  </View>
                  <View className="ml-3">
                    <Text className="text-[15px] font-semibold text-stone-900">Any available expert</Text>
                    <Text className="text-xs text-stone-500">We&apos;ll match the first free specialist</Text>
                  </View>
                </View>
                {providerId === "any" && <Text className="text-emerald-700">●</Text>}
              </Pressable>

              {providers.map((p) => {
                const selected = providerId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setProviderId(p.id)}
                    className={`flex-row items-center justify-between rounded-2xl border px-4 py-3.5 active:opacity-80 ${
                      selected ? "border-emerald-600 bg-emerald-50" : "border-stone-200 bg-white"
                    }`}
                  >
                    <View className="flex-row items-center">
                      <Avatar name={p.name} color={p.avatarColor} size={40} />
                      <View className="ml-3 flex-1">
                        <Text className="text-[15px] font-semibold text-stone-900">{p.name}</Text>
                        <Text className="text-xs text-stone-500" numberOfLines={1}>
                          {p.title ?? "Aesthetic specialist"}
                          {p.specialties ? ` · ${csvList(p.specialties)[0] ?? ""}` : ""}
                        </Text>
                      </View>
                    </View>
                    {p.rating ? (
                      <View className="flex-row items-center rounded-full bg-amber-50 px-2 py-1">
                        <Star size={11} color="#d97706" fill="#d97706" />
                        <Text className="ml-1 text-[11px] font-bold text-amber-700">{p.rating.toFixed(1)}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View
        className="absolute inset-x-0 bottom-0 border-t border-stone-100 bg-white px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          onPress={book}
          className="items-center rounded-2xl bg-emerald-700 py-4 active:opacity-85"
        >
          <Text className="text-[15px] font-bold text-white">
            {patient ? "Book now" : "Sign in to book"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
