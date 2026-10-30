"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { post } from "./client";
import { useApp } from "./store";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Do you have Botox slots this Saturday?",
  "How much is a HydraFacial?",
  "Where are your clinics?",
  "Do you offer laser hair removal in London?",
];

export default function Concierge() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm Aura ✦ — the Auralis AI front desk. I can check availability, share pricing and book treatments across all four clinics. How can I help?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    const next = [...messages, { role: "user" as const, content: msg }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await post<{ reply: string; fallback?: boolean }>("/api/ai/chat", {
        message: msg,
        history: next.slice(-8, -1).map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry — I'm having trouble reaching the clinic network. Try again in a moment ✦" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 rounded-3xl overflow-hidden border border-stone-200 bg-white shadow-2xl shadow-stone-300/50 flex flex-col"
      style={{ maxHeight: "min(600px, calc(100vh - 2rem))" }}
    >
      {/* header */}
      <div className="bg-emerald-950 text-white px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="size-9 rounded-full bg-amber-500/20 grid place-items-center">
          <Sparkles className="size-4 text-amber-400" />
        </div>
        <div className="flex-1 leading-tight">
          <p className="text-sm font-semibold">Aura — AI Front Desk</p>
          <p className="text-[11px] text-emerald-200/70">Online 24/7 · books from live availability</p>
        </div>
        <Button variant="ghost" size="icon" className="size-8 text-emerald-200 hover:bg-white/10 hover:text-white"
          onClick={() => useApp.getState().setConciergeOpen(false)}>
          <X className="size-4" />
        </Button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto auralis-scroll px-4 py-3 space-y-3 bg-[#faf9f7]">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              m.role === "user" ? "bg-emerald-700 text-white rounded-br-md" : "bg-white border border-stone-200 text-stone-700 rounded-bl-md"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="size-4 animate-spin text-emerald-600" />
            </div>
          </div>
        )}
      </div>

      {/* suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 bg-[#faf9f7]">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)}
              className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] text-emerald-800 hover:bg-emerald-50 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* input */}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-stone-100 p-3 flex items-center gap-2 bg-white shrink-0">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about treatments, prices, slots…"
          className="h-10 rounded-full bg-stone-50 border-stone-200" disabled={busy} />
        <Button type="submit" size="icon" disabled={busy || !input.trim()}
          className="size-10 rounded-full bg-emerald-700 hover:bg-emerald-800 shrink-0">
          <Send className="size-4" />
        </Button>
      </form>
    </motion.div>
  );
}
