import { Redirect } from "expo-router";
import { LoadingView } from "@/components/LoadingView";
import { useSession } from "@/store/session";

/** Entry redirect: session (or guest) → tabs, everyone else → welcome. */
export default function Index() {
  const { hydrated, patient, isGuest } = useSession();

  if (!hydrated) return <LoadingView full />;
  if (!patient && !isGuest) return <Redirect href="/welcome" />;
  return <Redirect href="/(tabs)/home" />;
}
