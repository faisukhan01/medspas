import "../global.css";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_500Medium_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SessionProvider } from "@/store/session";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

// Keep the native splash up while the display fonts load.
void SplashScreen.preventAutoHideAsync().catch(() => {});

/** Root layout — one app, two worlds. The role-aware entry lives in index.tsx;
 *  each area (staff / patient) gates its own routes inside its own layout.
 *
 *  Rendering is NEVER gated on font loading: the tree mounts immediately
 *  (system fonts render first, Playfair swaps in when ready) so a font
 *  hiccup can never blank the app. The splash is hidden once fonts settle,
 *  with a hard 4s failsafe regardless. */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_500Medium_Italic,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  // Hide the splash when fonts are ready — or after 4s no matter what.
  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  useEffect(() => {
    const failsafe = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, 4000);
    return () => clearTimeout(failsafe);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0c0a09" }}>
      <SafeAreaProvider>
        <AppErrorBoundary>
          <SessionProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#0c0a09" },
                animation: "slide_from_right",
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="welcome" options={{ animation: "fade" }} />
              <Stack.Screen name="auth/staff-login" options={{ animation: "slide_from_bottom" }} />
              <Stack.Screen name="auth/patient-login" options={{ animation: "slide_from_bottom" }} />
              <Stack.Screen name="auth/patient-signup" options={{ animation: "slide_from_bottom" }} />
              <Stack.Screen name="staff" options={{ animation: "fade" }} />
              <Stack.Screen name="patient" options={{ animation: "fade" }} />
            </Stack>
          </SessionProvider>
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
