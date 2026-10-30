import "../global.css";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, useSegments, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider, useSession } from "@/store/session";

/** Keeps signed-out staff on /login and bounces signed-in staff into the tab
 *  world. Waits for the persisted session to hydrate before acting. */
function AuthGate() {
  const { hydrated, user } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    const inAuthZone = segments.includes("login");
    if (!user && !inAuthZone) {
      router.replace("/login");
    } else if (user && inAuthZone) {
      router.replace("/(tabs)/today");
    }
  }, [hydrated, user, segments, router]);

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
            <Stack.Screen name="login" options={{ animation: "slide_from_bottom" }} />
            <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
            <Stack.Screen name="patient/[id]" options={{ animation: "slide_from_right" }} />
            <Stack.Screen name="schedule" options={{ animation: "slide_from_right" }} />
          </Stack>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
