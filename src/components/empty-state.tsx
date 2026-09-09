import { Pressable, Text, View } from "react-native";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View className="items-center gap-2 py-12 px-6" accessibilityRole="text">
      <Text className="text-center text-base font-semibold text-ink dark:text-ink-100">{title}</Text>
      {description ? <Text className="text-center text-sm leading-5 text-ink-500 dark:text-ink-400">{description}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="items-center gap-3 py-10 px-6" accessibilityRole="alert">
      <Text className="text-center text-sm font-medium text-clay-600 dark:text-clay-400">{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          hitSlop={8}
          className="rounded-full bg-forest-700 px-5 py-3 active:opacity-80"
          style={{ minHeight: 48 }}
        >
          <Text className="text-sm font-semibold text-white">Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
