import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, Text, View, useColorScheme } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useIsPlaying } from "@rntp/player";

import { EmptyState } from "@/components/empty-state";
import { Colors } from "@/constants/theme";
import {
  getAllDownloads,
  getStorageCapBytes,
  getStorageUsedBytes,
  removeAllDownloads,
  removeDownload,
  setStorageCapBytes,
  subscribeDownloads,
  type DownloadRow,
} from "@/lib/downloads";
import { playEpisode, togglePlayPause } from "@/lib/trackPlayer";
import { useNetworkStore } from "@/store/network";
import { usePlayerStore } from "@/store/player";
import type { Episode } from "@/types";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// A DownloadRow is the only Episode metadata we are guaranteed to have offline.
// The local file_uri is resolved by playEpisode via getLocalUri(row.episode_id).
function rowToEpisode(r: DownloadRow): Episode {
  const ts = r.downloaded_at;
  return {
    id: r.episode_id,
    series_id: null,
    scholar_id: "",
    title: r.title,
    slug: r.episode_id,
    description: null,
    audio_url: null,
    duration_seconds: null,
    language: "english",
    tags: [],
    recorded_date: null,
    play_count: 0,
    is_published: true,
    created_at: ts,
    updated_at: ts,
    scholar: {
      id: "",
      name: r.scholar_name || "Manhaj Sunnah",
      slug: "",
      bio: null,
      photo_url: null,
      languages: [],
      social_links: {},
      is_active: true,
      created_at: ts,
      updated_at: ts,
    },
    series: null,
  };
}

export default function DownloadsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme === "dark" ? "dark" : "light"];
  const isOnline = useNetworkStore((s) => s.isOnline);
  const currentEpisodeId = usePlayerStore((s) => s.currentEpisode?.id ?? null);
  const playing = useIsPlaying();
  const isTrackPlaying = playing;

  const [rows, setRows] = useState<DownloadRow[]>([]);
  const [used, setUsed] = useState(0);
  const [cap, setCap] = useState(getStorageCapBytes());

  const insets = useSafeAreaInsets();
  const refresh = useCallback(() => {
    setRows(getAllDownloads());
    setUsed(getStorageUsedBytes());
    setCap(getStorageCapBytes());
  }, []);

  // refresh on tab focus AND when downloads change while mounted elsewhere
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => subscribeDownloads(refresh), [refresh]);

  const playRow = async (row: DownloadRow) => {
    const active = currentEpisodeId === row.episode_id;
    if (active) {
      try {
        await togglePlayPause();
      } catch {
        Alert.alert("Playback failed", "Something went wrong. Please try again.");
      }
      return;
    }
    try {
      const queue = rows.map(rowToEpisode);
      await playEpisode(rowToEpisode(row), queue);
      try {
        const { logPlayLocal } = await import("@/lib/db");
        logPlayLocal(row.episode_id, "offline");
      } catch {}
    } catch {
      Alert.alert("Playback failed", "Something went wrong. Please try again.");
    }
  };

  const handleRemove = (id: string) => {
    Alert.alert("Remove download?", "Delete the local file.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await removeDownload(id); refresh(); } },
    ]);
  };
  const handleRemoveAll = () => {
    if (rows.length === 0) return;
    Alert.alert("Remove all?", `Delete ${rows.length} files (${fmtBytes(used)})?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove all", style: "destructive", onPress: async () => { await removeAllDownloads(); refresh(); } },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
      <View className="gap-1 border-b border-sand-200 bg-white px-6 py-5 dark:border-ink-800 dark:bg-ink-900">
        <Text className="text-xs font-bold uppercase tracking-[0.18em] text-forest-600 dark:text-forest-100">Offline</Text>
        <Text className="text-xl font-bold text-ink dark:text-white">Downloads</Text>
        <Text className="text-xs text-ink-500 dark:text-ink-400">
          {fmtBytes(used)} <Text className="text-ink-400 dark:text-ink-500">/ {fmtBytes(cap)} used</Text>
        </Text>
        {!isOnline ? (
          <View className="mt-2 flex-row items-center gap-1.5 rounded-lg bg-sand-100 px-2.5 py-1.5 dark:bg-ink-800" accessibilityRole="text">
            <MaterialCommunityIcons name="wifi-off" size={13} color={c.clay} />
            <Text className="text-xs font-medium text-ink-600 dark:text-ink-300">You&apos;re offline – saved lectures play here.</Text>
          </View>
        ) : null}
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Pressable onPress={handleRemoveAll} accessibilityRole="button" accessibilityLabel="Remove all downloads" hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }} className="flex-row items-center gap-1.5 rounded-full border border-sand-200 bg-white px-4 py-2 active:opacity-70 dark:border-ink-700 dark:bg-ink-800">
            <MaterialCommunityIcons name="trash-can-outline" size={15} color={c.text} />
            <Text className="text-xs font-semibold text-ink dark:text-white">Remove all</Text>
          </Pressable>
          <Pressable onPress={() => { const next = cap === 2 * 1024 ** 3 ? 4 * 1024 ** 3 : 2 * 1024 ** 3; setStorageCapBytes(next); refresh(); }} accessibilityRole="button" accessibilityLabel={`Toggle storage cap, currently ${fmtBytes(cap)}`} hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }} className="flex-row items-center gap-1.5 rounded-full border border-sand-200 bg-white px-4 py-2 active:opacity-70 dark:border-ink-700 dark:bg-ink-800">
            <MaterialCommunityIcons name="database-outline" size={15} color={c.text} />
            <Text className="text-xs font-semibold text-ink dark:text-white">Toggle cap {fmtBytes(cap)}</Text>
          </Pressable>
        </View>
      </View>
      {rows.length === 0 ? (
        <EmptyState title="No downloads yet" description="Saved lectures play right here without an internet connection. Download from any lecture page." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.episode_id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: Math.max(24, insets.bottom + 80) }}
          renderItem={({ item }) => {
            const active = currentEpisodeId === item.episode_id;
            return (
              <Pressable
                onPress={() => playRow(item)}
                accessibilityRole="button"
                accessibilityLabel={`${active && isTrackPlaying ? "Pause" : "Play"} ${item.title}`}
                style={{ minHeight: 56 }}
                className="gap-3 rounded-2xl border border-sand-200 bg-white p-4 active:opacity-90 dark:border-ink-800 dark:bg-ink-900"
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className={`h-9 w-9 shrink-0 items-center justify-center rounded-full ${active && isTrackPlaying ? "bg-forest-500 dark:bg-forest-500" : "bg-forest-600 dark:bg-forest-500"}`}
                    accessibilityElementsHidden
                  >
                    <MaterialCommunityIcons name={active && isTrackPlaying ? "pause" : "play"} size={17} color="#ffffff" />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="text-sm font-semibold leading-5 text-ink dark:text-ink-100" numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.scholar_name ? (
                      <Text className="text-xs font-medium text-ink-500 dark:text-ink-400" numberOfLines={1}>
                        {item.scholar_name}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View className="flex-row items-center justify-between gap-3 border-t border-sand-100 pt-2.5 dark:border-ink-800">
                  <View className="flex-row flex-wrap items-center gap-x-3 gap-y-0.5" accessibilityLabel={`${fmtBytes(item.file_size_bytes)}, saved ${fmtDate(item.downloaded_at)}`}>
                    <Text className="text-xs font-medium text-ink-400 dark:text-ink-500">{fmtBytes(item.file_size_bytes)}</Text>
                    <Text className="text-xs font-medium text-ink-400 dark:text-ink-500">saved {fmtDate(item.downloaded_at)}</Text>
                  </View>
                  <Pressable
                    onPress={() => handleRemove(item.episode_id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.title}`}
                    hitSlop={8}
                    style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}
                    className="h-11 w-11 items-center justify-center rounded-full bg-red-50 active:opacity-70 dark:bg-red-950"
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={17} color={scheme === "dark" ? "#fca5a5" : "#b91c1c"} />
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
