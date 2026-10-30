import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, CreditCard, Gift, Sparkles } from "lucide-react-native";
import { EmptyState, ErrorView, LoadingView, SectionCard } from "@/components";
import { api } from "@/lib/api";
import { csvList, cycleSuffix, formatDate, moneyExact } from "@/lib/format";
import type { PatientMembership, PatientRecordPayload } from "@/lib/types";
import { useSession } from "@/store/session";

export default function Perks() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patient, isGuest } = useSession();

  const [record, setRecord] = useState<PatientRecordPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patient) return;
    setError(null);
    try {
      const data = await api.patientRecord(patient.id);
      setRecord(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your perks");
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isGuest || !patient) {
    return (
      <View className="flex-1 bg-stone-50" style={{ paddingTop: insets.top }}>
        <View className="px-5">
          <EmptyState
            emoji="💎"
            title="Perks, memberships & packages"
            message="Sign in to see your Glow Club membership, treatment packages, invoices and rewards."
            actionLabel="Sign in"
            onAction={() => router.push("/login")}
          />
        </View>
      </View>
    );
  }
  if (loading && !record) return <LoadingView full />;
  if (error && !record) return <ErrorView message={error} onRetry={() => void load()} full />;

  const membership: PatientMembership | undefined =
    record?.memberships.find((m) => m.status === "ACTIVE") ?? record?.memberships[0];
  const benefits = membership ? csvList(membership.plan.benefits) : [];

  return (
    <ScrollView
      className="flex-1 bg-stone-50"
      contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
    >
      <View className="px-5" style={{ paddingTop: insets.top + 14 }}>
        <Text className="text-2xl font-bold text-stone-900">Perks</Text>
        <Text className="mt-1 text-sm text-stone-500">Rewards, packages & receipts ✦</Text>

        <View className="mt-5 gap-4">
          {/* Membership card */}
          {membership ? (
            <LinearGradient colors={["#022c22", "#065f46", "#047857"]} className="rounded-3xl p-6">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Sparkles size={16} color="#fcd34d" />
                  <Text className="ml-2 text-[11px] font-bold uppercase tracking-[0.25em] text-amber-200">
                    Glow Club
                  </Text>
                </View>
                {membership.status !== "ACTIVE" && (
                  <View className="rounded-full bg-white/15 px-2.5 py-1">
                    <Text className="text-[10px] font-bold text-white">{membership.status}</Text>
                  </View>
                )}
              </View>
              <Text className="mt-4 text-2xl font-bold text-white">{membership.plan.name}</Text>
              <Text className="mt-1 text-[13px] text-emerald-100/85">
                {moneyExact(membership.plan.price, membership.plan.currency)}
                {cycleSuffix(membership.plan.billingCycle)}
                {membership.renewsAt ? ` · renews ${formatDate(membership.renewsAt)}` : ""}
              </Text>

              <View className="mt-5 gap-2.5">
                {benefits.map((b) => (
                  <View key={b} className="flex-row items-start">
                    <View
                      className="items-center justify-center rounded-full bg-amber-400/25"
                      style={{ width: 18, height: 18, marginTop: 2 }}
                    >
                      <Check size={11} color="#fcd34d" />
                    </View>
                    <Text className="ml-2.5 flex-1 text-[13px] leading-5 text-emerald-50/90">{b}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          ) : (
            <LinearGradient colors={["#065f46", "#047857"]} className="rounded-3xl p-6">
              <Text className="text-xl font-bold text-white">Join Glow Club ✦</Text>
              <Text className="mt-2 text-[13px] leading-5 text-emerald-100/85">
                Monthly treatments, priority booking and member pricing — ask at the front desk or in
                AI Chat and we&apos;ll set you up.
              </Text>
            </LinearGradient>
          )}

          {/* Packages progress */}
          {(record?.packages.length ?? 0) > 0 && (
            <SectionCard title="Treatment packages" subtitle="Sessions waiting for you">
              <View className="gap-4">
                {record?.packages.map((pkg) => {
                  const used = Math.min(pkg.sessionsUsed, pkg.sessionsTotal);
                  const pct = pkg.sessionsTotal > 0 ? Math.round((used / pkg.sessionsTotal) * 100) : 0;
                  return (
                    <View key={pkg.id}>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[14px] font-semibold text-stone-900">{pkg.name}</Text>
                        <Text className="text-[12px] font-semibold text-stone-500">
                          {used}/{pkg.sessionsTotal} used
                        </Text>
                      </View>
                      <View className="mt-2 h-2 rounded-full bg-stone-100">
                        <View className="h-2 rounded-full bg-emerald-700" style={{ width: `${pct}%` }} />
                      </View>
                      {pkg.expiresAt && (
                        <Text className="mt-1.5 text-[11px] text-stone-400">
                          Expires {formatDate(pkg.expiresAt)}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </SectionCard>
          )}

          {/* Gift cards note */}
          <View className="flex-row items-center rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-amber-100">
              <Gift size={20} color="#b45309" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-semibold text-stone-900">Gift cards</Text>
              <Text className="mt-0.5 text-[12px] leading-4 text-stone-600">
                Digital gift cards are available at the front desk — the prettiest last-minute present ✦
              </Text>
            </View>
          </View>

          {/* Invoices */}
          {(record?.invoices.length ?? 0) > 0 && (
            <SectionCard title="Invoices" subtitle="Your recent receipts">
              <View className="gap-3">
                {record?.invoices.map((inv) => (
                  <View
                    key={inv.number}
                    className="flex-row items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 p-4"
                  >
                    <View className="ml-0 flex-1">
                      <Text className="text-[13px] font-semibold text-stone-800">{inv.number}</Text>
                      <Text className="mt-0.5 text-[11px] text-stone-500">
                        {inv.paidAt ? `Paid ${formatDate(inv.paidAt)}` : "Awaiting payment"}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[13px] font-bold text-stone-900">
                        {moneyExact(inv.total, inv.currency ?? "USD")}
                      </Text>
                      <View
                        className={`mt-1 rounded-full px-2.5 py-0.5 ${
                          inv.status === "PAID" ? "bg-emerald-100" : "bg-amber-100"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            inv.status === "PAID" ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {inv.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </SectionCard>
          )}
          {record && record.invoices.length === 0 && (
            <View className="flex-row items-center rounded-3xl border border-stone-100 bg-white p-5">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-stone-100">
                <CreditCard size={20} color="#57534e" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[14px] font-semibold text-stone-900">No invoices yet</Text>
                <Text className="mt-0.5 text-[12px] text-stone-500">
                  Receipts appear here after your first visit ✦
                </Text>
              </View>
            </View>
          )}

          {/* LTV stat */}
          {record && (
            <View className="rounded-3xl border border-stone-100 bg-white p-5">
              <Text className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Total invested in you ✦
              </Text>
              <Text className="mt-2 text-3xl font-bold text-emerald-700">
                {moneyExact(record.stats.lifetimeValue, "USD")}
              </Text>
              <Text className="mt-1 text-xs text-stone-500">
                Across {record.stats.visitCount} visits · thank you for being wonderful
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
