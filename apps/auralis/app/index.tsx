import { Redirect } from "expo-router";
import { LoadingView } from "@/components";
import { useAuralisSession } from "@/store/session";

/** Entry — resume the last world (staff / patient / guest) or open the doors. */
export default function Index() {
  const { hydrated, staffUser, patient, isGuest } = useAuralisSession();

  if (!hydrated) return <LoadingView full />;
  if (staffUser) return <Redirect href="/staff/(tabs)/today" />;
  if (patient || isGuest) return <Redirect href="/patient/(tabs)/home" />;
  return <Redirect href="/welcome" />;
}
