import { Link } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { EmptyState, ErrorState } from "@/components/empty-state";
import { useAllScholars } from "@/hooks/useManhajQueries";
import { formatCount } from "@/lib/format";

export default function ScholarsScreen() {
  const q = useAllScholars();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  if (q.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
        <View className="gap-3 p-6">
          <View className="h-20 rounded-2xl bg-sand-100 dark:bg-ink-800" />
          <View className="h-20 rounded-2xl bg-sand-100 dark:bg-ink-800" />
          <View className="h-20 rounded-2xl bg-sand-100 dark:bg-ink-800" />
        </View>
      </SafeAreaView>
    );
  }
  if (q.isError) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
        <ErrorState message="Failed to load scholars" onRetry={() => q.refetch()} />
      </SafeAreaView>
    );
  }
  if (!q.data?.length) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
        <EmptyState title="No scholars yet" description="Scholars will appear here once published." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
      <FlatList
        data={q.data}
        keyExtractor={(s) => s.id}
        contentContainerClassName="gap-3 p-6 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Link href={`/scholars/${item.slug}` as never} asChild>
            <Pressable accessibilityRole="button" hitSlop={8} style={{ minHeight: 48 }} className="flex-row items-center gap-4 rounded-2xl border border-sand-200 dark:border-ink-700 bg-white dark:bg-ink-800 p-4 active:opacity-80">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-forest-700">
                <Text className="text-lg font-bold text-white">{item.name[0]}</Text>
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold text-ink dark:text-white">{item.name}</Text>
                <Text className="text-xs text-ink-500 dark:text-ink-400">
                  {[
                    item.series_count !== undefined ? formatCount(item.series_count, "series", "series") : null,
                    item.episode_count !== undefined ? formatCount(item.episode_count, "lecture", "lectures") : null,
                  ].filter(Boolean).join(" · ") || "Active"}
                </Text>
                {item.languages?.length ? (
                  <View className="flex-row flex-wrap gap-1">
                    {item.languages.map((l) => (
                      <View key={l} className="rounded-full bg-forest-50 px-2 py-0.5 dark:bg-forest-900">
                        <Text className="text-[10px] font-semibold uppercase tracking-wide text-forest-700 dark:text-forest-100">{l}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#8da294" />
            </Pressable>
          </Link>
        )}
        ListHeaderComponent={
          <View className="mb-1 gap-1 pt-1">
            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600 dark:text-forest-100">Listen & learn</Text>
            <Text className="text-xl font-bold text-ink dark:text-ink-100">Scholars</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
