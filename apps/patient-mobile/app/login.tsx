import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Mail } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/store/session";
import { ApiError } from "@/lib/api";

const DEMO_EMAILS = [
  "ava.thompson@example.com",
  "poppy.hughes@example.com",
  "mia.rodriguez@example.com",
];

/** Email-only demo sign-in against POST /api/auth/patient. */
export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useSession();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (value: string) => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(value);
      router.replace("/(tabs)/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed — please try again");
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-stone-50"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          className="mb-8 h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white active:opacity-70"
        >
          <ArrowLeft size={18} color="#57534e" />
        </Pressable>

        <Text className="text-3xl font-bold text-stone-900">Welcome back ✦</Text>
        <Text className="mt-2 text-[15px] leading-6 text-stone-500">
          Sign in with the email on your Auralis profile — no password needed in this demo.
        </Text>

        <View className="mt-8">
          <View className="flex-row items-center rounded-2xl border border-stone-200 bg-white px-4">
            <Mail size={18} color="#a8a29e" />
            <TextInput
              className="ml-3 flex-1 py-4 text-[15px] text-stone-900"
              placeholder="you@example.com"
              placeholderTextColor="#a8a29e"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="go"
              onSubmitEditing={() => signIn(email)}
              editable={!submitting}
            />
          </View>

          {error ? (
            <View className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Text className="text-[13px] leading-5 text-amber-800">{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => signIn(email)}
            disabled={submitting || email.trim().length === 0}
            className={`mt-5 items-center rounded-2xl bg-emerald-700 py-4 ${
              submitting || email.trim().length === 0 ? "opacity-50" : "active:opacity-85"
            }`}
          >
            <Text className="text-[15px] font-bold text-white">
              {submitting ? "Signing in…" : "Sign in"}
            </Text>
          </Pressable>
        </View>

        {/* Demo accounts */}
        <View className="mt-10">
          <Text className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Try a demo patient
          </Text>
          <View className="mt-3 gap-2">
            {DEMO_EMAILS.map((demo) => (
              <Pressable
                key={demo}
                onPress={() => {
                  setEmail(demo);
                  void signIn(demo);
                }}
                disabled={submitting}
                className={`flex-row items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3.5 active:opacity-80 ${
                  submitting ? "opacity-50" : ""
                }`}
              >
                <Text className="text-sm text-stone-700">{demo}</Text>
                <Text className="text-xs font-semibold text-emerald-700">Sign in →</Text>
              </Pressable>
            ))}
          </View>
          <Text className="mt-4 text-center text-[11px] leading-4 text-stone-400">
            Demo-grade auth — production would use OTP or magic links ✦
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
