import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, CalendarPlus, ChevronRight, Mail, MapPin, Phone, ShieldAlert } from "lucide-react-native";
import { Avatar, DateStrip, ErrorView, LoadingView, SectionCard, StatusPill } from "@/components";
import { api, loadBootstrap } from "@/lib/api";
import {
  addDays,
  dateKey,
  formatDate,
  formatDateTime,
  formatTime,
  money,
  moneyExact,
  parseTags,
  timeAgo,
  timeSlots,
} from "@/lib/format";
import type { BootstrapPayload, PatientDetailPayload } from "@/lib/types";
import { useSession } from "@/store/session";

const INVOICE_TONES: Record<string, string> = {
  PAID: "#047857",
  UNPAID: "#d97706",
  REFUNDED: "#e11d48",
  PARTIALLY_REFUNDED: "#e11d48",
};

function invoiceTone(status: string): string {
  return INVOICE_TONES[status] ?? "#78716c";
}

function invoiceLabel(status: string): string {
  switch (status) {
    case "PAID":
      return "Paid";
    case "UNPAID":
      return "Unpaid";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Part refunded";
    case "DRAFT":
      return "Draft";
    default:
      return status;
  }
}

/** 360° patient profile: contact, spend, visits, invoices + follow-up booking. */
export default function PatientDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, branchId } = useSession();

  const [detail, setDetail] = useState<PatientDetailPayload | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Booking sheet state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [day, setDay] = useState<Date>(() => new Date());
  const [time, setTime] = useState("10:00");
  const [creating, setCreating] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const load = useCallback(
    async (soft = false) => {
      if (!id) return;
      if (soft) setRefreshing(true);
      setError(null);
      try {
        const data = await api.patient(id);
        setDetail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load this patient");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    loadBootstrap()
      .then(setBootstrap)
      .catch(() => undefined); // booking degrades gracefully without the menu
  }, []);

  const bookingBranchId = branchId ?? detail?.patient.branch?.id ?? bootstrap?.branches[0]?.id ?? null;
  const bookingBranch = useMemo(
    () => bootstrap?.branches.find((b) => b.id === bookingBranchId) ?? null,
    [bootstrap, bookingBranchId]
  );
  const branchCurrency = bookingBranch?.currency ?? detail?.patient.branch?.currency ?? "USD";
  const slots = useMemo(() => timeSlots(bookingBranch?.openTime, bookingBranch?.closeTime), [bookingBranch]);
  const bookingDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)), []);

  const completedVisits = useMemo(
    () => (detail?.appointments ?? []).filter((a) => a.status === "COMPLETED").slice(0, 5),
    [detail]
  );

  /** ISO instant the confirm button will book. */
  const selectedStart = useMemo(() => {
    const [hours, minutes] = time.split(":").map(Number);
    const start = new Date(day);
    start.setHours(hours ?? 10, minutes ?? 0, 0, 0);
    return start;
  }, [day, time]);

  const openBooking = () => {
    if (!user) return;
    setBookingError(null);
    setServiceId(bootstrap?.services[0]?.id ?? null);
    const preferred = timeSlots(bookingBranch?.openTime, bookingBranch?.closeTime);
    setTime(preferred.includes("10:00") ? "10:00" : (preferred[0] ?? "10:00"));
    setBookingOpen(true);
  };

  const createBooking = async () => {
    if (!detail || !user || !serviceId || !bookingBranchId || creating) return;
    setCreating(true);
    setBookingError(null);
    try {
      await api.createAppointment({
        branchId: bookingBranchId,
        patientId: detail.patient.id,
        providerId: user.id,
        serviceId,
        startsAt: selectedStart.toISOString(),
        source: "STAFF_APP",
      });
      setBookingOpen(false);
      Alert.alert(
        "Follow-up booked ✦",
        `${detail.patient.firstName} · ${formatDateTime(selectedStart.toISOString())}`
      );
      void load(true);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Couldn't book — try another slot");
    } finally {
      setCreating(false);
    }
  };

  if (loading && !detail) return <LoadingView full />;
  if (error && !detail) return <ErrorView message={error} onRetry={() => void load()} full />;
  if (!detail) return <ErrorView message="Patient not found" onRetry={() => void load()} full />;

  const patient = detail.patient;
  const tags = parseTags(patient.tags);

  const upcoming = detail.upcoming ?? [];

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
        <View className="flex-row items-center px-5" style={{ paddingTop: insets.top + 10 }}>
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white active:opacity-70"
          >
            <ArrowLeft size={18} color="#57534e" />
          </Pressable>
          <Text className="ml-3 flex-1 text-lg font-bold text-stone-900" numberOfLines={1}>
            Patient profile
          </Text>
        </View>

        <View className="gap-5 px-5 pt-5">
          {/* Hero */}
          <View className="rounded-3xl border border-stone-100 bg-white p-5">
            <View className="flex-row items-center">
              <Avatar name={`${patient.firstName} ${patient.lastName}`} color={patient.avatarColor} size={56} />
              <View className="ml-4 flex-1">
                <Text className="text-xl font-bold text-stone-900">
                  {patient.firstName} {patient.lastName}
                </Text>
                <Text className="mt-0.5 text-[13px] text-stone-500">
                  {patient.branch ? `${patient.branch.name} (${patient.branch.code})` : "No home branch"}
                  {patient.joinedAt ? ` · since ${formatDate(patient.joinedAt)}` : ""}
                </Text>
              </View>
            </View>
            {tags.length > 0 ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {tags.map((tag) => (
                  <View key={tag} className="rounded-full bg-emerald-50 px-3 py-1">
                    <Text className="text-[11px] font-semibold text-emerald-700">{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* Stats */}
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-2xl border border-stone-100 bg-white p-4">
              <Text className="text-xl font-bold text-stone-900" numberOfLines={1}>
                {moneyExact(detail.stats.lifetimeValue, branchCurrency)}
              </Text>
              <Text className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                Lifetime spend
              </Text>
            </View>
            <View className="flex-1 rounded-2xl border border-stone-100 bg-white p-4">
              <Text className="text-xl font-bold text-stone-900">{detail.stats.totalAppointments}</Text>
              <Text className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                Appointments
              </Text>
            </View>
            <View className="flex-1 rounded-2xl border border-stone-100 bg-white p-4">
              <Text className="text-xl font-bold text-stone-900">{detail.stats.noShows}</Text>
              <Text className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                No-shows
              </Text>
            </View>
          </View>

          {detail.stats.activeMembership ? (
            <View className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <Text className="text-[13px] text-emerald-800">
                ✦ Active membership: <Text className="font-semibold">{detail.stats.activeMembership}</Text>
              </Text>
            </View>
          ) : null}

          {/* Primary action */}
          <Pressable
            onPress={openBooking}
            disabled={!user}
            className="flex-row items-center justify-center rounded-2xl bg-emerald-700 py-4 active:opacity-85"
          >
            <CalendarPlus size={17} color="#ffffff" />
            <Text className="ml-2 text-[15px] font-bold text-white">Book follow-up</Text>
          </Pressable>

          {/* Contact */}
          <SectionCard title="Contact" subtitle="Reach the patient or review flags">
            <View className="gap-3">
              {patient.phone ? (
                <Pressable
                  onPress={() => void Linking.openURL(`tel:${patient.phone}`)}
                  className="flex-row items-center active:opacity-70"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-stone-100">
                    <Phone size={15} color="#047857" />
                  </View>
                  <Text className="ml-3 flex-1 text-sm text-stone-700">{patient.phone}</Text>
                  <ChevronRight size={15} color="#d6d3d1" />
                </Pressable>
              ) : null}
              {patient.email ? (
                <Pressable
                  onPress={() => void Linking.openURL(`mailto:${patient.email}`)}
                  className="flex-row items-center active:opacity-70"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-stone-100">
                    <Mail size={15} color="#047857" />
                  </View>
                  <Text className="ml-3 flex-1 text-sm text-stone-700" numberOfLines={1}>
                    {patient.email}
                  </Text>
                  <ChevronRight size={15} color="#d6d3d1" />
                </Pressable>
              ) : null}
              {patient.city || patient.address ? (
                <View className="flex-row items-center">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-stone-100">
                    <MapPin size={15} color="#047857" />
                  </View>
                  <Text className="ml-3 flex-1 text-sm text-stone-700" numberOfLines={1}>
                    {[patient.address, patient.city].filter(Boolean).join(", ")}
                  </Text>
                </View>
              ) : null}
              {patient.emergencyContact ? (
                <View className="flex-row items-center">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-stone-100">
                    <Phone size={15} color="#78716c" />
                  </View>
                  <Text className="ml-3 flex-1 text-sm text-stone-700">
                    Emergency · {patient.emergencyContact}
                  </Text>
                </View>
              ) : null}
              {patient.allergies ? (
                <View className="flex-row items-center rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <ShieldAlert size={15} color="#b45309" />
                  <Text className="ml-2.5 flex-1 text-[13px] text-amber-800">
                    Allergies: {patient.allergies}
                  </Text>
                </View>
              ) : null}
              {!patient.phone && !patient.email && !patient.city && !patient.address && !patient.allergies ? (
                <Text className="text-sm text-stone-400">No contact details on file yet.</Text>
              ) : null}
            </View>
          </SectionCard>

          {/* Upcoming */}
          <SectionCard title="Upcoming appointments" subtitle={`${upcoming.length} scheduled`}>
            {upcoming.length === 0 ? (
              <Text className="text-sm text-stone-400">Nothing booked ahead — use “Book follow-up”.</Text>
            ) : (
              <View className="gap-3">
                {upcoming.map((appt) => (
                  <View key={appt.id} className="rounded-2xl border border-stone-100 bg-stone-50 p-3.5">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-stone-900">
                          {appt.service.emoji} {appt.service.name}
                        </Text>
                        <Text className="mt-0.5 text-xs text-stone-500">
                          {formatDateTime(appt.startsAt)} · {appt.provider.name}
                        </Text>
                      </View>
                      <StatusPill status={appt.status} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>

          {/* Recent visits */}
          <SectionCard title="Recent visits" subtitle="Completed treatments">
            {completedVisits.length === 0 ? (
              <Text className="text-sm text-stone-400">No completed visits yet.</Text>
            ) : (
              <View className="gap-3">
                {completedVisits.map((appt) => (
                  <View key={appt.id} className="flex-row items-center">
                    <View className="h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
                      <Text className="text-lg">{appt.service.emoji}</Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-stone-900" numberOfLines={1}>
                        {appt.service.name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-stone-500">
                        {timeAgo(appt.startsAt)} · {appt.provider.name}
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-stone-700">
                      {moneyExact(appt.price, appt.branch.currency)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>

          {/* Invoices */}
          <SectionCard title="Invoices" subtitle="Latest 10">
            {(detail.invoices ?? []).length === 0 ? (
              <Text className="text-sm text-stone-400">No invoices yet.</Text>
            ) : (
              <View className="gap-3">
                {detail.invoices.map((inv) => (
                  <View key={inv.id ?? inv.number} className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-stone-900">{inv.number}</Text>
                      <Text className="mt-0.5 text-xs text-stone-500">
                        {formatDate(inv.createdAt)}
                        {inv.paidAt ? ` · paid ${formatDate(inv.paidAt)}` : ""}
                      </Text>
                    </View>
                    <View
                      className="mr-3 rounded-full px-2 py-1"
                      style={{ backgroundColor: `${invoiceTone(inv.status)}1A` }}
                    >
                      <Text style={{ color: invoiceTone(inv.status) }} className="text-[10px] font-semibold">
                        {invoiceLabel(inv.status)}
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-stone-900">
                      {moneyExact(inv.total, inv.currency)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        </View>
      </ScrollView>

      {/* Book follow-up sheet */}
      <Modal
        visible={bookingOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-end bg-stone-900/40"
        >
          <View
            className="rounded-t-3xl bg-white px-5 pt-4"
            style={{ maxHeight: "88%", paddingBottom: insets.bottom + 20 }}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-lg font-bold text-stone-900">Book follow-up</Text>
                <Text className="mt-0.5 text-[13px] text-stone-500">
                  {patient.firstName} {patient.lastName} · with {user?.name ?? "you"}
                </Text>
              </View>
              <Pressable
                onPress={() => setBookingOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-full border border-stone-200 active:opacity-70"
              >
                <Text className="text-stone-500">✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Treatment */}
              <Text className="text-xs font-semibold uppercase tracking-widest text-stone-400">Treatment</Text>
              {(bootstrap?.services ?? []).length === 0 ? (
                <Text className="mt-2 text-sm text-stone-500">Service menu unavailable — retry from Today.</Text>
              ) : (
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {(bootstrap?.services ?? []).map((svc) => {
                    const active = svc.id === serviceId;
                    return (
                      <Pressable
                        key={svc.id}
                        onPress={() => setServiceId(svc.id)}
                        className={`rounded-2xl border px-3.5 py-2.5 active:opacity-80 ${
                          active ? "border-emerald-700 bg-emerald-700" : "border-stone-200 bg-white"
                        }`}
                      >
                        <Text className={`text-[13px] font-semibold ${active ? "text-white" : "text-stone-700"}`}>
                          {svc.emoji} {svc.name}
                        </Text>
                        <Text className={`mt-0.5 text-[11px] ${active ? "text-emerald-100" : "text-stone-400"}`}>
                          {money(svc.price, branchCurrency)} · {svc.durationMin} min
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Day */}
              <Text className="mt-5 text-xs font-semibold uppercase tracking-widest text-stone-400">Day</Text>
              <View className="mt-2">
                <DateStrip days={bookingDays} selected={dateKey(day)} onSelect={setDay} flush />
              </View>

              {/* Time */}
              <Text className="mt-5 text-xs font-semibold uppercase tracking-widest text-stone-400">Time</Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {slots.map((slot) => {
                  const active = slot === time;
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => setTime(slot)}
                      className={`w-[23%] items-center rounded-xl border py-2.5 active:opacity-80 ${
                        active ? "border-emerald-700 bg-emerald-700" : "border-stone-200 bg-white"
                      }`}
                    >
                      <Text className={`text-[13px] font-semibold ${active ? "text-white" : "text-stone-700"}`}>
                        {slot}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {bookingError ? (
                <View className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <Text className="text-[13px] leading-5 text-rose-700">{bookingError}</Text>
                </View>
              ) : null}

              {/* Confirm */}
              <Pressable
                onPress={() => void createBooking()}
                disabled={creating || !serviceId || !bookingBranchId}
                className={`mt-5 items-center rounded-2xl bg-emerald-700 py-4 ${
                  creating || !serviceId || !bookingBranchId ? "opacity-50" : "active:opacity-85"
                }`}
              >
                {creating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-[15px] font-bold text-white">
                    Confirm · {formatDate(day)} at {formatTime(selectedStart)}
                  </Text>
                )}
              </Pressable>
              <Text className="mt-3 text-center text-[11px] leading-4 text-stone-400">
                Booked at {bookingBranch?.name ?? "the clinic"} · overlaps are rejected by the server ✦
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
