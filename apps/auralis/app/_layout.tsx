import "../global.css";
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

// Keep the native splash up while the display fonts load.
void SplashScreen.preventAutoHideAsync().catch(() => {});

/** Root layout — one app, two worlds. The role-aware entry lives in index.tsx;
 *  each area (staff / patient) gates its own routes inside its own layout. */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_500Medium_Italic,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  if (!fontsLoaded) return null; // native splash still showing
  void SplashScreen.hideAsync().catch(() => {});

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
