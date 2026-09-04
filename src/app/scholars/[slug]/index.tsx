import { Link, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AudioCard } from "@/components/audio-card";
import { BackButton } from "@/components/back-button";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { useScholarPage } from "@/hooks/useManhajQueries";
import { formatCount } from "@/lib/format";

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
        <View className="flex-row items-center px-2 pt-2">
          <BackButton />
        </View>
        <View className="h-32 bg-sand-100 dark:bg-ink-800" />
      </SafeAreaView>
    );
  }
  if (pageQ.isError || !pageQ.data) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
        <View className="flex-row items-center px-2 pt-2">
          <BackButton />
        </View>
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
            <View className="flex-row items-center justify-between px-4 pt-2">
              <BackButton />
              <Text className="text-xs font-semibold uppercase tracking-widest text-forest-600 dark:text-forest-100">Scholar</Text>
              <View style={{ minWidth: 48 }} />
            </View>
            <View className="gap-4 bg-white px-6 pb-6 pt-2 dark:bg-ink-800">
              <View className="flex-row items-center gap-4">
                <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-forest-700">
                  <Text className="text-2xl font-bold text-white">{scholar.name[0]}</Text>
                </View>
                <View className="flex-1 gap-1.5">
                  <Text className="text-xl font-bold text-ink dark:text-white">{scholar.name}</Text>
                  <Text className="text-xs text-ink-400 dark:text-ink-400">
                    {formatCount(scholar.series_count, "series", "series")} · {formatCount(scholar.episode_count, "lecture", "lectures")}
                  </Text>
                  {scholar.languages?.length ? (
                    <View className="flex-row flex-wrap gap-1">
                      {scholar.languages.map((l) => (
                        <View key={l} className="rounded-full bg-forest-50 px-2 py-0.5 dark:bg-forest-900">
                          <Text className="text-[10px] font-semibold uppercase tracking-wide text-forest-700 dark:text-forest-100">{l}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
              {scholar.bio ? <Text className="text-sm leading-5 text-ink-600 dark:text-ink-100">{scholar.bio}</Text> : null}
            </View>

            <View className="gap-3 px-6">
              <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Series</Text>
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
                        <Text className="mt-2 text-xs font-medium text-ink-400 dark:text-ink-400">{formatCount(s.episode_count, "lecture", "lectures")}</Text>
                      </Pressable>
                    </Link>
                  ))}
                </View>
              )}
            </View>

            <View className="px-6">
              <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Latest lectures</Text>
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
