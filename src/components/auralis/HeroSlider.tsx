"use client";

// ── Cinematic background slider ─────────────────────────────────────────────
// Crossfading Ken-Burns slides used behind the landing hero and the sign-in
// screen. Pure CSS transitions (see .auralis-slide in globals.css) — no heavy
// animation lib on this path, and it respects prefers-reduced-motion.

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const HERO_SLIDES = [
  { src: "/hero/slide-1.jpg", tag: "Mayfair · London", tone: "The flagship reception" },
  { src: "/hero/slide-2.jpg", tag: "Beverly Hills · LA", tone: "The luxury suite" },
  { src: "/hero/slide-3.jpg", tag: "Knightsbridge · London", tone: "The candle-lit room" },
  { src: "/hero/slide-4.jpg", tag: "Tribeca · NYC", tone: "The treatment studio" },
];

interface Props {
  /** interval between slides in ms */
  interval?: number;
  /** show the location tag chips (landing hero) */
  showTags?: boolean;
  /** show the dot indicators */
  showDots?: boolean;
  className?: string;
}

export default function HeroSlider({ interval = 6000, showTags = true, showDots = true, className }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), interval);
    return () => clearInterval(t);
  }, [interval]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-stone-950", className)} aria-hidden>
      {HERO_SLIDES.map((s, i) => (
        <div key={s.src} className={cn("auralis-slide", i === index && "is-active")}>
          <img src={s.src} alt="" draggable={false} />
        </div>
      ))}

      {/* legibility gradients — top nav scrim + centred vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/75 via-stone-950/25 to-stone-950/80" />
      <div className="absolute inset-0 [background:radial-gradient(120%_90%_at_50%_40%,transparent_40%,rgba(28,25,23,0.45)_100%)]" />

      {showTags && (
        <div className="absolute bottom-6 right-5 sm:right-8 hidden sm:flex items-center gap-2 rounded-full border border-white/20 bg-stone-950/40 backdrop-blur-md px-4 py-2">
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-medium tracking-wide text-white/85">
            {HERO_SLIDES[index].tone} — {HERO_SLIDES[index].tag}
          </span>
        </div>
      )}

      {showDots && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.src}
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === index ? "w-8 bg-amber-400" : "w-1.5 bg-white/35 hover:bg-white/60"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
