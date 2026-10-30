import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Send } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import type { ChatTurn, UiMessage } from "@/lib/types";

const QUICK_CHIPS = ["Book Botox", "Prices", "Opening hours"];

const WELCOME: UiMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi, I'm Aura — the Auralis front desk ✦ I can help with treatments, prices, opening hours and bookings. What can I do for you?",
};

let idCounter = 0;
const nextId = () => `m${++idCounter}`;

export default function Assistant() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<UiMessage>>(null);

  const [messages, setMessages] = useState<UiMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || sending) return;
      setInput("");
      setSending(true);

      const userMsg: UiMessage = { id: nextId(), role: "user", content: message };
      const history: ChatTurn[] = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .slice(-8)
        .map(({ role, content }) => ({ role, content }));

      setMessages((prev) => [...prev, userMsg]);

      try {
        const { reply } = await api.aiChat(message, history);
        setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: reply }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content:
              "I couldn't reach the clinic just now — check your connection and try again in a moment ✦",
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending]
  );

  useEffect(() => {
    // keep the newest bubble visible
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [messages]);

  const canSend = input.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-stone-50"
      style={{ paddingBottom: insets.bottom }}
    >
      {/* Header */}
      <View
        className="border-b border-stone-100 bg-white px-5 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="flex-row items-center">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-emerald-700">
            <Text className="text-lg text-amber-200">✦</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-bold text-stone-900">Aura</Text>
            <Text className="text-xs text-stone-500">
              {sending ? "typing…" : "AI concierge · always on"}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages (inverted) */}
      <FlatList
        ref={listRef}
        className="flex-1"
        data={[...messages].reverse()}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexGrow: 1 }}
        ListEmptyComponent={null}
        renderItem={({ item }) =>
          item.role === "assistant" ? (
            <View className="mb-3 flex-row items-end pr-8">
              <View className="mb-0.5 h-7 w-7 items-center justify-center rounded-full bg-emerald-700">
                <Text className="text-[11px] text-amber-200">✦</Text>
              </View>
              <View className="ml-2 rounded-2xl rounded-bl-md bg-white border border-stone-100 px-4 py-3">
                <Text className="text-[14px] leading-5 text-stone-800">{item.content}</Text>
              </View>
            </View>
          ) : (
            <View className="mb-3 flex-row justify-end pl-12">
              <View className="rounded-2xl rounded-br-md bg-emerald-700 px-4 py-3">
                <Text className="text-[14px] leading-5 text-white">{item.content}</Text>
              </View>
            </View>
          )
        }
      />

      {/* Quick chips */}
      <View className="flex-row flex-wrap px-4 pb-2" style={{ gap: 8 }}>
        {QUICK_CHIPS.map((chip) => (
          <Pressable
            key={chip}
            onPress={() => void send(chip)}
            disabled={sending}
            className={`rounded-full border border-stone-200 bg-white px-3.5 py-2 active:opacity-80 ${
              sending ? "opacity-50" : ""
            }`}
          >
            <Text className="text-[12px] font-semibold text-stone-600">{chip}</Text>
          </Pressable>
        ))}
      </View>

      {/* Composer */}
      <View className="flex-row items-center border-t border-stone-100 bg-white px-4 py-3" style={{ gap: 10 }}>
        <TextInput
          className="flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 py-3 text-[14px] text-stone-900"
          placeholder="Ask Aura anything…"
          placeholderTextColor="#a8a29e"
          value={input}
          onChangeText={setInput}
          multiline
          editable={!sending}
          onSubmitEditing={() => void send(input)}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => void send(input)}
          disabled={!canSend}
          className={`h-11 w-11 items-center justify-center rounded-full ${
            canSend ? "bg-emerald-700 active:opacity-85" : "bg-stone-200"
          }`}
        >
          <Send size={17} color={canSend ? "#ffffff" : "#a8a29e"} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
