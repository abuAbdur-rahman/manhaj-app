import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
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
    <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <View className="gap-3 px-6 py-4 border-b border-sand-200 bg-white dark:border-ink-800 dark:bg-ink-900">
        <Text className="text-sm font-semibold uppercase tracking-wide text-ink-400">Search</Text>
        <View className="flex-row items-center gap-2">
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search lectures, scholars, tags…"
            placeholderTextColor="#9aa5a0"
            className="flex-1 rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-ink dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
            returnKeyType="search"
            accessibilityLabel="Search lectures"
            accessibilityHint="Type to search lectures, scholars or tags"
            clearButtonMode="while-editing"
          />
          {q.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQ("")} className="rounded-full bg-sand-100 px-4 py-3 dark:bg-ink-800" style={{ minHeight: 48, justifyContent: 'center' }}>
              <Text className="text-xs font-bold text-ink dark:text-ink-100">Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <View className="flex-row flex-wrap gap-2">
          {[
            { label: "All", value: undefined },
            { label: "Yoruba", value: "yoruba" },
            { label: "English", value: "english" },
            { label: "Arabic", value: "arabic" },
          ].map((o) => (
            <Pressable
              key={o.label}
              onPress={() => setLang(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: lang === o.value }}
              hitSlop={8}
              style={{ minHeight: 48, minWidth: 48, justifyContent: 'center' }}
              className={`rounded-full px-4 py-2.5 ${lang === o.value ? "bg-forest-700" : "bg-sand-100 dark:bg-ink-800"}`}
            >
              <Text className={`text-xs font-semibold ${lang === o.value ? "text-white" : "text-ink-600 dark:text-ink-400"}`}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="text-xs text-ink-400 dark:text-ink-400">Search powered by manhaj-sunnah.vercel.app/api/search</Text>
      </View>

      {!showResults ? (
        <View className="flex-1 p-6"><EmptyState title="Type to search" description="Enter at least 2 characters. Results stream from the website API." /></View>
      ) : search.isPending ? (
        <View className="gap-3 p-6"><AudioCardSkeleton /><AudioCardSkeleton /></View>
      ) : search.isError ? (
        <View className="p-6"><ErrorState message="Search failed" onRetry={() => search.refetch()} /></View>
      ) : !search.data?.length ? (
        <View className="p-6"><EmptyState title="No results" description={`No lectures found for “${qDebounced}”.`} /></View>
      ) : (
        <FlatList
          data={search.data}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ gap: 12, padding: 24, paddingBottom: 40 }}
          renderItem={({ item: e }) => <AudioCard episode={e} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
