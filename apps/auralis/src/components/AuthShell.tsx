import type { ReactNode } from "react";
import { ImageBackground, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { C, F } from "@/lib/theme";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Dark-luxe cinematic shell behind every sign-in / sign-up screen. */
export default function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require("../../assets/welcome-bg.jpg")}
      resizeMode="cover"
      style={{ flex: 1, backgroundColor: C.night }}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={["rgba(12,10,9,0.85)", "rgba(12,10,9,0.55)", "rgba(12,10,9,0.96)"]}
        locations={[0, 0.35, 1]}
        style={{ ...({ position: "absolute", inset: 0 } as const) }}
      />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] active:opacity-70"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={18} color="#e7e5e4" />
        </Pressable>

        {/* Brand */}
        <View className="mt-6 flex-row items-center justify-center" style={{ marginBottom: 26 }}>
          <Text style={{ color: C.goldBright, fontSize: 20, lineHeight: 24 }}>✦</Text>
          <Text style={{ fontFamily: F.display, color: C.inkOnDark, fontSize: 18, letterSpacing: 6, marginLeft: 8 }}>
            AURALIS
          </Text>
        </View>

        <View className="items-center">
          <Text style={{ fontSize: 11, letterSpacing: 4, color: C.gold, fontWeight: "600" }}>
            {eyebrow.toUpperCase()}
          </Text>
          <Text
            className="mt-2 text-center"
            style={{ fontFamily: F.display, color: C.inkOnDark, fontSize: 32, lineHeight: 40 }}
          >
            {title}
          </Text>
          <Text className="mt-2 text-center" style={{ color: C.mutedOnDark, fontSize: 13.5, lineHeight: 20 }}>
            {subtitle}
          </Text>
        </View>

        {/* Glass card */}
        <View
          className="mt-7 rounded-3xl border p-5"
          style={{
            borderColor: "rgba(255,255,255,0.14)",
            backgroundColor: "rgba(20,17,15,0.72)",
            shadowColor: "#000",
            shadowOpacity: 0.45,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
          }}
        >
          {children}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}
