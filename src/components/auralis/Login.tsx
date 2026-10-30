"use client";

// ── Sign in — "The Doors" editorial split screen ────────────────────────────
// Left: a candle-lit spa scene with a serif brand statement. Right: a quiet
// charcoal panel with one-tap personas; the email form stays folded away so
// the screen carries almost no data. Mobile stacks the two panels.

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CalendarDays, ChevronDown, Crown, Loader2,
  Megaphone, ShieldCheck, Stethoscope,
} from "lucide-react";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/constants";
import { post } from "./client";
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-stone-950">
      {/* ── Left panel — the scene ─────────────────────────────────────────── */}
      <div className="relative lg:w-[46%] shrink-0 h-52 sm:h-64 lg:h-auto overflow-hidden">
        <img src="/hero/slide-3.jpg" alt="Candle-lit relaxation room at an Auralis clinic" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-stone-950 via-stone-950/35 to-stone-950/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-stone-950/80 hidden lg:block" />

        {/* Brand — top left */}
        <button onClick={onBack} className="absolute top-5 left-5 sm:top-7 sm:left-8 flex items-center gap-3 group">
          <img src="/icon-preview.png" alt="" className="size-9 rounded-xl ring-1 ring-white/25 object-cover" />
          <span className="font-display text-lg font-semibold tracking-[0.22em] text-white group-hover:text-amber-200 transition-colors">
            AURALIS
          </span>
        </button>

        {/* Statement — bottom of the scene (desktop) */}
        <div className="hidden lg:block absolute bottom-12 left-8 right-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-400/90">The team entrance</p>
          <p className="mt-3 font-display text-3xl leading-snug text-white/95">
            “Every great visit begins<em className="text-amber-200/90"> behind the desk</em>.”
          </p>
          <div className="mt-5 flex items-center gap-3">
            <span className="h-px w-10 bg-amber-400/60" />
            <p className="text-xs text-white/50">Four clinics · two countries · one system</p>
          </div>
        </div>
      </div>

      {/* ── Right panel — the quiet form ───────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col">
        {/* soft gold aura */}
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(640px_420px_at_75%_0%,rgba(217,119,6,0.14),transparent_60%)]" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-5 sm:px-10 h-16">
          <button onClick={onBack} className="lg:invisible flex items-center gap-2.5 font-display text-lg font-semibold tracking-[0.22em] text-white">
            <img src="/icon-preview.png" alt="" className="size-8 rounded-lg ring-1 ring-white/25 object-cover" /> AURALIS
          </button>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Back to site
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex items-center px-5 sm:px-10 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md mx-auto lg:mx-0 lg:ml-14 xl:ml-20"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-400">MedSpa OS · Sign in</p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-white">
              Welcome <em className="text-gold-gradient-light">back</em>.
            </h1>
            <p className="mt-3 text-sm text-white/55">
              One tap on a persona — everything else fills itself.
            </p>

            {/* One-tap personas */}
            <div className="mt-8 space-y-2.5">
              {DEMO_ACCOUNTS.map((acc, i) => {
                const PersonaIcon = PERSONA_ICONS[i] ?? Crown;
                const loading = busy === acc.email;
                return (
                  <button
                    key={acc.email}
                    disabled={busy !== null}
                    onClick={() => doLogin(acc.email, DEMO_PASSWORD, acc.email)}
                    className="group w-full flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-left transition-all hover:bg-white/[0.09] hover:border-amber-400/45 disabled:opacity-50"
                  >
                    <span className="size-10 shrink-0 rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300 grid place-items-center group-hover:scale-105 transition-transform">
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <PersonaIcon className="size-4" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-white truncate">{acc.name}</span>
                      <span className="block text-[11px] text-white/45 truncate">{acc.role}</span>
                    </span>
                    <ArrowRight className="size-4 text-white/20 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>

            {/* Quiet manual sign-in */}
            <button
              onClick={() => setShowForm((v) => !v)}
              className="mt-6 flex items-center gap-1.5 text-xs text-white/40 hover:text-amber-200 transition-colors"
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
                    className="w-full h-12 rounded-xl border border-white/12 bg-white/[0.05] px-4 text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/60 focus:bg-white/[0.08] transition-colors"
                  />
                  <input
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password" aria-label="Password"
                    className="w-full h-12 rounded-xl border border-white/12 bg-white/[0.05] px-4 text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/60 focus:bg-white/[0.08] transition-colors"
                  />
                  {error && (
                    <p className="text-xs text-rose-200 bg-rose-500/12 border border-rose-300/25 rounded-xl px-3 py-2">{error}</p>
                  )}
                  <button
                    type="submit" disabled={busy !== null}
                    className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {busy === "form" ? <Loader2 className="size-4 animate-spin" /> : null} Sign in
                  </button>
                </div>
              </motion.form>
            )}

            {error && !showForm && (
              <p className="mt-5 text-xs text-rose-200 bg-rose-500/12 border border-rose-300/25 rounded-xl px-3 py-2">{error}</p>
            )}

            <p className="mt-8 text-[11px] leading-relaxed text-white/35">
              Demo environment — every patient, invoice and photo is 100% fictional.
              Sessions last 7 days.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
