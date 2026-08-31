import { Text, View } from "react-native";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View className="items-center gap-2 py-12 px-6">
      <Text className="text-center text-base font-semibold text-ink">{title}</Text>
      {description ? <Text className="text-center text-sm leading-5 text-ink-500">{description}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="items-center gap-3 py-10 px-6">
      <Text className="text-center text-sm font-medium text-clay-700">{message}</Text>
      {onRetry ? (
        <Text onPress={onRetry} className="rounded-full bg-forest-700 px-4 py-2 text-sm font-semibold text-white">
          Retry
        </Text>
      ) : null}
    </View>
  );
}
