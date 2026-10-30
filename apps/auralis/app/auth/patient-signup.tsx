import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, TextInputProps, View } from "react-native";
import { Loader2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { usePatientSession } from "@/store/session";
import { ApiError } from "@/lib/api";
import { C, F } from "@/lib/theme";

const INPUT = {
  borderColor: "rgba(255,255,255,0.14)",
  backgroundColor: "rgba(255,255,255,0.06)",
} as const;

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: TextInputProps["keyboardType"];
  textContentType?: TextInputProps["textContentType"];
  autoCapitalize?: "none" | "words";
  editable?: boolean;
}

function Field({ label, value, onChangeText, placeholder, keyboardType = "default", textContentType, autoCapitalize = "words", editable = true }: FieldProps) {
  return (
    <View>
      <Text style={{ color: "rgba(250,250,249,0.5)", fontSize: 10.5, letterSpacing: 2.5, fontWeight: "600", marginBottom: 7 }}>
        {label.toUpperCase()}
      </Text>
      <View className="flex-row items-center rounded-2xl border px-4" style={INPUT}>
        <TextInput
          className="flex-1 py-3.5 text-[15px]"
          style={{ color: C.inkOnDark }}
          placeholder={placeholder}
          placeholderTextColor="#78716c"
          value={value}
          onChangeText={(t) => {
            onChangeText(t);
          }}
          keyboardType={keyboardType}
          textContentType={textContentType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
        />
      </View>
    </View>
  );
}

/** Patient self sign-up — four quiet fields, straight into the app. */
export default function PatientSignup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signup } = usePatientSession();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signup({ firstName, lastName, email, phone: phone || undefined });
      router.replace("/patient/(tabs)/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create your profile — please try again");
      setSubmitting(false);
    }
  };

  const ready = firstName.trim() && lastName.trim() && email.includes("@") && !submitting;

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: C.night }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: insets.top + 40,
        paddingBottom: insets.bottom + 24,
        justifyContent: "center",
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="items-center" style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 11, letterSpacing: 4, color: C.gold, fontWeight: "600" }}>
          JOIN AURALIS
        </Text>
        <Text className="mt-2 text-center" style={{ fontFamily: F.display, color: C.inkOnDark, fontSize: 32, lineHeight: 40 }}>
          Your beauty, orchestrated.
        </Text>
        <Text className="mt-2 text-center" style={{ color: C.mutedOnDark, fontSize: 13.5, lineHeight: 20 }}>
          Four flagship clinics. One elegant profile for treatments, bookings and rewards.
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View
          className="rounded-3xl border p-5"
          style={{
            borderColor: "rgba(255,255,255,0.14)",
            backgroundColor: "rgba(20,17,15,0.72)",
          }}
        >
          <View style={{ gap: 14 }}>
            <Field label="First name" value={firstName} onChangeText={(t) => { setFirstName(t); if (error) setError(null); }} placeholder="Ava" textContentType="givenName" />
            <Field label="Last name" value={lastName} onChangeText={(t) => { setLastName(t); if (error) setError(null); }} placeholder="Thompson" textContentType="familyName" />
            <Field label="Email" value={email} onChangeText={(t) => { setEmail(t); if (error) setError(null); }} placeholder="you@example.com" keyboardType="email-address" textContentType="emailAddress" autoCapitalize="none" />
            <Field label="Phone · optional" value={phone} onChangeText={(t) => { setPhone(t); if (error) setError(null); }} placeholder="+1 555 010 2030" keyboardType="phone-pad" textContentType="telephoneNumber" autoCapitalize="none" editable />
          </View>

          {error ? (
            <View className="mt-4 rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(225,29,72,0.35)", backgroundColor: "rgba(225,29,72,0.12)" }}>
              <Text style={{ color: "#fecdd3", fontSize: 13, lineHeight: 18 }}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => void create()}
            disabled={!ready}
            className="mt-5 items-center rounded-2xl py-4"
            style={{ backgroundColor: C.gold, opacity: ready ? 1 : 0.5 }}
          >
            <View className="flex-row items-center gap-2">
              {submitting ? <Loader2 size={16} color={C.night} /> : null}
              <Text style={{ color: C.night, fontSize: 15, fontWeight: "700" }}>
                {submitting ? "Creating…" : "Create my account"}
              </Text>
            </View>
          </Pressable>

          <Pressable onPress={() => router.back()} className="mt-4 items-center active:opacity-70">
            <Text style={{ color: C.mutedOnDark, fontSize: 13 }}>
              Already with us?{" "}
              <Text style={{ color: C.goldBright, fontWeight: "700" }}>Sign in</Text>
            </Text>
          </Pressable>
        </View>

        <Text className="mt-5 text-center" style={{ color: "rgba(250,250,249,0.38)", fontSize: 11, lineHeight: 16 }}>
          By continuing you agree to demo terms — this build stores{"\n"}demo-grade data only, everything is fictional ✦
        </Text>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}
