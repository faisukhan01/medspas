import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Loader2, Mail } from "lucide-react-native";
import { useRouter } from "expo-router";
import { usePatientSession } from "@/store/session";
import { ApiError } from "@/lib/api";
import { C, F } from "@/lib/theme";
import AuthShell from "@/components/AuthShell";

const INPUT = {
  borderColor: "rgba(255,255,255,0.14)",
  backgroundColor: "rgba(255,255,255,0.06)",
} as const;

const DEMO_EMAILS = [
  "ava.thompson@example.com",
  "poppy.hughes@example.com",
  "mia.rodriguez@example.com",
];

/** Patient entrance — one quiet field, no password in this demo build. */
export default function PatientLogin() {
  const router = useRouter();
  const { login, enterGuest } = usePatientSession();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (value: string) => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(value);
      router.replace("/patient/(tabs)/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed — please try again");
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Patient entrance"
      title="Welcome back."
      subtitle="Sign in with the email on your Auralis profile — no password needed in this demo."
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-row items-center rounded-2xl border px-4" style={INPUT}>
          <Mail size={18} color="#a8a29e" />
          <TextInput
            className="ml-3 flex-1 py-4 text-[15px]"
            style={{ color: C.inkOnDark }}
            placeholder="you@example.com"
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
            returnKeyType="go"
            onSubmitEditing={() => void signIn(email)}
            editable={!submitting}
          />
        </View>

        {error ? (
          <View className="mt-3 rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(225,29,72,0.35)", backgroundColor: "rgba(225,29,72,0.12)" }}>
            <Text style={{ color: "#fecdd3", fontSize: 13, lineHeight: 18 }}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => void signIn(email)}
          disabled={submitting || email.trim().length === 0}
          className="mt-5 items-center rounded-2xl py-4"
          style={{ backgroundColor: C.gold, opacity: submitting || email.trim().length === 0 ? 0.5 : 1 }}
        >
          <View className="flex-row items-center gap-2">
            {submitting ? <Loader2 size={16} color={C.night} /> : null}
            <Text style={{ color: C.night, fontSize: 15, fontWeight: "700" }}>
              {submitting ? "Signing in…" : "Continue"}
            </Text>
          </View>
        </Pressable>

        {/* Demo patients */}
        <View className="mt-6">
          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            <Text style={{ color: "rgba(250,250,249,0.4)", fontSize: 10, letterSpacing: 3, fontWeight: "600" }}>
              TRY A DEMO PATIENT
            </Text>
            <View className="h-px flex-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          </View>
          <View className="mt-3 gap-2">
            {DEMO_EMAILS.map((demo) => (
              <Pressable
                key={demo}
                onPress={() => {
                  setEmail(demo);
                  void signIn(demo);
                }}
                disabled={submitting}
                className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 active:opacity-75"
                style={{ opacity: submitting ? 0.5 : 1 }}
              >
                <Text style={{ color: C.inkOnDark, fontSize: 13 }}>{demo}</Text>
                <Text style={{ color: C.gold, fontSize: 12, fontWeight: "600" }}>Sign in →</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* New here / guest */}
        <View className="mt-6 items-center" style={{ gap: 10 }}>
          <Pressable onPress={() => router.push("/auth/patient-signup")} className="active:opacity-70">
            <Text style={{ color: C.mutedOnDark, fontSize: 13 }}>
              New here?{" "}
              <Text style={{ color: C.goldBright, fontWeight: "700" }}>Create your account</Text>
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              enterGuest();
              router.replace("/patient/(tabs)/home");
            }}
            className="active:opacity-70"
          >
            <Text style={{ color: "rgba(250,250,249,0.42)", fontSize: 12 }}>
              or <Text style={{ fontFamily: F.displayItalic }}>browse the menu</Text> as a guest
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </AuthShell>
  );
}
