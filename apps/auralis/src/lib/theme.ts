// ── Design tokens for the premium Auralis surfaces ──────────────────────────
// Dark-luxe onboarding: charcoal stone + champagne gold + Playfair Display.
export const C = {
  night: "#0c0a09", // stone-950
  nightSoft: "#1c1917", // stone-900
  gold: "#e3b76a", // champagne
  goldDeep: "#b45309", // amber-700
  goldBright: "#fcd34d", // amber-300
  line: "rgba(255,255,255,0.14)",
  glass: "rgba(255,255,255,0.06)",
  glassHover: "rgba(255,255,255,0.12)",
  inkOnDark: "#fafaf9",
  mutedOnDark: "rgba(250,250,249,0.55)",
} as const;

export const F = {
  display: "PlayfairDisplay_600SemiBold",
  displayBold: "PlayfairDisplay_700Bold",
  displayItalic: "PlayfairDisplay_500Medium_Italic",
} as const;

/** Uppercase micro-label style — the Auralis eyebrow. */
export const eyebrow = { fontSize: 11, letterSpacing: 4, color: C.gold, fontWeight: "600" as const };
