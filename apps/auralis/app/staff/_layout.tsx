import { Stack, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LoadingView } from "@/components";
import { useStaffSession } from "@/store/session";

/** Staff area — credentials-only world. Signed-out visitors bounce to the
 *  premium staff sign-in; there is no staff sign-up by design. */
export default function StaffLayout() {
  const { hydrated, user } = useStaffSession();

  if (!hydrated) return <LoadingView full />;
  if (!user) return <Redirect href="/auth/staff-login" />;

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
        <Stack.Screen name="patient/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="schedule" options={{ animation: "slide_from_right" }} />
      </Stack>
    </>
  );
}
