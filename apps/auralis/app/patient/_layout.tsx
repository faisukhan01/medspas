import { Stack, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LoadingView } from "@/components";
import { usePatientSession } from "@/store/session";

/** Patient area — sign-in, sign-up or guest browsing all live here. */
export default function PatientLayout() {
  const { hydrated, patient, isGuest } = usePatientSession();

  if (!hydrated) return <LoadingView full />;
  if (!patient && !isGuest) return <Redirect href="/welcome" />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#fafaf9" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="service/[id]" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="profile" options={{ animation: "slide_from_right" }} />
      </Stack>
    </>
  );
}
