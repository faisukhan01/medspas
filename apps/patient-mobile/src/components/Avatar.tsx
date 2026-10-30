import { Text, View } from "react-native";
import { initials } from "@/lib/format";

interface AvatarProps {
  name: string;
  color?: string | null;
  size?: number;
}

/** Initials circle tinted with the record's avatarColor. */
export function Avatar({ name, color = "#047857", size = 44 }: AvatarProps) {
  const fontSize = Math.round(size * 0.38);
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: color ?? "#047857" }}
    >
      <Text className="font-semibold text-white" style={{ fontSize }}>
        {initials(name)}
      </Text>
    </View>
  );
}
