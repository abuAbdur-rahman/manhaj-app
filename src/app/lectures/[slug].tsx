import NetInfo from "@react-native-community/netinfo";
import { useLocalSearchParams, Link } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorState } from "@/components/empty-state";
import { formatDuration } from "@/lib/audio";
import { downloadEpisode, getLocalUri } from "@/lib/downloads";
import { playEpisode } from "@/lib/trackPlayer";
import { useEpisodeBySlug } from "@/hooks/useManhajQueries";

export default function LectureScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const q = useEpisodeBySlug(slug ?? "");
  const [dlProgress, setDlProgress] = useState<number | null>(null);
  const [dlBusy, setDlBusy] = useState(false);

  if (q.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
        <View className="h-32 bg-sand-100 dark:bg-ink-800" />
      </SafeAreaView>
    );
  }
  if (q.isError || !q.data) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
        <ErrorState message={q.isError ? "Failed to load lecture" : "Lecture not found"} onRetry={() => q.refetch()} />
      </SafeAreaView>
    );
  }

  const ep = q.data;
  const localUri = getLocalUri(ep.id);
  const isDownloaded = !!localUri;

  const handleShare = async () => {
    const url = `https://manhaj-sunnah.vercel.app/lectures/${ep.slug}`;
    try {
      await Share.share({ message: `${ep.title} — ${url}`, url });
    } catch {}
  };

  const handlePlay = async () => {
    try {
      await playEpisode(ep);
      try {
        const { logPlayLocal } = await import("@/lib/db");
        logPlayLocal(ep.id, localUri ? "offline" : "stream");
      } catch {}
    } catch {
      Alert.alert("Playback failed", "Something went wrong. Please try again.");
    }
  };

  const handleDownload = async () => {
    if (isDownloaded) return;
    // cellular warning if wifi-only toggle ON
    try {
      const state = await NetInfo.fetch();
      const { getWifiOnly } = await import("@/lib/downloads");
      if (getWifiOnly() && state.type === "cellular") {
        const ok = await new Promise<boolean>((res) =>
          Alert.alert("Cellular download", "You are on mobile data. Continue?", [
            { text: "Cancel", onPress: () => res(false), style: "cancel" },
            { text: "Download", onPress: () => res(true) },
          ]),
        );
        if (!ok) return;
      }
    } catch {}
    setDlBusy(true);
    setDlProgress(0);
    try {
      let lastStep = -1;
      await downloadEpisode(ep, (w, t) => {
        if (t > 0) {
          const pct = Math.round((w / t) * 100);
          if (pct - lastStep >= 5 || pct === 100) {
            lastStep = pct;
            setDlProgress(pct);
          }
        }
      });
      setDlProgress(100);
    } catch {
      Alert.alert("Download failed", "Something went wrong. Please try again.");
    } finally {
      setDlBusy(false);
      setTimeout(() => setDlProgress(null), 800);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
      <ScrollView contentContainerClassName="gap-6 p-6 pb-10">
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-widest text-forest-600 dark:text-forest-100">
            {ep.scholar?.name ?? ""} {ep.series ? `· ${ep.series.title}` : ""}
          </Text>
          <Text className="text-xl font-bold leading-7 text-ink dark:text-ink-100">{ep.title}</Text>
          <View className="flex-row flex-wrap gap-2">
            <Text className="rounded bg-forest-50 px-2 py-1 text-xs font-semibold uppercase text-forest-700 dark:bg-forest-900 dark:text-forest-100">{ep.language}</Text>
            <Text className="font-mono text-xs font-medium text-ink-500 dark:text-ink-400">{formatDuration(ep.duration_seconds ?? 0)}</Text>
            {ep.tags.map((t) => (
              <Text key={t} className="rounded bg-sand-100 px-2 py-1 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-400">
                {t}
              </Text>
            ))}
          </View>
        </View>

        {ep.description ? (
          <View className="rounded-2xl border border-sand-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
            <Text className="text-sm leading-5 text-ink-700 dark:text-ink-100">{ep.description}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          <View className="rounded-2xl border border-sand-200 bg-white p-4 gap-3 dark:border-ink-800 dark:bg-ink-900">
            <Text className="text-sm font-semibold text-ink dark:text-ink-100">Playback</Text>
            <Text className="text-xs leading-4 text-ink-500 dark:text-ink-400">{isDownloaded ? "Downloaded — plays offline via local file" : "Streams directly from R2. Background + notification controls via track-player."}</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pressable onPress={handlePlay} accessibilityRole="button" accessibilityLabel={isDownloaded ? "Play offline" : "Play"} hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} className="rounded-full bg-forest-600 px-5 py-2.5 active:opacity-90 dark:bg-forest-500">
                <Text className="text-sm font-bold text-white">{isDownloaded ? "Play offline" : "Play"}</Text>
              </Pressable>
              {!isDownloaded ? (
                <Pressable disabled={dlBusy} onPress={handleDownload} accessibilityRole="button" accessibilityLabel={dlBusy ? "Downloading" : "Download"} hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} className={`rounded-full border px-5 py-2.5 active:opacity-80 dark:border-ink-700 ${dlBusy ? "border-sand-200 bg-sand-100 dark:bg-ink-800" : "border-sand-200 bg-sand-50 dark:bg-ink-800"}`}>
                  <Text className="text-sm font-semibold text-ink dark:text-ink-100">{dlBusy ? (dlProgress !== null ? `${dlProgress}%` : "Downloading…") : "Download"}</Text>
                </Pressable>
              ) : (
                <View className="rounded-full border border-forest-100 bg-forest-50 px-4 py-2.5 dark:border-forest-900 dark:bg-forest-900"><Text className="text-xs font-semibold text-forest-700 dark:text-forest-100">Downloaded</Text></View>
              )}
              <Pressable onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share lecture" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} className="rounded-full border border-sand-200 bg-white px-4 py-2.5 active:opacity-80 dark:border-ink-700 dark:bg-ink-800">
                <Text className="text-sm font-semibold text-ink dark:text-ink-100">Share</Text>
              </Pressable>
            </View>
            {ep.audio_url && !isDownloaded ? <Text className="text-xs text-ink-400" numberOfLines={1}>{ep.audio_url}</Text> : null}
          </View>

          {ep.series || ep.scholar ? (
            <View className="flex-row gap-2">
              {ep.scholar ? (
                <Link href={`/scholars/${ep.scholar.slug}` as never} asChild>
                  <Pressable accessibilityRole="button" className="rounded-full bg-forest-50 px-4 py-2.5 active:opacity-80 dark:bg-ink-800" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }}>
                    <Text className="text-xs font-semibold text-forest-700 dark:text-forest-100">{ep.scholar.name}</Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
