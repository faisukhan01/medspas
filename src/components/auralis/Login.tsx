"use client";

// ── Sign in — cinematic, minimal ────────────────────────────────────────────
// Full-bleed spa imagery + one frosted card. The default view asks for a
// single tap (pick a persona); the email form stays collapsed behind a
// single quiet link so the screen carries almost no data.

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CalendarDays, ChevronDown, Crown, Loader2,
  Megaphone, ShieldCheck, Stethoscope,
} from "lucide-react";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/constants";
import { post } from "./client";
import HeroSlider from "./HeroSlider";
import { useApp, type BootData, type SafeUser } from "./store";

const PERSONA_ICONS = [Crown, ShieldCheck, CalendarDays, Stethoscope, Megaphone];

export default function Login({ onBack }: { onBack: () => void }) {
  const { setStage, setBoot } = useApp();
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function doLogin(em: string, pw: string, key = "form") {
    setBusy(key);
    setError(null);
    try {
      await post<{ user: SafeUser }>("/api/auth/login", { email: em, password: pw });
      const boot = await fetch("/api/bootstrap", { cache: "no-store" }).then((r) => r.json() as Promise<BootData>);
      setBoot(boot);
      setStage("app");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-stone-950">
      <HeroSlider showDots={false} interval={7000} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-8 h-16">
        <button onClick={onBack} className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight text-white">
          <span className="text-amber-400 text-xl leading-none">✦</span> Auralis
        </button>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-3.5 py-1.5 text-xs text-white/80 hover:bg-white/15 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to site
        </button>
      </div>

      {/* Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm rounded-3xl border border-white/15 bg-stone-950/55 backdrop-blur-2xl shadow-2xl shadow-black/40 p-7"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">MedSpa OS</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">Welcome back.</h1>
          <p className="mt-1.5 text-sm text-white/60">Tap a persona — the demo fills everything else for you.</p>

          {/* One-tap personas */}
          <div className="mt-6 space-y-2">
            {DEMO_ACCOUNTS.map((acc, i) => {
              const PersonaIcon = PERSONA_ICONS[i] ?? Crown;
              const loading = busy === acc.email;
              return (
                <button
                  key={acc.email}
                  disabled={busy !== null}
                  onClick={() => doLogin(acc.email, DEMO_PASSWORD, acc.email)}
                  className="group w-full flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-3.5 py-2.5 text-left transition-all hover:bg-white/[0.14] hover:border-amber-400/40 disabled:opacity-50"
                >
                  <span className="size-9 shrink-0 rounded-xl bg-amber-400/15 text-amber-300 grid place-items-center group-hover:scale-105 transition-transform">
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <PersonaIcon className="size-4" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-white truncate">{acc.name}</span>
                    <span className="block text-[11px] text-white/50 truncate">{acc.role}</span>
                  </span>
                  <ArrowRight className="size-4 text-white/25 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>

          {/* Quiet manual sign-in */}
          <button
            onClick={() => setShowForm((v) => !v)}
            className="mt-5 mx-auto flex items-center gap-1 text-[11px] text-white/45 hover:text-white/80 transition-colors"
          >
            {showForm ? "Hide" : "Prefer to"} sign in with email
            <ChevronDown className={`size-3.5 transition-transform ${showForm ? "rotate-180" : ""}`} />
          </button>

          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
              onSubmit={(e) => { e.preventDefault(); doLogin(email, password); }}
            >
              <div className="pt-5 space-y-3">
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.com" aria-label="Work email"
                  className="w-full h-11 rounded-xl border border-white/15 bg-white/[0.07] px-4 text-sm text-white placeholder-white/35 outline-none focus:border-amber-400/60 focus:bg-white/[0.1] transition-colors"
                />
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password" aria-label="Password"
                  className="w-full h-11 rounded-xl border border-white/15 bg-white/[0.07] px-4 text-sm text-white placeholder-white/35 outline-none focus:border-amber-400/60 focus:bg-white/[0.1] transition-colors"
                />
                {error && (
                  <p className="text-xs text-rose-200 bg-rose-500/15 border border-rose-300/25 rounded-xl px-3 py-2">{error}</p>
                )}
                <button
                  type="submit" disabled={busy !== null}
                  className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {busy === "form" ? <Loader2 className="size-4 animate-spin" /> : null} Sign in
                </button>
              </div>
            </motion.form>
          )}

          {error && !showForm && (
            <p className="mt-4 text-xs text-rose-200 bg-rose-500/15 border border-rose-300/25 rounded-xl px-3 py-2">{error}</p>
          )}
        </motion.div>
      </div>

      <p className="relative z-10 pb-5 text-center text-[11px] text-white/40">
        Demo environment — every patient, invoice and photo is 100% fictional.
      </p>
    </div>
  );
}
