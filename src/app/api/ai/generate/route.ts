import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { route, bad, getTenantId } from "@/lib/api";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const AGENT_PROMPTS: Record<string, string> = {
  DISCOVERY: "You are the Auralis Discovery Agent — an expert medspa content marketer and local SEO specialist. You write scroll-stopping, compliant content (no medical claims, no before/after guarantees) that ranks locally and converts readers into consultation bookings.",
  ENGAGEMENT: "You are the Auralis Engagement Agent — a lead-nurturing copywriter. Your follow-ups feel personal, are under 60 words (SMS) or 150 words (email), always end with one clear call-to-action, and respect UK GDPR/US TCPA marketing-consent rules.",
  LOYALTY: "You are the Auralis Loyalty Agent — a patient-retention specialist. You write warm win-back, rebooking, birthday and membership campaigns that feel like a note from a favourite clinic, never spammy. Always include one concrete offer.",
};

const FORMAT_PROMPTS: Record<string, string> = {
  blog: "Write a blog post (500-700 words) with an H1, 3 H2 sections and a closing CTA to book a consultation.",
  email: "Write a marketing email: subject line (max 45 chars) then body (max 150 words) with one CTA.",
  sms: "Write ONE SMS (max 300 characters incl. opt-out 'Reply STOP to opt out.').",
  instagram: "Write an Instagram caption (max 120 words) with a hook first line and 8 relevant hashtags.",
  gbp: "Write a Google Business Profile post (max 200 words) promoting the offer with a CTA.",
};

/** AI content studio for the 5 growth agents (Discovery / Engagement / Loyalty). */
export const POST = route(async (req: NextRequest) => {
  const db = await getDb();
  const tenantId = await getTenantId(db);
  const body = await req.json().catch(() => ({}));
  const agent = AGENT_PROMPTS[body.agent] ? String(body.agent) : "DISCOVERY";
  const format = FORMAT_PROMPTS[body.format] ? String(body.format) : "email";
  const topic = String(body.topic ?? "").trim();
  const tone = String(body.tone ?? "warm and premium");
  const audience = String(body.audience ?? "existing and prospective medspa patients");
  if (!topic) return bad("topic is required");

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: `${AGENT_PROMPTS[agent]}\n\nFORMAT REQUIREMENTS: ${FORMAT_PROMPTS[format]}\nTone: ${tone}. Audience: ${audience}. Brand: Auralis Aesthetics Group (US + UK medspa, premium but approachable). Never invent statistics. Use {{first_name}} placeholders for personalisation where natural.` },
        { role: "user", content: `Create the content for this campaign/topic: "${topic}"` },
      ],
      thinking: { type: "disabled" },
    });
    const content = completion.choices[0]?.message?.content ?? "";
    if (!content) throw new Error("empty response");

    await db.aiInteraction.create({ data: { tenantId, agent, input: `[${format}] ${topic}`, output: content.slice(0, 2000), meta: JSON.stringify({ tone, audience, format }) } });
    return NextResponse.json({ content, agent, format });
  } catch (err) {
    console.error("[ai/generate] LLM failed:", err);
    const fallback = format === "sms"
      ? `Hi {{first_name}} ✦ ${topic} — this week only, enjoy 15% off. Reply BOOK and we'll find your slot. Reply STOP to opt out.`
      : `Subject: ✨ ${topic.slice(0, 42)}\n\nHi {{first_name}},\n\n${topic} — our team has reserved priority slots for you this week. Members save an extra 10%.\n\nBook your visit → {{booking_link}}\n\nThe Auralis Team ✦`;
    return NextResponse.json({ content: fallback, agent, format, fallback: true });
  }
});
