import { Link, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AudioCard } from "@/components/audio-card";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { useScholarPage } from "@/hooks/useManhajQueries";

export default function ScholarDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const pageQ = useScholarPage(slug ?? "");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await pageQ.refetch();
    setRefreshing(false);
  }, [pageQ]);

  if (pageQ.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
        <View className="h-32 bg-sand-100 dark:bg-ink-800" />
      </SafeAreaView>
    );
  }
  if (pageQ.isError || !pageQ.data) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
        <ErrorState message={pageQ.isError ? "Failed to load scholar" : "Scholar not found"} onRetry={() => pageQ.refetch()} />
      </SafeAreaView>
    );
  }

  const { scholar, series, episodes } = pageQ.data;

  return (
    <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
      <FlatList
        data={episodes}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerClassName="gap-6 pb-10"
        ListHeaderComponent={
          <View className="gap-6">
            <View className="gap-3 bg-white dark:bg-ink-800 px-6 py-6 border-b border-sand-200 dark:border-ink-800">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-forest-700">
                <Text className="text-xl font-bold text-white">{scholar.name[0]}</Text>
              </View>
              <Text className="text-xl font-bold text-ink dark:text-white">{scholar.name}</Text>
              {scholar.bio ? <Text className="text-sm leading-5 text-ink-600 dark:text-ink-100">{scholar.bio}</Text> : null}
              <Text className="text-xs text-ink-400 dark:text-ink-400">
                {scholar.series_count ?? 0} series · {scholar.episode_count ?? 0} lectures
              </Text>
            </View>

            <View className="gap-3 px-6">
              <Text className="text-sm font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-400">Series</Text>
              {!series.length ? (
                <EmptyState title="No series" description="Series will appear here." />
              ) : (
                <View className="gap-3">
                  {series.map((s) => (
                    <Link key={s.id} href={`/scholars/${scholar.slug}/series/${s.slug}` as never} asChild>
                      <Pressable accessibilityRole="button" hitSlop={8} className="rounded-2xl border border-sand-200 dark:border-ink-700 bg-white dark:bg-ink-800 p-4 active:opacity-80" style={{ minHeight: 48 }}>
                        <Text className="text-sm font-semibold text-ink dark:text-white">{s.title}</Text>
                        {s.description ? (
                          <Text className="mt-1 text-xs leading-4 text-ink-500 dark:text-ink-400" numberOfLines={2}>
                            {s.description}
                          </Text>
                        ) : null}
                        <Text className="mt-2 text-xs font-medium text-ink-400 dark:text-ink-400">{s.episode_count ?? 0} lectures</Text>
                      </Pressable>
                    </Link>
                  ))}
                </View>
              )}
            </View>

            <View className="px-6">
              <Text className="text-sm font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-400">Latest lectures</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          episodes.length === 0 ? (
            <View className="px-6"><EmptyState title="No lectures" /></View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <View className="px-6"><AudioCard episode={item} number={index + 1} /></View>
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
      />
    </SafeAreaView>
  );
}
