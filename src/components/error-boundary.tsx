import { Component, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { logAppError } from "@/lib/logError";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
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
      <View className="flex-1 items-center justify-center gap-3 bg-sand-50 px-6 dark:bg-ink-950">
        <Text className="text-center text-base font-bold text-ink dark:text-ink-100">Something went wrong</Text>
        <Text className="text-center text-xs text-ink-500 dark:text-ink-400" numberOfLines={3}>
          An unexpected error occurred. Please try again.
        </Text>
        <Pressable
          onPress={() => this.setState({ hasError: false })}
          accessibilityRole="button"
          hitSlop={8}
          style={{ minHeight: 44, justifyContent: "center" }}
          className="rounded-full bg-forest-600 px-6 py-2.5 active:opacity-90 dark:bg-forest-500"
        >
          <Text className="text-sm font-semibold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }
}
