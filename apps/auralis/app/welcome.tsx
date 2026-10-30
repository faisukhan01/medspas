import { ImageBackground, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Briefcase, ChevronRight, Sparkles } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { C, F } from "@/lib/theme";

/** The doors — one app, two worlds. Pick your side; both feel like Auralis. */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require("../assets/welcome-bg.jpg")}
      resizeMode="cover"
      style={{ flex: 1, backgroundColor: C.night }}
    >
      <StatusBar style="light" />
      {/* Legibility scrims */}
      <LinearGradient
        colors={["rgba(12,10,9,0.82)", "rgba(12,10,9,0.35)", "rgba(12,10,9,0.55)", "rgba(12,10,9,0.95)"]}
        locations={[0, 0.28, 0.55, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 28,
          justifyContent: "space-between",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand mark */}
        <View className="items-center" style={{ marginTop: 28 }}>
          <View className="h-[72px] w-[72px] items-center justify-center rounded-3xl border border-white/20 bg-white/10">
            <Text style={{ color: C.goldBright, fontSize: 30, lineHeight: 34 }}>✦</Text>
          </View>
          <Text
            style={{
              fontFamily: F.display,
              color: C.inkOnDark,
              fontSize: 30,
              letterSpacing: 8,
              marginTop: 18,
            }}
          >
            AURALIS
          </Text>
          <View className="mt-3 h-px w-16" style={{ backgroundColor: "rgba(227,183,106,0.55)" }} />
          <Text
            className="mt-3 text-center"
            style={{ color: C.mutedOnDark, fontSize: 12, letterSpacing: 3, fontWeight: "600" }}
          >
            THE MEDSPA OPERATING SYSTEM
          </Text>
        </View>

        {/* The two doors */}
        <View style={{ gap: 14 }}>
          <Text
            className="text-center"
            style={{ fontFamily: F.displayItalic, color: "rgba(250,250,249,0.85)", fontSize: 19 }}
          >
            One app. Two worlds. Choose yours.
          </Text>

          <Pressable
            onPress={() => router.push("/auth/patient-login")}
            className="rounded-3xl border border-white/15 bg-white/[0.07] px-5 py-5 active:opacity-80"
            style={{ shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}
          >
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(227,183,106,0.16)" }}>
                <Sparkles size={22} color={C.goldBright} />
              </View>
              <View className="ml-4 flex-1">
                <Text style={{ fontFamily: F.display, color: C.inkOnDark, fontSize: 19 }}>
                  Continue as Patient
                </Text>
                <Text className="mt-1" style={{ color: C.mutedOnDark, fontSize: 12.5, lineHeight: 17 }}>
                  Book treatments, memberships & your AI concierge
                </Text>
              </View>
              <ChevronRight size={20} color="rgba(250,250,249,0.4)" />
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push("/auth/staff-login")}
            className="rounded-3xl border border-white/15 bg-white/[0.07] px-5 py-5 active:opacity-80"
            style={{ shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}
          >
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(227,183,106,0.16)" }}>
                <Briefcase size={22} color={C.goldBright} />
              </View>
              <View className="ml-4 flex-1">
                <Text style={{ fontFamily: F.display, color: C.inkOnDark, fontSize: 19 }}>
                  Continue as Staff
                </Text>
                <Text className="mt-1" style={{ color: C.mutedOnDark, fontSize: 12.5, lineHeight: 17 }}>
                  Clinical team · sign in with your clinic credentials
                </Text>
              </View>
              <ChevronRight size={20} color="rgba(250,250,249,0.4)" />
            </View>
          </Pressable>

          <Text className="pt-2 text-center" style={{ color: "rgba(250,250,249,0.38)", fontSize: 11, lineHeight: 15 }}>
            Staff accounts are provisioned by your clinic — no sign-up.
            {"\n"}Every patient, booking and photo here is 100% demo data.
          </Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}
