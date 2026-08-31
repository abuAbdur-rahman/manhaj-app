import { Link } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState, ErrorState } from "@/components/empty-state";
import { useAllScholars } from "@/hooks/useManhajQueries";

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
      <SafeAreaView className="flex-1 bg-sand-50">
        <View className="gap-3 p-6">
          <View className="h-20 rounded-2xl bg-sand-100" />
          <View className="h-20 rounded-2xl bg-sand-100" />
          <View className="h-20 rounded-2xl bg-sand-100" />
        </View>
      </SafeAreaView>
    );
  }
  if (q.isError) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50">
        <ErrorState message="Failed to load scholars" onRetry={() => q.refetch()} />
      </SafeAreaView>
    );
  }
  if (!q.data?.length) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50">
        <EmptyState title="No scholars yet" description="Scholars will appear here once published." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <FlatList
        data={q.data}
        keyExtractor={(s) => s.id}
        contentContainerClassName="gap-3 p-6 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Link href={`/scholars/${item.slug}` as never} asChild>
            <Pressable className="flex-row items-center gap-4 rounded-2xl border border-sand-200 bg-white p-4 active:opacity-80">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-forest-700">
                <Text className="text-base font-bold text-white">{item.name[0]}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-ink">{item.name}</Text>
                <Text className="text-xs text-ink-500">
                  {[item.series_count, item.episode_count].filter((n) => n !== undefined).join(" · ") || "Active"}
                  {item.series_count !== undefined ? ` series` : ""} {item.episode_count !== undefined ? `· ${item.episode_count} lectures` : ""}
                </Text>
                {item.languages?.length ? (
                  <Text className="mt-0.5 text-[11px] font-medium uppercase text-forest-600">
                    {item.languages.join(" · ")}
                  </Text>
                ) : null}
              </View>
              <Text className="text-ink-300">›</Text>
            </Pressable>
          </Link>
        )}
        ListHeaderComponent={<Text className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-400">Scholars</Text>}
      />
    </SafeAreaView>
  );
}
