import { ActivityIndicator, Text, View } from "react-native";

interface LoadingViewProps {
  label?: string;
  full?: boolean;
}

export function LoadingView({ label = "Warming up the front desk…", full = false }: LoadingViewProps) {
  return (
    <View className={`items-center justify-center ${full ? "flex-1 bg-stone-50" : "py-16"}`}>
      <ActivityIndicator size="large" color="#047857" />
      <Text className="mt-3 text-sm text-stone-500">{label}</Text>
    </View>
  );
}
