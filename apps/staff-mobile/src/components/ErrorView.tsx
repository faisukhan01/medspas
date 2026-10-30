import { Pressable, Text, View } from "react-native";

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
  full?: boolean;
}

export function ErrorView({ message, onRetry, full = false }: ErrorViewProps) {
  return (
    <View className={`items-center justify-center px-6 ${full ? "flex-1 bg-stone-50" : "py-16"}`}>
      <Text className="mb-3 text-4xl">⚠️</Text>
      <Text className="text-center text-base font-semibold text-stone-900">Something went wrong</Text>
      <Text className="mt-1.5 text-center text-sm leading-5 text-stone-500">{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          className="mt-5 rounded-full border border-emerald-700 px-6 py-2.5 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-emerald-700">Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
