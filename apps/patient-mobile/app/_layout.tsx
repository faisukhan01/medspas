import "../global.css";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, useSegments, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider, useSession } from "@/store/session";

/** Bounces signed-out visitors to /welcome and keeps auth screens out of the
 *  tab world once a session (or guest mode) exists. */
function AuthGate() {
  const { hydrated, patient, isGuest } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    const inAuthZone = segments.includes("welcome") || segments.includes("login");
    if (!patient && !isGuest && !inAuthZone) {
      router.replace("/welcome");
    } else if (patient && inAuthZone) {
      router.replace("/(tabs)/home");
    }
  }, [hydrated, patient, isGuest, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <AuthGate />
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#fafaf9" },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" options={{ animation: "fade" }} />
            <Stack.Screen name="login" options={{ animation: "slide_from_bottom" }} />
            <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
            <Stack.Screen name="service/[id]" options={{ animation: "slide_from_bottom" }} />
            <Stack.Screen name="profile" options={{ animation: "slide_from_right" }} />
          </Stack>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
