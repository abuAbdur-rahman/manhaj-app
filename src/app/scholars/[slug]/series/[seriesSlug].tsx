import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
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
      <SafeAreaView className="flex-1 bg-sand-50">
        <View className="gap-3 p-6">
          <AudioCardSkeleton />
          <AudioCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }
  if (q.isError || !q.data) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50">
        <ErrorState message={q.isError ? "Failed to load series" : "Series not found"} onRetry={() => q.refetch()} />
      </SafeAreaView>
    );
  }

  const { series, episodes } = q.data;

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <ScrollView contentContainerClassName="gap-6 pb-10" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View className="gap-2 bg-white px-6 py-6 border-b border-sand-200">
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-forest-600">{series.scholar?.name}</Text>
          <Text className="text-xl font-bold text-ink">{series.title}</Text>
          {series.description ? <Text className="text-sm leading-5 text-ink-600">{series.description}</Text> : null}
          <Text className="text-xs text-ink-400">{episodes.length} lectures</Text>
        </View>
        <View className="gap-3 px-6">
          {!episodes.length ? (
            <EmptyState title="No lectures in this series" />
          ) : (
            episodes.map((e, i) => <AudioCard key={e.id} episode={e} number={i + 1} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
