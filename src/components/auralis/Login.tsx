"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, LockKeyhole, Sparkles, Stethoscope, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { post } from "./client";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/constants";
import { useApp, type BootData, type SafeUser } from "./store";

export default function Login({ onBack }: { onBack: () => void }) {
  const { setStage, setBoot } = useApp();
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doLogin(em: string, pw: string) {
    setBusy(true);
    setError(null);
    try {
      await post<{ user: SafeUser }>("/api/auth/login", { email: em, password: pw });
      const boot = await fetch("/api/bootstrap", { cache: "no-store" }).then((r) => r.json() as Promise<BootData>);
      setBoot(boot);
      setStage("app");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#faf9f7]">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-emerald-950 text-white flex-col justify-between p-10">
        <div className="absolute inset-0 opacity-40" style={{
          background: "radial-gradient(700px 400px at 90% 10%, rgba(217,119,6,0.35), transparent 60%), radial-gradient(600px 500px at 10% 90%, rgba(16,185,129,0.25), transparent 55%)",
        }} />
        <div className="relative">
          <button onClick={onBack} className="flex items-center gap-2 text-lg font-display font-semibold tracking-tight">
            <span className="text-amber-400">✦</span> Auralis
          </button>
        </div>
        <div className="relative space-y-6">
          <motion.blockquote
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="font-display text-2xl xl:text-3xl leading-snug"
          >
            “We replaced five tools with one. The AI front desk books while we sleep —
            revenue is up 31% this quarter.”
          </motion.blockquote>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-amber-500/20 text-amber-300 grid place-items-center font-semibold">AO</div>
            <div>
              <p className="text-sm font-medium">Amara Okafor</p>
              <p className="text-xs text-emerald-200/80">Founder, Auralis Aesthetics Group — LA · NYC · London · Manchester</p>
            </div>
          </div>
        </div>
        <div className="relative flex items-center gap-6 text-xs text-emerald-200/80">
          <span className="flex items-center gap-1.5"><Users className="size-3.5" /> 26 patients seeded</span>
          <span className="flex items-center gap-1.5"><Stethoscope className="size-3.5" /> 11 staff</span>
          <span className="flex items-center gap-1.5"><Sparkles className="size-3.5" /> 5 AI agents</span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          <button onClick={onBack} className="lg:hidden flex items-center gap-2 text-lg font-display font-semibold mb-8">
            <span className="text-emerald-700">✦</span> Auralis
          </button>
          <h1 className="font-display text-3xl font-semibold text-stone-900">Welcome back</h1>
          <p className="text-sm text-stone-500 mt-2">
            Sign in to the MedSpa OS. Demo password: <code className="bg-stone-100 rounded px-1.5 py-0.5 text-xs">demo1234</code>
          </p>

          <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); doLogin(email, password); }}>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-white" placeholder="you@clinic.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-white" required />
            </div>
            {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
              Sign in
            </Button>
          </form>

          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400 mb-3">One-click demo personas</p>
            <div className="grid gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  disabled={busy}
                  onClick={() => doLogin(acc.email, DEMO_PASSWORD)}
                  className="group flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-left hover:border-emerald-600/40 hover:shadow-sm transition-all disabled:opacity-50"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-800">{acc.name}</p>
                    <p className="text-xs text-stone-500">{acc.role}</p>
                  </div>
                  <ArrowRight className="size-4 text-stone-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
