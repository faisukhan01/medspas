import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles, CalendarPlus, Gem, MessageCircleHeart } from "lucide-react-native";
import { useSession } from "@/store/session";

const FEATURES = [
  { icon: Sparkles, text: "The full treatment menu, prices up front" },
  { icon: CalendarPlus, text: "Book your expert in under a minute" },
  { icon: Gem, text: "Memberships, packages & visit history" },
  { icon: MessageCircleHeart, text: "Aura — your AI concierge, 24/7" },
];

/** Gradient hero: brand moment + two doors (sign in / guest browse). */
export default function Welcome() {
  const router = useRouter();
  const { enterGuest } = useSession();
  const insets = useSafeAreaInsets();

  const browseAsGuest = () => {
    enterGuest();
    router.replace("/(tabs)/home");
  };

  return (
    <LinearGradient colors={["#065f46", "#047857", "#022c22"]} style={{ flex: 1 }}>
      <View className="flex-1 px-7" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        {/* Brand */}
        <View className="flex-1 justify-center">
          <View className="mb-8 h-20 w-20 items-center justify-center rounded-3xl border border-white/25 bg-white/10">
            <Text className="text-4xl text-amber-200">✦</Text>
          </View>
          <Text className="text-[13px] font-semibold uppercase tracking-[0.3em] text-amber-200/90">
            Auralis Aesthetics
          </Text>
          <Text className="mt-3 text-4xl font-bold leading-tight text-white">
            Your beauty,{"\n"}orchestrated.
          </Text>
          <Text className="mt-4 max-w-[280px] text-[15px] leading-6 text-emerald-100/80">
            Four flagship clinics. One elegant app for treatments, bookings and rewards.
          </Text>

          <View className="mt-9 gap-3.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <View key={text} className="flex-row items-center">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <Icon size={16} color="#fcd34d" />
                </View>
                <Text className="ml-3 flex-1 text-sm text-emerald-50/90">{text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={{ gap: 12 }}>
          <Pressable
            onPress={() => router.push("/login")}
            className="items-center rounded-2xl bg-amber-400 py-4 active:opacity-85"
          >
            <Text className="text-[15px] font-bold text-stone-900">Get started</Text>
          </Pressable>
          <Pressable
            onPress={browseAsGuest}
            className="items-center rounded-2xl border border-white/25 bg-white/5 py-4 active:opacity-80"
          >
            <Text className="text-[15px] font-semibold text-white">Browse as guest</Text>
          </Pressable>
          <Text className="pt-1 text-center text-[11px] text-emerald-100/50">
            Guests can explore the menu — booking asks you to sign in ✦
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
