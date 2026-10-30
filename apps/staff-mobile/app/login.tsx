import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/store/session";
import { ApiError } from "@/lib/api";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/constants";

/** Branded email + password sign-in against POST /api/auth/login. */
export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (emailValue: string, passwordValue: string) => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(emailValue, passwordValue);
      router.replace("/(tabs)/today");
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
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand mark */}
        <View className="mb-10 flex-row items-center">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700">
            <Text className="text-3xl text-white">✦</Text>
          </View>
          <View className="ml-4">
            <Text className="text-2xl font-bold text-stone-900">Auralis Staff</Text>
            <Text className="mt-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Practice companion
            </Text>
          </View>
        </View>

        <Text className="text-3xl font-bold text-stone-900">Welcome back ✦</Text>
        <Text className="mt-2 text-[15px] leading-6 text-stone-500">
          Sign in with your Auralis staff account to run the day — schedule, check-ins and patients.
        </Text>

        <View className="mt-8">
          <View className="flex-row items-center rounded-2xl border border-stone-200 bg-white px-4">
            <Mail size={18} color="#a8a29e" />
            <TextInput
              className="ml-3 flex-1 py-4 text-[15px] text-stone-900"
              placeholder="you@auralis.demo"
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
              returnKeyType="next"
              editable={!submitting}
            />
          </View>

          <View className="mt-3 flex-row items-center rounded-2xl border border-stone-200 bg-white px-4">
            <Lock size={18} color="#a8a29e" />
            <TextInput
              className="ml-3 flex-1 py-4 text-[15px] text-stone-900"
              placeholder="Password"
              placeholderTextColor="#a8a29e"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError(null);
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void signIn(email, password)}
              editable={!submitting}
            />
            <Pressable onPress={() => setShowPassword((s) => !s)} className="p-1.5 active:opacity-70">
              {showPassword ? (
                <EyeOff size={18} color="#a8a29e" />
              ) : (
                <Eye size={18} color="#a8a29e" />
              )}
            </Pressable>
          </View>

          {error ? (
            <View className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Text className="text-[13px] leading-5 text-amber-800">{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => void signIn(email, password)}
            disabled={submitting || email.trim().length === 0 || password.length === 0}
            className={`mt-5 items-center rounded-2xl bg-emerald-700 py-4 ${
              submitting || email.trim().length === 0 || password.length === 0
                ? "opacity-50"
                : "active:opacity-85"
            }`}
          >
            <Text className="text-[15px] font-bold text-white">
              {submitting ? "Signing in…" : "Sign in"}
            </Text>
          </Pressable>
        </View>

        {/* Demo accounts — quick-fill + sign in */}
        <View className="mt-10">
          <Text className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Demo accounts · password {DEMO_PASSWORD}
          </Text>
          <View className="mt-3 gap-2">
            {DEMO_ACCOUNTS.map((acct) => (
              <Pressable
                key={acct.email}
                onPress={() => {
                  setEmail(acct.email);
                  setPassword(DEMO_PASSWORD);
                  void signIn(acct.email, DEMO_PASSWORD);
                }}
                disabled={submitting}
                className={`flex-row items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3.5 active:opacity-80 ${
                  submitting ? "opacity-50" : ""
                }`}
              >
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-semibold text-stone-800">{acct.name}</Text>
                  <Text className="mt-0.5 text-xs text-stone-500" numberOfLines={1}>
                    {acct.role} · {acct.email}
                  </Text>
                </View>
                <Text className="text-xs font-semibold text-emerald-700">Sign in →</Text>
              </Pressable>
            ))}
          </View>
          <Text className="mt-4 text-center text-[11px] leading-4 text-stone-400">
            Sessions persist on this device until you sign out ✦
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
