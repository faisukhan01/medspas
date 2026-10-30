import { Text } from "react-native";
import { money } from "@/lib/format";

interface PriceTagProps {
  /** USD-stored amount — converted to the given branch currency. */
  amountUsd: number;
  currency: string; // branch currency: "USD" | "GBP"
  size?: "sm" | "md" | "lg";
  tone?: "default" | "light" | "gold";
}

const SIZES: Record<NonNullable<PriceTagProps["size"]>, string> = {
  sm: "text-[13px]",
  md: "text-base",
  lg: "text-2xl",
};

const TONES: Record<NonNullable<PriceTagProps["tone"]>, string> = {
  default: "text-emerald-700",
  light: "text-white",
  gold: "text-amber-600",
};

/** Currency-aware price label (server's 0.79 GBP rate applied client-side). */
export function PriceTag({ amountUsd, currency, size = "md", tone = "default" }: PriceTagProps) {
  return (
    <Text className={`font-bold ${SIZES[size]} ${TONES[tone]}`} adjustsFontSizeToFit numberOfLines={1}>
      {money(amountUsd, currency)}
    </Text>
  );
}
