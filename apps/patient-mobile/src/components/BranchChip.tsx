import { Text, View } from "react-native";
import { flagFor } from "@/lib/format";
import type { Branch } from "@/lib/types";

interface BranchChipProps {
  branch: Pick<Branch, "name" | "country">;
  showFlag?: boolean;
  variant?: "soft" | "light";
}

/** Compact branch identity chip: 🇺🇸 Beverly Hills Flagship */
export function BranchChip({ branch, showFlag = true, variant = "soft" }: BranchChipProps) {
  const wrap = variant === "soft" ? "bg-stone-100" : "bg-white/15";
  const text = variant === "soft" ? "text-stone-700" : "text-white";
  return (
    <View className={`flex-row items-center self-start rounded-full px-2.5 py-1 ${wrap}`}>
      {showFlag && <Text className="mr-1 text-[11px]">{flagFor(branch.country)}</Text>}
      <Text className={`text-[11px] font-medium ${text}`} numberOfLines={1}>
        {branch.name}
      </Text>
    </View>
  );
}
