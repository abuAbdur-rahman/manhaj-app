import { Component, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { logAppError } from "@/lib/logError";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logAppError({
      message: error.message,
      stack: `${error.stack ?? ""}\n${info.componentStack}`.slice(0, 4000),
      route: "app_root",
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-sand-50 px-6">
        <Text className="text-center text-base font-bold text-ink">Something went wrong</Text>
        <Text className="text-center text-xs text-ink-500" numberOfLines={3}>
          {this.state.message}
        </Text>
        <Pressable
          onPress={() => this.setState({ hasError: false, message: "" })}
          className="rounded-full bg-forest px-6 py-2.5"
        >
          <Text className="text-sm font-semibold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }
}
