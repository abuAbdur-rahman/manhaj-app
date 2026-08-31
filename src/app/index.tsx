import { Link } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AudioCard, AudioCardSkeleton } from "@/components/audio-card";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { useFeaturedSeries, useRecentEpisodes, useScholars } from "@/hooks/useManhajQueries";

export default function HomeScreen() {
  const recent = useRecentEpisodes(10);
  const featured = useFeaturedSeries();
  const scholars = useScholars(6);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([recent.refetch(), featured.refetch(), scholars.refetch()]);
    setRefreshing(false);
  }, [recent, featured, scholars]);

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <ScrollView
        contentContainerClassName="gap-6 px-6 py-6 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="gap-1">
          <Text className="text-2xl font-bold text-ink">Manhaj Sunnah</Text>
          <Text className="text-sm text-ink-500">Manhaj as-Salaf — Quran, Sunnah & Athar</Text>
        </View>

        {/* Featured series */}
        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase tracking-wide text-ink-400">Featured</Text>
          {featured.isPending ? (
            <View className="h-28 rounded-2xl bg-sand-100" />
          ) : featured.isError ? (
            <ErrorState message="Failed to load featured" onRetry={() => featured.refetch()} />
          ) : !featured.data?.length ? (
            <EmptyState title="No featured series" description="Check back soon." />
          ) : (
            featured.data.map((s) => (
              <Link
                key={s.id}
                href={`/scholars/${s.scholar?.slug ?? ""}/series/${s.slug}` as never}
                asChild
              >
                <View className="rounded-2xl border border-sand-200 bg-white p-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-widest text-forest-600">
                    {s.scholar?.name ?? "Series"}
                  </Text>
                  <Text className="mt-1 text-base font-bold text-ink">{s.title}</Text>
                  {s.description ? (
                    <Text className="mt-1 text-sm leading-5 text-ink-600" numberOfLines={2}>
                      {s.description}
                    </Text>
                  ) : null}
                  <Text className="mt-2 text-xs font-medium text-ink-400">{s.episode_count ?? 0} lectures</Text>
                </View>
              </Link>
            ))
          )}
        </View>

        {/* Recent episodes */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold uppercase tracking-wide text-ink-400">Recent</Text>
            <Link href="/scholars" asChild>
              <Text className="text-xs font-semibold text-forest-700">Browse scholars →</Text>
            </Link>
          </View>
          {recent.isPending ? (
            <View className="gap-3">
              <AudioCardSkeleton />
              <AudioCardSkeleton />
              <AudioCardSkeleton />
            </View>
          ) : recent.isError ? (
            <ErrorState message="Failed to load episodes" onRetry={() => recent.refetch()} />
          ) : !recent.data?.length ? (
            <EmptyState title="No episodes yet" description="Content is being prepared." />
          ) : (
            <View className="gap-3">
              {recent.data.map((e) => (
                <AudioCard key={e.id} episode={e} />
              ))}
            </View>
          )}
        </View>

        {/* Scholars preview */}
        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase tracking-wide text-ink-400">Scholars</Text>
          {scholars.isPending ? (
            <View className="h-20 rounded-2xl bg-sand-100" />
          ) : scholars.isError ? (
            <ErrorState message="Failed to load scholars" onRetry={() => scholars.refetch()} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-6">
              {scholars.data?.map((sc) => (
                <Link key={sc.id} href={`/scholars/${sc.slug}` as never} asChild>
                  <View className="w-32 items-center gap-2 rounded-2xl border border-sand-200 bg-white p-4">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-forest-700">
                      <Text className="text-base font-bold text-white">{sc.name[0]}</Text>
                    </View>
                    <Text className="text-center text-xs font-semibold text-ink" numberOfLines={2}>
                      {sc.name}
                    </Text>
                    <Text className="text-[11px] text-ink-400">{sc.episode_count ?? 0} lectures</Text>
                  </View>
                </Link>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
