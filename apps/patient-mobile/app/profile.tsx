import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft, LogOut, MapPin, Sparkles } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, ErrorView, LoadingView, SectionCard } from "@/components";
import { loadBootstrap, api } from "@/lib/api";
import { parseTags } from "@/lib/format";
import type { Branch, PatientProfile } from "@/lib/types";
import { useSession } from "@/store/session";

const TAG_STYLES: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-700 border-amber-200",
  Member: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patient, logout } = useSession();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patient) return;
    setError(null);
    setLoading(true);
    try {
      const [bootstrap, prof] = await Promise.all([
        loadBootstrap(),
        api.patientProfile(patient.id),
      ]);
      setProfile(prof);
      setBranch(bootstrap.branches.find((b) => b.id === patient.branchId) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your profile");
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmLogout = () => {
    Alert.alert("Sign out?", "You'll return to the welcome screen.", [
      { text: "Stay", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => logout() },
    ]);
  };

  if (!patient) return null; // gate handles sign-out bounce
  if (loading && !profile) return <LoadingView full />;
  if (error && !profile) return <ErrorView message={error} onRetry={() => void load()} full />;

  const tags = parseTags(patient.tags);
  const initialsName = `${patient.firstName} ${patient.lastName}`;

  return (
    <ScrollView className="flex-1 bg-stone-50" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      {/* Header */}
      <LinearGradient colors={["#065f46", "#047857"]} style={{ paddingTop: insets.top + 12, paddingBottom: 28 }}>
        <Pressable
          onPress={() => router.back()}
          className="ml-5 h-10 w-10 items-center justify-center rounded-full bg-white/15 active:opacity-80"
        >
          <ArrowLeft size={18} color="#ffffff" />
        </Pressable>
        <View className="mt-4 items-center px-6">
          <Avatar name={initialsName} color={patient.avatarColor} size={84} />
          <Text className="mt-4 text-2xl font-bold text-white">{initialsName}</Text>
          <Text className="mt-1 text-sm text-emerald-100/85">{patient.email}</Text>
          {tags.length > 0 && (
            <View className="mt-3 flex-row gap-2">
              {tags.map((tag) => (
                <View
                  key={tag}
                  className={`rounded-full border px-3 py-1 ${TAG_STYLES[tag] ?? "bg-white/10 border-white/20"}`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      TAG_STYLES[tag]?.split(" ")[1] ?? "text-white"
                    }`}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </LinearGradient>

      <View className="gap-4 px-5 pt-5">
        {/* Home branch */}
        <SectionCard title="Home clinic">
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
              <MapPin size={18} color="#047857" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-semibold text-stone-900">
                {branch?.name ?? "Not set yet"}
              </Text>
              <Text className="mt-0.5 text-xs text-stone-500">
                {branch ? `${branch.city ?? branch.code} · ${branch.currency === "GBP" ? " GBP £" : "USD $"}` : "Choose a clinic when you book"}
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* Stats */}
        {profile && (
          <View className="flex-row gap-4">
            <View className="flex-1 rounded-3xl border border-stone-100 bg-white p-5">
              <Text className="text-2xl font-bold text-emerald-700">{profile.stats.visitCount}</Text>
              <Text className="mt-1 text-xs text-stone-500">Visits with us</Text>
            </View>
            <View className="flex-1 rounded-3xl border border-stone-100 bg-white p-5">
              <Text className="text-2xl font-bold text-amber-600">
                {profile.stats.upcomingAppointments}
              </Text>
              <Text className="mt-1 text-xs text-stone-500">Upcoming visits</Text>
            </View>
          </View>
        )}

        {/* About */}
        <SectionCard title="About this app">
          <View className="gap-2.5">
            <View className="flex-row items-center">
              <Sparkles size={14} color="#d97706" />
              <Text className="ml-2 text-sm text-stone-600">Auralis Patient · demo build 1.0.0</Text>
            </View>
            <Text className="text-[13px] leading-5 text-stone-500">
              All patients, providers, treatments and prices in this app are fictional demo data for
              the Auralis showcase. Sign-in is email-only for the demo; production would use OTP or
              magic links.
            </Text>
          </View>
        </SectionCard>

        {/* Logout */}
        <Pressable
          onPress={confirmLogout}
          className="flex-row items-center justify-center rounded-2xl border border-rose-200 bg-white py-4 active:opacity-80"
        >
          <LogOut size={18} color="#be123c" />
          <Text className="ml-2 text-[15px] font-semibold text-rose-700">Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
