"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, BarChart3, Bot, CalendarDays, Check, CreditCard, Filter, Globe2,
  LayoutDashboard, MapPin, Megaphone, Minus, Package, PhoneCall, ShieldCheck,
  Sparkles, Star, Stethoscope, Users, X, Zap, Heart, CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AI_AGENTS } from "@/lib/constants";
import HeroSlider from "./HeroSlider";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55 },
};

const MODULES = [
  { icon: LayoutDashboard, name: "Command Dashboard", desc: "Revenue, occupancy, retention & lead conversion — live across every branch." },
  { icon: CalendarDays, name: "Smart Scheduling", desc: "Multi-provider calendar with rooms, deposits, waitlists and conflict prevention." },
  { icon: Users, name: "Patient CRM & EMR", desc: "Medical history, allergies, consents, treatment records and before/after photos." },
  { icon: Filter, name: "Lead Pipeline", desc: "Kanban from capture to conversion with AI scoring and speed-to-lead automation." },
  { icon: Sparkles, name: "AI Growth Center", desc: "Five specialised agents for discovery, front desk, booking, engagement and loyalty." },
  { icon: Megaphone, name: "Marketing Hub", desc: "SMS & email campaigns, segments, review management and referral tracking." },
  { icon: CreditCard, name: "Payments & POS", desc: "Invoices, deposits, refunds, memberships, packages and gift cards — USD & GBP." },
  { icon: Package, name: "Inventory", desc: "Lot & expiry tracking, low-stock alerts, suppliers and purchase orders." },
  { icon: Stethoscope, name: "Staff & Commissions", desc: "Provider profiles, schedules, performance and commission analytics." },
  { icon: MapPin, name: "Multi-Location", desc: "Centralised records with per-branch pricing, VAT/sales tax and timezones." },
  { icon: BarChart3, name: "Analytics", desc: "Retention, no-show trends, marketing ROI and branch benchmarking." },
  { icon: ShieldCheck, name: "Compliance", desc: "Role-based access, audit logs and HIPAA / UK GDPR aware data handling." },
];

const COMPARISON: { feature: string; us: boolean; pn: boolean; ze: boolean; zo: boolean; bl: boolean }[] = [
  { feature: "Booking + deposits + waitlists", us: true, pn: true, ze: true, zo: false, bl: true },
  { feature: "Patient EMR + consent forms", us: true, pn: true, ze: true, zo: false, bl: false },
  { feature: "Lead pipeline with AI scoring", us: true, pn: false, ze: false, zo: true, bl: false },
  { feature: "AI front desk & booking agents", us: true, pn: false, ze: false, zo: true, bl: false },
  { feature: "Native US + UK (multi-currency, VAT)", us: true, pn: false, ze: false, zo: false, bl: false },
  { feature: "Marketing automation built-in", us: true, pn: true, ze: true, zo: true, bl: false },
  { feature: "Staff + patient mobile apps", us: true, pn: true, ze: true, zo: false, bl: true },
  { feature: "Inventory with lot & expiry tracking", us: true, pn: true, ze: true, zo: false, bl: false },
];

function Tick({ ok }: { ok: boolean }) {
  return ok ? <Check className="size-4 text-emerald-600 mx-auto" /> : <X className="size-3.5 text-stone-300 mx-auto" />;
}

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const [currency, setCurrency] = useState<"USD" | "GBP">("USD");
  const gbp = currency === "GBP";
  const price = (usd: number, g: number) => (gbp ? `£${g}` : `$${usd}`);

  return (
    <div className="min-h-screen flex flex-col auralis-hero-bg">
      {/* Nav — dark glass over the cinematic hero */}
      <header className="fixed top-0 inset-x-0 z-40 border-b border-white/10 bg-stone-950/45 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/icon-preview.png" alt="Auralis app icon" className="size-9 rounded-xl ring-1 ring-white/25 object-cover" />
            <span className="font-display text-lg font-semibold tracking-[0.2em] text-white">AURALIS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#platform" className="hover:text-amber-300 transition-colors">Platform</a>
            <a href="#agents" className="hover:text-amber-300 transition-colors">AI Agents</a>
            <a href="#compare" className="hover:text-amber-300 transition-colors">Why us</a>
            <a href="#pricing" className="hover:text-amber-300 transition-colors">Pricing</a>
          </nav>
          <Button onClick={onEnter} className="bg-white hover:bg-stone-100 text-stone-900 rounded-full px-5">
            Open Live Demo <ArrowRight className="size-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — full-bleed cinematic slider */}
        <section className="relative min-h-[100svh] flex items-center justify-center">
          <HeroSlider />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-24 md:pt-32 md:pb-28 text-center">
            <motion.div {...fadeUp} transition={{ duration: 0.55 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-white/90">
                <Globe2 className="size-3.5 text-amber-400" /> Built for MedSpas in the USA & United Kingdom
              </span>
            </motion.div>
            <motion.h1 {...fadeUp} transition={{ duration: 0.6, delay: 0.08 }} className="mt-6 font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white leading-[1.05] [text-shadow:0_2px_30px_rgba(0,0,0,0.35)]">
              The Operating System<br />for Modern <span className="italic text-gold-gradient-light">MedSpas</span>
            </motion.h1>
            <motion.p {...fadeUp} transition={{ duration: 0.6, delay: 0.16 }} className="mt-6 text-lg text-white/75 max-w-2xl mx-auto [text-shadow:0_1px_18px_rgba(0,0,0,0.4)]">
              Bookings, clinical records, lead pipelines, AI growth agents, payments and analytics —
              one elegant platform running every chair, injector and location.
            </motion.p>
            <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.24 }} className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={onEnter} size="lg" className="h-12 px-8 rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold text-base shadow-xl shadow-amber-900/25">
                Launch the Live Demo <ArrowRight className="size-4" />
              </Button>
              <a href="#agents" className="h-12 px-8 rounded-full inline-flex items-center gap-2 border border-white/25 bg-white/5 backdrop-blur-md text-white/90 hover:bg-white/15 transition-colors">
                <Bot className="size-4 text-amber-400" /> Meet the AI agents
              </a>
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.32 }} className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto">
              {[
                { v: "34", l: "data models" },
                { v: "5", l: "AI growth agents" },
                { v: "4", l: "demo locations" },
                { v: "2", l: "countries · $ + £" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-4 py-5">
                  <p className="font-display text-3xl font-semibold text-amber-300">{s.v}</p>
                  <p className="text-xs text-white/65 mt-1">{s.l}</p>
                </div>
              ))}
            </motion.div>
            <motion.p {...fadeUp} transition={{ duration: 0.6, delay: 0.4 }} className="mt-10 text-[11px] uppercase tracking-widest text-white/45">
              Research-informed by PatientNow · Zenoti · Zoca · Aesthetic Record · Boulevard
            </motion.p>
          </div>
        </section>

        {/* Modules */}
        <section id="platform" className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <motion.div {...fadeUp} className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">One platform · every module</p>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold text-stone-900">Everything a medspa runs on</h2>
            <p className="mt-4 text-stone-600 max-w-2xl mx-auto">Stop stitching five subscriptions together. Auralis unifies the front desk, the treatment room and the growth engine.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.map((m, i) => (
              <motion.div
                key={m.name}
                {...fadeUp}
                transition={{ duration: 0.45, delay: (i % 3) * 0.07 }}
                className="group rounded-2xl border border-stone-200/70 bg-white p-6 hover:shadow-lg hover:shadow-stone-200/60 hover:border-emerald-600/30 transition-all"
              >
                <div className="size-11 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center group-hover:scale-105 transition-transform">
                  <m.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold text-stone-900">{m.name}</h3>
                <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* AI Agents */}
        <section id="agents" className="bg-emerald-950 text-white py-24 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{
            background: "radial-gradient(800px 400px at 85% 0%, rgba(217,119,6,0.4), transparent 60%), radial-gradient(700px 500px at 0% 100%, rgba(16,185,129,0.3), transparent 55%)",
          }} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div {...fadeUp} className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Zoca-inspired · built-in</p>
              <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold">The AI Growth Center</h2>
              <p className="mt-4 text-emerald-100/80 max-w-2xl mx-auto">Five specialised agents work your marketing, phones, calendar, leads and retention around the clock — grounded in your real data.</p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {AI_AGENTS.map((a, i) => (
                <motion.div
                  key={a.id}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 hover:bg-white/10 transition-colors"
                >
                  <div className="size-10 rounded-xl grid place-items-center" style={{ backgroundColor: `${a.color}33`, color: "#6ee7b7" }}>
                    {a.id === "DISCOVERY" ? <Globe2 className="size-5" /> : a.id === "FRONT_DESK" ? <PhoneCall className="size-5" /> : a.id === "BOOKING" ? <CalendarCheck className="size-5" /> : a.id === "ENGAGEMENT" ? <Zap className="size-5" /> : <Heart className="size-5" />}
                  </div>
                  <h3 className="mt-4 font-semibold">{a.name}</h3>
                  <p className="mt-1 text-xs text-emerald-100/70 leading-relaxed">{a.tagline}</p>
                  <ul className="mt-3 space-y-1.5">
                    {a.skills.slice(0, 3).map((s) => (
                      <li key={s} className="flex items-center gap-1.5 text-[11px] text-emerald-100/80">
                        <Check className="size-3 text-amber-400" /> {s}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
            <motion.p {...fadeUp} className="mt-10 text-center text-sm text-emerald-100/70">
              Try the live <button onClick={onEnter} className="underline underline-offset-4 decoration-amber-400 hover:text-amber-300">AI Front Desk</button> — it answers with real availability from the demo database.
            </motion.p>
          </div>
        </section>

        {/* Comparison */}
        <section id="compare" className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
          <motion.div {...fadeUp} className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">The honest scorecard</p>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold text-stone-900">Why clinics switch to Auralis</h2>
            <p className="mt-4 text-stone-600">We studied the best platforms in the market — then closed every gap between them.</p>
          </motion.div>
          <motion.div {...fadeUp} className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/60">
                  <th className="text-left font-medium text-stone-500 px-5 py-3.5">Capability</th>
                  <th className="px-4 py-3.5 font-display font-semibold text-emerald-800">Auralis</th>
                  <th className="px-4 py-3.5 font-medium text-stone-400">PatientNow</th>
                  <th className="px-4 py-3.5 font-medium text-stone-400">Zenoti</th>
                  <th className="px-4 py-3.5 font-medium text-stone-400">Zoca</th>
                  <th className="px-4 py-3.5 font-medium text-stone-400">Boulevard</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature} className="border-b border-stone-100 last:border-0 hover:bg-emerald-50/40 transition-colors">
                    <td className="px-5 py-3 text-stone-700">{row.feature}</td>
                    <td className="px-4 py-3 bg-emerald-50/60"><Tick ok={row.us} /></td>
                    <td className="px-4 py-3"><Tick ok={row.pn} /></td>
                    <td className="px-4 py-3"><Tick ok={row.ze} /></td>
                    <td className="px-4 py-3"><Tick ok={row.zo} /></td>
                    <td className="px-4 py-3"><Tick ok={row.bl} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
          <p className="mt-4 text-center text-xs text-stone-400">
            Based on public feature documentation as of our Phase 0 research — see docs/RESEARCH.md in the repo.
          </p>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <motion.div {...fadeUp} className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Transparent pricing</p>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-semibold text-stone-900">Plans that scale with your chairs</h2>
            <div className="mt-6 inline-flex items-center rounded-full border border-stone-200 bg-white p-1 text-sm">
              {(["USD", "GBP"] as const).map((c) => (
                <button key={c} onClick={() => setCurrency(c)}
                  className={`px-4 py-1.5 rounded-full transition-colors ${currency === c ? "bg-emerald-700 text-white" : "text-stone-500 hover:text-stone-700"}`}>
                  {c === "USD" ? "🇺🇸 USD" : "🇬🇧 GBP"}
                </button>
              ))}
            </div>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: "Essential", usd: 249, g: 199, tag: "Single location", features: ["Up to 5 providers", "Booking + deposits + waitlists", "Patient CRM & consent forms", "Email & SMS campaigns", "Patient mobile app"] },
              { name: "Growth", usd: 549, g: 449, tag: "Most popular", featured: true, features: ["Up to 15 providers · 3 branches", "Everything in Essential", "AI Growth Center (all 5 agents)", "Lead pipeline + AI scoring", "Memberships, packages, gift cards", "Inventory + purchase orders"] },
              { name: "Enterprise", usd: 1149, g: 949, tag: "Multi-region groups", features: ["Unlimited providers & branches", "Everything in Growth", "Custom AI agent training", "Dedicated success manager", "SSO, audit exports & DPA"] },
            ].map((p, i) => (
              <motion.div
                key={p.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`relative rounded-3xl border p-7 ${p.featured ? "border-emerald-600/50 bg-emerald-950 text-white shadow-xl shadow-emerald-900/20" : "border-stone-200 bg-white"}`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-semibold text-amber-950">
                    MOST POPULAR
                  </span>
                )}
                <p className={`text-sm font-medium ${p.featured ? "text-emerald-200" : "text-stone-500"}`}>{p.tag}</p>
                <h3 className={`mt-1 font-display text-2xl font-semibold ${p.featured ? "text-white" : "text-stone-900"}`}>{p.name}</h3>
                <p className="mt-4">
                  <span className={`font-display text-4xl font-semibold ${p.featured ? "text-white" : "text-stone-900"}`}>
                    {p.name === "Enterprise" ? price(p.usd, p.g) : price(p.usd, p.g)}
                  </span>
                  <span className={`text-sm ${p.featured ? "text-emerald-200" : "text-stone-500"}`}>/month</span>
                </p>
                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${p.featured ? "text-emerald-50" : "text-stone-600"}`}>
                      <Check className={`size-4 mt-0.5 shrink-0 ${p.featured ? "text-amber-400" : "text-emerald-600"}`} /> {f}
                    </li>
                  ))}
                </ul>
                <Button onClick={onEnter}
                  className={`mt-7 w-full h-11 rounded-full ${p.featured ? "bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold" : "bg-emerald-700 hover:bg-emerald-800 text-white"}`}>
                  Start free trial
                </Button>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-stone-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-emerald-600" /> HIPAA & UK GDPR aware architecture</span>
            <span className="flex items-center gap-1.5"><Minus className="size-3.5 text-emerald-600" /> No lock-in — export anytime</span>
            <span className="flex items-center gap-1.5"><Star className="size-3.5 text-amber-500" /> 4.9/5 from demo clinics</span>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
          <motion.div {...fadeUp} className="relative overflow-hidden rounded-3xl bg-emerald-950 text-white px-8 py-14 md:px-16 text-center">
            <div className="absolute inset-0 opacity-40" style={{
              background: "radial-gradient(600px 300px at 80% 20%, rgba(217,119,6,0.35), transparent 60%), radial-gradient(500px 300px at 15% 90%, rgba(16,185,129,0.35), transparent 55%)",
            }} />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl font-semibold">Your medspa, fully orchestrated.</h2>
              <p className="mt-3 text-emerald-100/80 max-w-xl mx-auto">Explore the full platform with a seeded two-country dataset — 26 patients, 767 appointments and five AI agents ready to work.</p>
              <Button onClick={onEnter} size="lg" className="mt-8 h-12 px-10 rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold">
                Open the Live Demo <ArrowRight className="size-4" />
              </Button>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Sticky footer (min-h-screen wrapper + mt-auto keeps it pinned) */}
      <footer className="mt-auto border-t border-stone-200 bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-stone-500">
          <div className="flex items-center gap-2">
            <img src="/icon-preview.png" alt="" className="size-6 rounded-md object-cover" />
            <span className="font-display font-semibold tracking-[0.14em] text-stone-800">AURALIS</span>
            <span className="font-normal text-stone-400">— MedSpa OS</span>
          </div>
          <p className="text-xs">Demo data is 100% fictional. Verify BAAs & HIPAA eligibility before production use.</p>
          <div className="flex items-center gap-5 text-xs">
            <span>© {new Date().getFullYear()} Auralis</span>
            <a href="https://github.com/faisukhan01/medspas" target="_blank" rel="noreferrer" className="hover:text-emerald-700">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
