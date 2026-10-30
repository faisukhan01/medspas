import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  ChevronRight,
  Clock,
  Star,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, EmptyState, ErrorView, LoadingView, PriceTag } from "@/components";
import { ApiError, api, loadBootstrap, loadStaff } from "@/lib/api";
import { flagFor, formatDateTime, money } from "@/lib/format";
import type { Appointment, BootstrapPayload, Service, StaffMember } from "@/lib/types";
import { useSession } from "@/store/session";

const STEP_TITLES = ["Choose clinic", "Choose treatment", "Choose expert", "Date & time", "Review & confirm"] as const;
const SOURCE = "ONLINE" as const;
const HOUR_SLOTS = Array.from({ length: 9 }, (_, i) => `${9 + i}:00`); // 09:00 → 17:00

function toIsoDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Next 14 days, Sundays closed. */
function buildDays(): { iso: string; weekday: string; dayNum: number; month: string }[] {
  const out: { iso: string; weekday: string; dayNum: number; month: string }[] = [];
  const cursor = new Date();
  while (out.length < 14) {
    if (cursor.getDay() !== 0) {
      out.push({
        iso: toIsoDate(cursor),
        weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(cursor),
        dayNum: cursor.getDate(),
        month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(cursor),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export default function Book() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ serviceId?: string; branchId?: string; providerId?: string }>();
  const { patient, isGuest } = useSession();

  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState(() => (params.serviceId && params.branchId ? 3 : 1));
  const [branchId, setBranchId] = useState<string | null>(params.branchId || null);
  const [serviceId, setServiceId] = useState<string | null>(params.serviceId || null);
  const [providerId, setProviderId] = useState<string>(params.providerId || "any");
  const [dateIso, setDateIso] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);

  const days = useMemo(buildDays, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [data, staff] = await Promise.all([loadBootstrap(), loadStaff()]);
      setBootstrap(data);
      setAllStaff(staff.staff.filter((s) => s.role === "PROVIDER" && s.isActive));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load booking options");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const branch = useMemo(() => bootstrap?.branches.find((b) => b.id === branchId) ?? null, [bootstrap, branchId]);
  const service = useMemo(() => bootstrap?.services.find((s) => s.id === serviceId) ?? null, [bootstrap, serviceId]);
  const currency = branch?.currency ?? "USD";

  const providers = useMemo(
    () => allStaff.filter((s) => s.branchId === branchId),
    [allStaff, branchId]
  );

  // If the branch changed and the picked expert isn't there, fall back to "any".
  useEffect(() => {
    if (providerId !== "any" && !providers.some((p) => p.id === providerId)) {
      setProviderId("any");
    }
  }, [providers, providerId]);

  const groupedServices = useMemo(() => {
    if (!bootstrap) return [];
    const groups: { title: string; items: Service[] }[] = bootstrap.categories
      .map((c) => ({ title: c.name, items: bootstrap.services.filter((s) => s.category === c.name) }))
      .filter((g) => g.items.length > 0);
    const listed = new Set(groups.flatMap((g) => g.items.map((i) => i.id)));
    const other = bootstrap.services.filter((s) => !listed.has(s.id));
    if (other.length) groups.push({ title: "More", items: other });
    return groups;
  }, [bootstrap]);

  const slotIsPast = (iso: string, hour: string): boolean =>
    new Date(`${iso}T${hour}:00`).getTime() <= Date.now();

  const suggestNextSlot = useCallback(() => {
    if (!dateIso || !time) return;
    const slot = new Date(`${dateIso}T${time}:00`);
    slot.setHours(slot.getHours() + 1);
    if (slot.getHours() > 17 || slot.getDay() === 0) {
      do {
        slot.setDate(slot.getDate() + 1);
      } while (slot.getDay() === 0);
      slot.setHours(9, 0, 0, 0);
    }
    setDateIso(toIsoDate(slot));
    setTime(`${String(slot.getHours()).padStart(2, "0")}:00`);
  }, [dateIso, time]);

  const confirm = async () => {
    if (!patient || !branchId || !serviceId || !dateIso || !time || posting) return;
    setPosting(true);
    setNotice(null);
    setError(null);
    const startsAt = new Date(`${dateIso}T${time}:00`).toISOString();
    const base = {
      branchId,
      patientId: patient.id,
      serviceId,
      startsAt,
      source: SOURCE,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    try {
      // "Any available expert" → walk the roster; a chosen expert → single try.
      const candidates = providerId === "any" ? providers.map((p) => p.id) : [providerId];
      for (const pid of candidates) {
        try {
          const { appointment } = await api.createAppointment({ ...base, providerId: pid });
          setBooked(appointment);
          return;
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 409) throw err;
          // slot taken for this expert — try the next one
        }
      }
      // Everything 409'd — auto-suggest the next hour and ask to confirm again.
      suggestNextSlot();
      setNotice(
        providerId === "any"
          ? "Every expert was just taken at that hour ✦ We've suggested the next one — tap Confirm, or pick another slot."
          : "That slot was just taken ✦ We've suggested the next hour — tap Confirm, or pick another slot."
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Booking failed — please try again";
      setError(message);
      Alert.alert("Booking failed", message);
    } finally {
      setPosting(false);
    }
  };

  // ── Guest / loading / error states ────────────────────────────────────────
  if (isGuest || !patient) {
    return (
      <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
        <View className="px-5">
          <EmptyState
            emoji="🔐"
            title="Sign in to book"
            message="Guests can browse the menu — booking a visit needs your Auralis profile. It takes one email, no password."
            actionLabel="Sign in"
            onAction={() => router.push("/login")}
          />
        </View>
      </View>
    );
  }
  if (loading && !bootstrap) return <LoadingView full />;
  if (error && !bootstrap) return <ErrorView message={error} onRetry={() => void load()} full />;

  // ── Success screen ─────────────────────────────────────────────────────────
  if (booked) {
    const ref = booked.id.slice(-8).toUpperCase();
    return (
      <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
        {/* confetti-style flourish */}
        <View pointerEvents="none" className="absolute inset-x-0 top-0 h-64">
          {[
            { e: "✦", l: "8%", t: 30, r: "-12deg", s: 34 },
            { e: "✨", l: "78%", t: 44, r: "14deg", s: 26 },
            { e: "🎉", l: "18%", t: 110, r: "8deg", s: 24 },
            { e: "✦", l: "86%", t: 150, r: "18deg", s: 22 },
            { e: "💧", l: "70%", t: 96, r: "-6deg", s: 22 },
          ].map((c, i) => (
            <Text
              key={i}
              className="absolute"
              style={{ left: c.l, top: c.t, transform: [{ rotate: c.r }], fontSize: c.s, opacity: 0.85 }}
            >
              {c.e}
            </Text>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
          <View className="items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-emerald-700">
              <Check size={36} color="#ffffff" />
            </View>
            <Text className="mt-5 text-3xl font-bold text-stone-900">You&apos;re booked!</Text>
            <Text className="mt-2 text-center text-[15px] leading-6 text-stone-500">
              We&apos;ve sent the details to the clinic. A confirmation is on its way ✦
            </Text>
          </View>

          <View className="mt-8 rounded-3xl border border-stone-100 bg-white p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Booking ref
              </Text>
              <Text className="text-sm font-bold tracking-[0.15em] text-emerald-700">{ref}</Text>
            </View>
            <View className="mt-4 gap-3">
              <SummaryRow label="Treatment" value={`${booked.service.emoji} ${booked.service.name}`} />
              <SummaryRow label="Expert" value={booked.provider.name} />
              <SummaryRow label="Clinic" value={booked.branch.name} />
              <SummaryRow label="When" value={formatDateTime(booked.startsAt)} />
              <SummaryRow label="Price" value={money(booked.price, booked.branch.currency)} />
            </View>
          </View>

          <View className="mt-8 gap-3">
            <Pressable
              onPress={() => router.replace("/(tabs)/visits")}
              className="items-center rounded-2xl bg-emerald-700 py-4 active:opacity-85"
            >
              <Text className="text-[15px] font-bold text-white">View my visits</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace("/(tabs)/home")}
              className="items-center rounded-2xl border border-stone-200 bg-white py-4 active:opacity-80"
            >
              <Text className="text-[15px] font-semibold text-stone-700">Back to home</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Wizard chrome ───────────────────────────────────────────────────────────
  const back = () => (step === 1 ? router.back() : setStep(step - 1));

  return (
    <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="border-b border-stone-100 bg-white px-5 pb-3">
        <View className="flex-row items-center">
          <Pressable
            onPress={back}
            className="h-10 w-10 items-center justify-center rounded-full border border-stone-200 active:opacity-70"
          >
            <ArrowLeft size={18} color="#57534e" />
          </Pressable>
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-bold text-stone-900">Book a visit</Text>
            <Text className="text-xs text-stone-500">
              Step {step} of 5 · {STEP_TITLES[step - 1]}
            </Text>
          </View>
        </View>
        {/* progress dots */}
        <View className="mt-3 flex-row items-center gap-1.5">
          {STEP_TITLES.map((_, i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${i + 1 === step ? "w-7 bg-emerald-700" : i + 1 < step ? "w-1.5 bg-emerald-300" : "w-1.5 bg-stone-200"}`}
            />
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {notice && (
          <View className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Text className="text-[13px] leading-5 text-amber-800">{notice}</Text>
          </View>
        )}

        {/* STEP 1 — branch */}
        {step === 1 && (
          <View className="gap-3">
            {(bootstrap?.branches ?? []).map((b) => {
              const active = branchId === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => {
                    setBranchId(b.id);
                    setStep(2);
                  }}
                  className={`rounded-3xl border p-5 active:opacity-85 ${active ? "border-emerald-600 bg-emerald-50" : "border-stone-200 bg-white"}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Text className="text-2xl">{flagFor(b.country)}</Text>
                      <View className="ml-3">
                        <Text className="text-[15px] font-semibold text-stone-900">{b.name}</Text>
                        <Text className="mt-0.5 text-xs text-stone-500">
                          {b.city ?? b.code} · open {b.openTime}–{b.closeTime}
                        </Text>
                      </View>
                    </View>
                    <View className="rounded-full bg-stone-100 px-2.5 py-1">
                      <Text className="text-[11px] font-bold text-stone-600">
                        {b.currency === "GBP" ? "£ GBP" : "$ USD"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* STEP 2 — service grouped by category */}
        {step === 2 &&
          groupedServices.map((group) => (
            <View key={group.title} className="mb-6">
              <Text className="mb-2.5 text-xs font-bold uppercase tracking-[0.18em] text-stone-400">
                {group.title}
              </Text>
              <View className="gap-2.5">
                {group.items.map((s) => {
                  const active = serviceId === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        setServiceId(s.id);
                        setStep(3);
                      }}
                      className={`flex-row items-center rounded-2xl border p-4 active:opacity-85 ${active ? "border-emerald-600 bg-emerald-50" : "border-stone-200 bg-white"}`}
                    >
                      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                        <Text className="text-xl">{s.emoji}</Text>
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-[14px] font-semibold text-stone-900" numberOfLines={1}>
                          {s.name}
                        </Text>
                        <View className="mt-0.5 flex-row items-center">
                          <Clock size={11} color="#a8a29e" />
                          <Text className="ml-1 text-[11px] text-stone-500">{s.durationMin} min</Text>
                        </View>
                      </View>
                      <PriceTag amountUsd={s.price} currency={currency} size="sm" />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

        {/* STEP 3 — provider */}
        {step === 3 && (
          <View className="gap-2.5">
            {providers.length === 0 && (
              <View className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <Text className="text-[13px] text-amber-800">
                  No resident experts at this clinic yet — pick &ldquo;Any available expert&rdquo; and we&apos;ll
                  arrange a visiting specialist ✦
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                setProviderId("any");
                setStep(4);
              }}
              className={`flex-row items-center justify-between rounded-2xl border p-4 active:opacity-85 ${
                providerId === "any" ? "border-emerald-600 bg-emerald-50" : "border-stone-200 bg-white"
              }`}
            >
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-emerald-700">
                  <Text className="text-lg text-white">✦</Text>
                </View>
                <View className="ml-3">
                  <Text className="text-[15px] font-semibold text-stone-900">Any available expert</Text>
                  <Text className="text-xs text-stone-500">First free specialist</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#d6d3d1" />
            </Pressable>

            {providers.map((p) => {
              const active = providerId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setProviderId(p.id);
                    setStep(4);
                  }}
                  className={`flex-row items-center justify-between rounded-2xl border p-4 active:opacity-85 ${
                    active ? "border-emerald-600 bg-emerald-50" : "border-stone-200 bg-white"
                  }`}
                >
                  <View className="flex-row items-center">
                    <Avatar name={p.name} color={p.avatarColor} size={44} />
                    <View className="ml-3 flex-1">
                      <Text className="text-[15px] font-semibold text-stone-900">{p.name}</Text>
                      <Text className="text-xs text-stone-500" numberOfLines={1}>
                        {p.title ?? "Aesthetic specialist"}
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
        )}

        {/* STEP 4 — date + time */}
        {step === 4 && (
          <View>
            <Text className="text-sm font-semibold text-stone-700">Pick a day</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{ gap: 8, paddingRight: 20 }}
            >
              {days.map((d) => {
                const active = dateIso === d.iso;
                return (
                  <Pressable
                    key={d.iso}
                    onPress={() => setDateIso(d.iso)}
                    className={`w-[64px] items-center rounded-2xl border py-3 active:opacity-85 ${
                      active ? "border-emerald-600 bg-emerald-700" : "border-stone-200 bg-white"
                    }`}
                  >
                    <Text className={`text-[11px] font-semibold ${active ? "text-emerald-100" : "text-stone-400"}`}>
                      {d.weekday}
                    </Text>
                    <Text className={`mt-0.5 text-lg font-bold ${active ? "text-white" : "text-stone-900"}`}>
                      {d.dayNum}
                    </Text>
                    <Text className={`text-[10px] ${active ? "text-emerald-100/80" : "text-stone-400"}`}>
                      {d.month}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text className="mt-6 text-sm font-semibold text-stone-700">Pick a time</Text>
            <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
              {HOUR_SLOTS.map((slot) => {
                const active = time === slot;
                const disabled = !dateIso || slotIsPast(dateIso, slot);
                return (
                  <Pressable
                    key={slot}
                    disabled={disabled}
                    onPress={() => setTime(slot)}
                    className={`rounded-xl border px-4 py-2.5 ${
                      disabled
                        ? "border-stone-100 bg-stone-100 opacity-50"
                        : active
                          ? "border-emerald-600 bg-emerald-700"
                          : "border-stone-200 bg-white active:opacity-80"
                    }`}
                  >
                    <Text
                      className={`text-[13px] font-semibold ${
                        disabled ? "text-stone-400" : active ? "text-white" : "text-stone-700"
                      }`}
                    >
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="mt-3 text-[11px] text-stone-400">
              Sundays closed · times shown in clinic hours ✦
            </Text>

            <Pressable
              onPress={() => setStep(5)}
              disabled={!dateIso || !time}
              className={`mt-6 items-center rounded-2xl bg-emerald-700 py-4 ${
                !dateIso || !time ? "opacity-40" : "active:opacity-85"
              }`}
            >
              <Text className="text-[15px] font-bold text-white">Continue to review</Text>
            </Pressable>
          </View>
        )}

        {/* STEP 5 — review */}
        {step === 5 && branch && service && dateIso && time && (
          <View className="gap-4">
            <LinearGradient colors={["#065f46", "#047857"]} className="rounded-3xl p-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200">
                  Your visit
                </Text>
                <Text className="text-[11px] text-emerald-100/80">{branch.code}</Text>
              </View>
              <View className="mt-3 gap-2.5">
                <SummaryRow light label="Treatment" value={`${service.emoji} ${service.name}`} />
                <SummaryRow
                  light
                  label="Expert"
                  value={
                    providerId === "any"
                      ? "Any available expert"
                      : providers.find((p) => p.id === providerId)?.name ?? "Any available expert"
                  }
                />
                <SummaryRow light label="Clinic" value={`${flagFor(branch.country)} ${branch.name}`} />
                <SummaryRow light label="When" value={formatDateTime(new Date(`${dateIso}T${time}:00`))} />
                <SummaryRow light label="Duration" value={`${service.durationMin} minutes`} />
              </View>
              <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                <Text className="text-sm text-emerald-100/90">Total at the clinic</Text>
                <PriceTag amountUsd={service.price} currency={currency} size="md" tone="light" />
              </View>
            </LinearGradient>

            <View className="rounded-2xl bg-amber-50 px-4 py-3.5">
              <Text className="text-[13px] leading-5 text-amber-800">
                ✦ {money(service.depositAmount, currency)} deposit secures your slot — payable at the clinic,
                fully redeemable against your treatment.
              </Text>
            </View>

            <View className="rounded-3xl border border-stone-100 bg-white p-5">
              <Text className="text-sm font-semibold text-stone-900">Notes for your expert (optional)</Text>
              <TextInput
                className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-[14px] text-stone-900"
                placeholder="Allergies, first visit, specific concerns…"
                placeholderTextColor="#a8a29e"
                value={notes}
                onChangeText={setNotes}
                multiline
                maxLength={240}
                editable={!posting}
              />
            </View>

            <Pressable
              onPress={() => void confirm()}
              disabled={posting}
              className={`flex-row items-center justify-center rounded-2xl bg-emerald-700 py-4 ${
                posting ? "opacity-60" : "active:opacity-85"
              }`}
            >
              {posting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <CalendarPlus size={17} color="#ffffff" />
                  <Text className="ml-2 text-[15px] font-bold text-white">Confirm booking</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryRow({ label, value, light = false }: { label: string; value: string; light?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={`text-[13px] ${light ? "text-emerald-100/80" : "text-stone-500"}`}>{label}</Text>
      <Text className={`ml-4 flex-1 text-right text-[13px] font-semibold ${light ? "text-white" : "text-stone-900"}`} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
