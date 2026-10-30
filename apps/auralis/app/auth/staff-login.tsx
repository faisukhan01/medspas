import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react-native";
import { useRouter } from "expo-router";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/constants";
import { useStaffSession } from "@/store/session";
import { ApiError } from "@/lib/api";
import { C, F } from "@/lib/theme";
import AuthShell from "@/components/AuthShell";

const INPUT = {
  borderColor: "rgba(255,255,255,0.14)",
  backgroundColor: "rgba(255,255,255,0.06)",
} as const;

/** Staff entrance — credentials only. No sign-up; accounts are provisioned
 *  by the clinic. One-tap demo personas stay for reviewers. */
export default function StaffLogin() {
  const router = useRouter();
  const { login } = useStaffSession();

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
      router.replace("/staff/(tabs)/today");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed — please try again");
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Team entrance"
      title="Welcome back."
      subtitle="Sign in with your clinic credentials to run the day — schedule, check-ins and patients."
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-row items-center rounded-2xl border px-4" style={INPUT}>
          <Mail size={18} color="#a8a29e" />
          <TextInput
            className="ml-3 flex-1 py-4 text-[15px]"
            style={{ color: C.inkOnDark }}
            placeholder="you@auralis.demo"
            placeholderTextColor="#78716c"
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

        <View className="mt-3 flex-row items-center rounded-2xl border px-4" style={INPUT}>
          <Lock size={18} color="#a8a29e" />
          <TextInput
            className="ml-3 flex-1 py-4 text-[15px]"
            style={{ color: C.inkOnDark }}
            placeholder="Password"
            placeholderTextColor="#78716c"
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
            {showPassword ? <EyeOff size={18} color="#a8a29e" /> : <Eye size={18} color="#a8a29e" />}
          </Pressable>
        </View>

        {error ? (
          <View className="mt-3 rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(225,29,72,0.35)", backgroundColor: "rgba(225,29,72,0.12)" }}>
            <Text style={{ color: "#fecdd3", fontSize: 13, lineHeight: 18 }}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => void signIn(email, password)}
          disabled={submitting || email.trim().length === 0 || password.length === 0}
          className="mt-5 items-center rounded-2xl py-4"
          style={{
            backgroundColor: C.gold,
            opacity: submitting || email.trim().length === 0 || password.length === 0 ? 0.5 : 1,
          }}
        >
          <View className="flex-row items-center gap-2">
            {submitting ? <Loader2 size={16} color={C.night} /> : null}
            <Text style={{ color: C.night, fontSize: 15, fontWeight: "700" }}>
              {submitting ? "Signing in…" : "Sign in"}
            </Text>
          </View>
        </Pressable>

        {/* Demo personas — one tap in */}
        <View className="mt-6">
          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            <Text style={{ color: "rgba(250,250,249,0.4)", fontSize: 10, letterSpacing: 3, fontWeight: "600" }}>
              DEMO PERSONAS · PW {DEMO_PASSWORD.toUpperCase()}
            </Text>
            <View className="h-px flex-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          </View>
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
                className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 active:opacity-75"
                style={{ opacity: submitting ? 0.5 : 1 }}
              >
                <View className="flex-1 pr-3">
                  <Text style={{ color: C.inkOnDark, fontSize: 13.5, fontWeight: "600" }}>{acct.name}</Text>
                  <Text numberOfLines={1} className="mt-0.5" style={{ color: C.mutedOnDark, fontSize: 11.5 }}>
                    {acct.role} · {acct.email}
                  </Text>
                </View>
                <Text style={{ color: C.gold, fontSize: 12, fontWeight: "600" }}>Sign in →</Text>
              </Pressable>
            ))}
          </View>
          <Text className="mt-4 text-center" style={{ color: "rgba(250,250,249,0.38)", fontSize: 11 }}>
            No staff sign-up — accounts are provisioned by your clinic ✦
          </Text>
        </View>
      </KeyboardAvoidingView>
    </AuthShell>
  );
}
