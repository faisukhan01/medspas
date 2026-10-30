import { Pressable, Text, View } from "react-native";
import { Clock } from "lucide-react-native";
import { PriceTag } from "./PriceTag";
import type { Service } from "@/lib/types";

interface ServiceCardProps {
  service: Service;
  /** Branch currency for the price tag (defaults to the service's own). */
  currency?: string;
  onPress?: (service: Service) => void;
  /** Width for grid layouts (e.g. "48%"). */
  width?: `${number}%`;
}

/** Emoji tile + name + duration + price. Used in grids and lists. */
export function ServiceCard({ service, currency, onPress, width = "100%" }: ServiceCardProps) {
  const cur = currency ?? service.currency ?? "USD";
  return (
    <Pressable
      onPress={() => onPress?.(service)}
      className={`mb-3 rounded-2xl border border-stone-100 bg-white p-4 active:opacity-80`}
      style={{ width }}
    >
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
        <Text className="text-2xl">{service.emoji}</Text>
      </View>
      <Text className="text-[15px] font-semibold leading-5 text-stone-900" numberOfLines={2}>
        {service.name}
      </Text>
      <View className="mt-1 flex-row items-center">
        <Clock size={12} color="#a8a29e" />
        <Text className="ml-1 text-xs text-stone-500">{service.durationMin} min</Text>
      </View>
      <View className="mt-2.5 flex-row items-center justify-between">
        <PriceTag amountUsd={service.price} currency={cur} size="sm" />
        {service.requiresConsultation && (
          <View className="rounded-full bg-amber-50 px-2 py-0.5">
            <Text className="text-[10px] font-semibold text-amber-700">Free consult</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
