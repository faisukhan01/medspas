import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * AI FRONT DESK AGENT — 24/7 concierge with real business context.
 * Injects live availability + services + policies into the system prompt so
 * answers are grounded in actual data, not hallucination.
 */
export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  const history: { role: "user" | "assistant"; content: string }[] = Array.isArray(body.history)
    ? body.history.slice(-8)
    : [];
  if (!message) return bad("message is required");

  // ── Grounding context ────────────────────────────────────────────────────
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const [branches, services, upcoming] = await Promise.all([
    db.branch.findMany({ where: { tenantId, isActive: true }, select: { name: true, city: true, country: true, openTime: true, closeTime: true, phone: true } }),
    db.service.findMany({ where: { tenantId, isActive: true }, select: { name: true, price: true, durationMin: true, category: true, currency: true } }),
    db.appointment.findMany({
      where: { tenantId, startsAt: { gte: now, lte: in7 }, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { startsAt: true, branchId: true, provider: { select: { name: true } }, service: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
      take: 40,
    }),
  ]);

  const availabilitySummary = upcoming
    .slice(0, 20)
    .map((a) => `${a.startsAt.toISOString().slice(0, 16).replace("T", " ")} — ${a.service.name} with ${a.provider.name}`)
    .join("\n");

  const serviceList = services
    .slice(0, 18)
    .map((s) => `${s.name} (${s.category}) — ${s.currency === "GBP" ? "£" : "$"}${s.price}, ${s.durationMin}min`)
    .join("\n");

  const branchList = branches.map((b) => `${b.name} — ${b.city}, ${b.country} · open ${b.openTime}-${b.closeTime} · ${b.phone}`).join("\n");

  const systemPrompt = `You are "Aura", the AI Front Desk agent for Auralis Aesthetics Group — a premium medspa group with locations in the US and UK.

TODAY IS ${now.toISOString().slice(0, 10)} (${now.toLocaleDateString("en-US", { weekday: "long" })}).

YOUR LOCATIONS:
${branchList}

TREATMENT MENU (with prices & duration):
${serviceList}

SAMPLE UPCOMING AVAILABILITY (next 7 days, already-booked and open slots mixed):
${availabilitySummary || "Calendar is open — offer to check specific times."}

HOUSE RULES:
- You are warm, polished and concise (max 90 words per reply). You may use tasteful emoji (✦ 💧 ✨) sparingly.
- You CAN: answer treatment/pricing questions using the menu, suggest slots, describe aftercare, explain deposits & the 24h cancellation policy, offer to book (ask for: name, treatment, location, day/time preference), and hand off to human staff for clinical advice or complaints.
- You CANNOT: give medical diagnoses, discuss another patient's records, or promise results.
- Deposits: treatments over $300/£240 require a deposit. Online booking is 24/7; AI books directly.
- If asked for a slot, suggest 2 concrete options (e.g., "Tuesday 10:00 or Wednesday 14:30") based on the availability above, and confirm the branch.
- Always end with ONE clear next step (a question).`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
      thinking: { type: "disabled" },
    });
    const reply = completion.choices[0]?.message?.content ?? "I'm sorry — could you rephrase that? ✦";

    await db.aiInteraction.create({ data: { tenantId, agent: "FRONT_DESK", input: message, output: reply, meta: JSON.stringify({ historyTurns: history.length }) } });
    return NextResponse.json({ reply, agent: "FRONT_DESK" });
  } catch (err) {
    console.error("[ai/chat] LLM failed:", err);
    // Graceful degradation — rule-based concierge
    const q = message.toLowerCase();
    const reply = q.includes("price") || q.includes("cost")
      ? `Our most-loved treatments: HydraFacial Signature $220 · Botox 3 areas $380 · Laser hair removal from $180 ✦ Shall I send the full menu or help you book a free consultation?`
      : q.includes("book") || q.includes("appointment")
        ? "I'd love to get you booked ✦ Which treatment are you thinking about, and do you prefer our Beverly Hills, Manhattan, Mayfair or Manchester clinic?"
        : q.includes("hour") || q.includes("open")
          ? "We're open Mon–Sat; US clinics 9:00–18:00 and UK clinics 9:30–18:30 local time. Would you like me to check specific availability?"
          : "Happy to help! I can book treatments, share pricing, or answer aftercare questions — what do you need? ✦";
    return NextResponse.json({ reply, agent: "FRONT_DESK", fallback: true });
  }
});
