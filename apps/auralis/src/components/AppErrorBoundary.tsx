import { Component, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { C, F } from "@/lib/theme";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Last line of defence — any unexpected render error shows the branded
 *  fallback instead of an empty screen, with the message visible for support. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Console surfaces it in dev builds; the UI below keeps release builds usable.
    console.error("Auralis render error:", error, info?.componentStack ?? "");
  }

  private retry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: C.night, paddingHorizontal: 28 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
          <View className="items-center">
            <View className="h-16 w-16 items-center justify-center rounded-3xl border border-white/15 bg-white/10">
              <Text style={{ color: C.goldBright, fontSize: 26 }}>✦</Text>
            </View>
            <Text
              className="mt-5 text-center"
              style={{ fontFamily: F.display, color: C.inkOnDark, fontSize: 24, letterSpacing: 4 }}
            >
              Something went wrong
            </Text>
            <Text className="mt-2 text-center" style={{ color: C.mutedOnDark, fontSize: 13, lineHeight: 19 }}>
              Auralis hit an unexpected error. Tap retry — if it persists, reinstall the app.
            </Text>
          </View>

          {__DEV__ ? (
            <View className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <ScrollView style={{ maxHeight: 180 }}>
                <Text style={{ color: "#fecaca", fontSize: 11, lineHeight: 16 }}>
                  {error.message}
                  {"\n"}
                  {error.stack ?? ""}
                </Text>
              </ScrollView>
            </View>
          ) : null}

          <Pressable
            onPress={this.retry}
            className="mt-8 items-center rounded-2xl py-4 active:opacity-80"
            style={{ backgroundColor: C.gold }}
          >
            <Text style={{ color: C.night, fontSize: 15, fontWeight: "700" }}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}
