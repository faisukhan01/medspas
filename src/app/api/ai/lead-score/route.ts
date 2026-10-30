import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * AI LEAD SCORING — Engagement Agent brain.
 * Returns {score 0-100, tier, reasoning, recommendedAction, suggestedMessage}.
 * Heuristic baseline blended with LLM judgement; degrades to heuristic on failure.
 */
export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON body");

  const lead = {
    name: String(body.name ?? "Unknown"),
    source: String(body.source ?? "WEBSITE"),
    interest: String(body.interest ?? "general enquiry"),
    estimatedValue: Number(body.estimatedValue) || 0,
    status: String(body.status ?? "NEW"),
  };

  // ── heuristic baseline ────────────────────────────────────────────────────
  let score = 40;
  if (lead.source === "REFERRAL") score += 25;
  else if (lead.source === "AI_AGENT") score += 15;
  else if (lead.source === "INSTAGRAM" || lead.source === "GOOGLE_ADS") score += 10;
  else if (lead.source === "PRINT") score += 0;
  else score += 7;
  if (lead.estimatedValue >= 1500) score += 20;
  else if (lead.estimatedValue >= 700) score += 12;
  else if (lead.estimatedValue >= 300) score += 6;
  if (/botox|filler|laser|morpheus/i.test(lead.interest)) score += 8;
  if (lead.status !== "NEW") score += 5;
  score = Math.min(100, score);

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: `You are the Auralis Engagement Agent scoring medspa leads. Respond with ONLY valid JSON: {"score": <0-100 int>, "tier": "HOT"|"WARM"|"COOL", "reasoning": "<max 30 words>", "recommendedAction": "<max 20 words>", "suggestedMessage": "<one SMS-style opener, max 200 chars>"}. Score higher for: referrals, high value, premium treatment interest (injectables/Morpheus8), fast-moving language. Penalise: price-shoppers with low value, vague interest.` },
        { role: "user", content: JSON.stringify(lead) },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      const blended = Math.round((Number(parsed.score) || score) * 0.7 + score * 0.3);
      const result = { ...parsed, score: Math.min(100, blended) };
      await db.aiInteraction.create({ data: { tenantId, agent: "ENGAGEMENT", input: `score: ${lead.name}`, output: JSON.stringify(result), tokensUsed: 0 } });
      return NextResponse.json({ ...result, blended: true });
    }
    throw new Error("no JSON in response");
  } catch {
    const tier = score >= 75 ? "HOT" : score >= 55 ? "WARM" : "COOL";
    return NextResponse.json({
      score, tier,
      reasoning: "Heuristic score from source, value and treatment interest.",
      recommendedAction: tier === "HOT" ? "Call within 5 minutes" : "Send follow-up SMS today",
      suggestedMessage: `Hi ${lead.name.split(" ")[0]}! Thanks for your interest in ${lead.interest} at Auralis ✦ I've reserved a free consultation slot this week — shall I hold it for you?`,
      fallback: true,
    });
  }
});
