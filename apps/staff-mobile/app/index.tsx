import { Redirect } from "expo-router";
import { LoadingView } from "@/components";
import { useSession } from "@/store/session";

/** Entry redirect: signed-in staff → Today, everyone else → sign-in. */
export default function Index() {
  const { hydrated, user } = useSession();

  if (!hydrated) return <LoadingView full />;
  return user ? <Redirect href="/(tabs)/today" /> : <Redirect href="/login" />;
}
