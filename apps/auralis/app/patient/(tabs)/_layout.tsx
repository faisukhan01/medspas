import { Tabs } from "expo-router";
import { CalendarCheck, CalendarPlus, Gem, Home as HomeIcon, MessageCircle } from "lucide-react-native";

const INACTIVE = "#a8a29e";
const ACTIVE = "#b45309";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: { backgroundColor: "#ffffff", borderTopColor: "#f5f5f4", borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        sceneStyle: { backgroundColor: "#fafaf9" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Home", tabBarIcon: ({ color }) => <HomeIcon size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="book"
        options={{ title: "Book", tabBarIcon: ({ color }) => <CalendarPlus size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="visits"
        options={{ title: "Visits", tabBarIcon: ({ color }) => <CalendarCheck size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="perks"
        options={{ title: "Perks", tabBarIcon: ({ color }) => <Gem size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="assistant"
        options={{ title: "AI Chat", tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} /> }}
      />
    </Tabs>
  );
}
