import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AudioCard, AudioCardSkeleton } from "@/components/audio-card";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { useSearchEpisodes } from "@/hooks/useManhajQueries";

export default function SearchScreen() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [lang, setLang] = useState<string | undefined>(undefined);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 320);
    return () => clearTimeout(t);
  }, [q]);

  const search = useSearchEpisodes(qDebounced, lang);
  const showResults = qDebounced.trim().length >= 2;

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <View className="gap-3 px-6 py-4 border-b border-sand-200 bg-white">
        <Text className="text-sm font-semibold uppercase tracking-wide text-ink-400">Search</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search lectures, scholars, tags…"
          placeholderTextColor="#9aa5a0"
          className="rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-ink"
          returnKeyType="search"
        />
        <View className="flex-row gap-2">
          {[
            { label: "All", value: undefined },
            { label: "Yoruba", value: "yoruba" },
            { label: "English", value: "english" },
            { label: "Arabic", value: "arabic" },
          ].map((o) => (
            <Pressable
              key={o.label}
              onPress={() => setLang(o.value)}
              className={`rounded-full px-3 py-1.5 ${lang === o.value ? "bg-forest-700" : "bg-sand-100"}`}
            >
              <Text className={`text-xs font-semibold ${lang === o.value ? "text-white" : "text-ink-600"}`}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="text-xs text-ink-400">Uses {process.env.EXPO_PUBLIC_API_URL ?? "manhaj-sunnah.vercel.app"}/api/search · debounced 320ms</Text>
      </View>

      <ScrollView contentContainerClassName="gap-3 p-6 pb-10">
        {!showResults ? (
          <EmptyState title="Type to search" description="Enter at least 2 characters. Results stream from the website API." />
        ) : search.isPending ? (
          <View className="gap-3">
            <AudioCardSkeleton />
            <AudioCardSkeleton />
          </View>
        ) : search.isError ? (
          <ErrorState message="Search failed" onRetry={() => search.refetch()} />
        ) : !search.data?.length ? (
          <EmptyState title="No results" description={`No lectures found for “${qDebounced}”.`} />
        ) : (
          search.data.map((e) => <AudioCard key={e.id} episode={e} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
