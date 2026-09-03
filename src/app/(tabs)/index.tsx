import { Link } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AudioCard, AudioCardSkeleton } from "@/components/audio-card";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { useFeaturedSeries, useRecentEpisodes, useScholars } from "@/hooks/useManhajQueries";
import { formatCount } from "@/lib/format";
import { playEpisode } from "@/lib/trackPlayer";
import type { Episode } from "@/types";

export default function HomeScreen() {
  const recent = useRecentEpisodes(10);
  const featured = useFeaturedSeries();
  const scholars = useScholars(6);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([recent.refetch(), featured.refetch(), scholars.refetch()]);
    setRefreshing(false);
  }, [recent, featured, scholars]);

  const playRecent = useCallback((e: Episode) => {
    void playEpisode(e, recent.data ?? [e]);
  }, [recent.data]);

  // Single virtualized list — Recent drives rows; featured + scholars in header/footer to avoid nested ScrollView
  const recentData: Episode[] = recent.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
      <FlatList
        data={recentData}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: Math.max(40, insets.bottom + 80), gap: 24 }}
        ListHeaderComponent={
          <View style={{ gap: 24 }}>
            <View className="gap-1">
              <Text className="text-2xl font-bold text-ink dark:text-ink-100">Manhaj Sunnah</Text>
              <Text className="text-sm text-ink-500 dark:text-ink-400">Manhaj as-Salaf — Quran, Sunnah & Athar</Text>
            </View>

            <View className="gap-3">
              <Text className="text-sm font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-400">Featured</Text>
              {featured.isPending ? (
                <View className="h-28 rounded-2xl bg-sand-100 dark:bg-ink-800" />
              ) : featured.isError ? (
                <ErrorState message="Failed to load featured" onRetry={() => featured.refetch()} />
              ) : !featured.data?.length ? (
                <EmptyState title="No featured series" description="Check back soon." />
              ) : (
                <View style={{ gap: 12 }}>
                  {featured.data.map((s) =>
                    s.scholar?.slug ? (
                      <Link key={s.id} href={`/scholars/${s.scholar.slug}/series/${s.slug}` as never} asChild>
                        <Pressable accessibilityRole="button" accessibilityLabel={`${s.title} by ${s.scholar?.name ?? "Series"}`} hitSlop={8} style={{ minHeight: 48 }} className="rounded-2xl border border-sand-200 bg-white p-4 active:opacity-80 dark:border-ink-800 dark:bg-ink-900">
                          <Text className="text-xs font-semibold uppercase tracking-widest text-forest-600 dark:text-forest-100">{s.scholar?.name ?? "Series"}</Text>
                          <Text className="mt-1 text-base font-bold text-ink dark:text-ink-100">{s.title}</Text>
                          {s.description ? <Text className="mt-1 text-sm leading-5 text-ink-600 dark:text-ink-400" numberOfLines={2}>{s.description}</Text> : null}
                          <Text className="mt-2 text-xs font-medium text-ink-400">{formatCount(s.episode_count, "lecture", "lectures")}</Text>
                        </Pressable>
                      </Link>
                    ) : null,
                  )}
                </View>
              )}
            </View>

            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-400">Recent</Text>
                <Link href="/scholars" asChild>
                  <Pressable accessibilityRole="button" accessibilityLabel="Browse scholars" hitSlop={8} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 12 }} className="rounded-full bg-sand-100 dark:bg-ink-800"><Text className="text-xs font-semibold text-forest-700 dark:text-forest-100">Browse scholars</Text></Pressable>
                </Link>
              </View>
              {recent.isPending ? (
                <View style={{ gap: 12 }}><AudioCardSkeleton /><AudioCardSkeleton /><AudioCardSkeleton /></View>
              ) : recent.isError ? (
                <ErrorState message="Failed to load episodes" onRetry={() => recent.refetch()} />
              ) : !recent.data?.length ? (
                <EmptyState title="No episodes yet" description="Content is being prepared." />
              ) : null}
            </View>
          </View>
        }
        ListFooterComponent={
          <View className="gap-3 pt-2">
            <Text className="text-sm font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-400">Scholars</Text>
            {scholars.isPending ? (
              <View className="h-20 rounded-2xl bg-sand-100 dark:bg-ink-800" />
            ) : scholars.isError ? (
              <ErrorState message="Failed to load scholars" onRetry={() => scholars.refetch()} />
            ) : (
              <FlatList
                data={scholars.data ?? []}
                keyExtractor={(sc) => sc.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingRight: 24 }}
                renderItem={({ item: sc }) => (
                  <Link href={`/scholars/${sc.slug}` as never} asChild>
                    <Pressable accessibilityRole="button" accessibilityLabel={sc.name} hitSlop={8} style={{ minHeight: 48 }} className="w-32 items-center gap-2 rounded-2xl border border-sand-200 bg-white p-4 active:opacity-80 dark:border-ink-800 dark:bg-ink-900">
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-forest-700">
                        <Text className="text-base font-bold text-white">{sc.name[0]}</Text>
                      </View>
                      <Text className="text-center text-xs font-semibold text-ink dark:text-ink-100" numberOfLines={2}>{sc.name}</Text>
                      <Text className="text-xs text-ink-400">{formatCount(sc.episode_count, "lecture", "lectures")}</Text>
                    </Pressable>
                  </Link>
                )}
              />
            )}
          </View>
        }
        renderItem={({ item: e }) => <AudioCard episode={e} onPlay={playRecent} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </SafeAreaView>
  );
}
