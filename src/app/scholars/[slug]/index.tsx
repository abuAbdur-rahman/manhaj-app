import { Link, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AudioCard, AudioCardSkeleton } from "@/components/audio-card";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { useScholarBySlug, useScholarEpisodes, useScholarSeries } from "@/hooks/useManhajQueries";

export default function ScholarDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const scholarQ = useScholarBySlug(slug ?? "");
  const seriesQ = useScholarSeries(scholarQ.data?.id ?? "");
  const episodesQ = useScholarEpisodes(scholarQ.data?.id ?? "");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([scholarQ.refetch(), seriesQ.refetch(), episodesQ.refetch()]);
    setRefreshing(false);
  }, [scholarQ, seriesQ, episodesQ]);

  if (scholarQ.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50">
        <View className="h-32 bg-sand-100" />
      </SafeAreaView>
    );
  }
  if (scholarQ.isError || !scholarQ.data) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50">
        <ErrorState message={scholarQ.isError ? "Failed to load scholar" : "Scholar not found"} onRetry={() => scholarQ.refetch()} />
      </SafeAreaView>
    );
  }

  const scholar = scholarQ.data;

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <ScrollView contentContainerClassName="gap-6 pb-10" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View className="gap-3 bg-white px-6 py-6 border-b border-sand-200">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-forest-700">
            <Text className="text-xl font-bold text-white">{scholar.name[0]}</Text>
          </View>
          <Text className="text-xl font-bold text-ink">{scholar.name}</Text>
          {scholar.bio ? <Text className="text-sm leading-5 text-ink-600">{scholar.bio}</Text> : null}
          <Text className="text-xs text-ink-400">
            {scholar.series_count ?? 0} series · {scholar.episode_count ?? 0} lectures
          </Text>
        </View>

        <View className="gap-3 px-6">
          <Text className="text-sm font-semibold uppercase tracking-wide text-ink-400">Series</Text>
          {seriesQ.isPending ? (
            <View className="h-20 rounded-2xl bg-sand-100" />
          ) : seriesQ.isError ? (
            <ErrorState message="Failed to load series" onRetry={() => seriesQ.refetch()} />
          ) : !seriesQ.data?.length ? (
            <EmptyState title="No series" description="Series will appear here." />
          ) : (
            <View className="gap-3">
              {seriesQ.data.map((s) => (
                <Link key={s.id} href={`/scholars/${scholar.slug}/series/${s.slug}` as never} asChild>
                  <View className="rounded-2xl border border-sand-200 bg-white p-4">
                    <Text className="text-sm font-semibold text-ink">{s.title}</Text>
                    {s.description ? (
                      <Text className="mt-1 text-xs leading-4 text-ink-500" numberOfLines={2}>
                        {s.description}
                      </Text>
                    ) : null}
                    <Text className="mt-2 text-xs font-medium text-ink-400">{s.episode_count ?? 0} lectures</Text>
                  </View>
                </Link>
              ))}
            </View>
          )}
        </View>

        <View className="gap-3 px-6">
          <Text className="text-sm font-semibold uppercase tracking-wide text-ink-400">Latest lectures</Text>
          {episodesQ.isPending ? (
            <View className="gap-3">
              <AudioCardSkeleton />
              <AudioCardSkeleton />
            </View>
          ) : episodesQ.isError ? (
            <ErrorState message="Failed to load lectures" onRetry={() => episodesQ.refetch()} />
          ) : !episodesQ.data?.length ? (
            <EmptyState title="No lectures" />
          ) : (
            <View className="gap-3">
              {episodesQ.data.slice(0, 10).map((e, i) => (
                <AudioCard key={e.id} episode={e} number={i + 1} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
