import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AudioCard, AudioCardSkeleton } from "@/components/audio-card";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { useSeriesWithEpisodes } from "@/hooks/useManhajQueries";

export default function SeriesDetailScreen() {
  const { slug, seriesSlug } = useLocalSearchParams<{ slug: string; seriesSlug: string }>();
  const q = useSeriesWithEpisodes(slug ?? "", seriesSlug ?? "");
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  if (q.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink">
        <View className="gap-3 p-6">
          <AudioCardSkeleton />
          <AudioCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }
  if (q.isError || !q.data) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink">
        <ErrorState message={q.isError ? "Failed to load series" : "Series not found"} onRetry={() => q.refetch()} />
      </SafeAreaView>
    );
  }

  const { series, episodes } = q.data;

  return (
    <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink">
      <FlatList
        data={episodes}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerClassName="pb-10"
        ListHeaderComponent={
          <View className="gap-2 bg-white dark:bg-ink-800 px-6 py-6 border-b border-sand-200 dark:border-ink-800 mb-6">
            <Text className="text-xs font-semibold uppercase tracking-widest text-forest-600 dark:text-forest-400">{series.scholar?.name}</Text>
            <Text className="text-xl font-bold text-ink dark:text-white">{series.title}</Text>
            {series.description ? <Text className="text-sm leading-5 text-ink-600 dark:text-ink-300">{series.description}</Text> : null}
            <Text className="text-xs text-ink-400 dark:text-ink-500">{episodes.length} lectures</Text>
          </View>
        }
        ListEmptyComponent={<View className="px-6"><EmptyState title="No lectures in this series" /></View>}
        renderItem={({ item, index }) => <View className="px-6"><AudioCard episode={item} number={index + 1} /></View>}
        ItemSeparatorComponent={() => <View className="h-3" />}
      />
    </SafeAreaView>
  );
}
