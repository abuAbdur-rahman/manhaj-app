import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { EmptyState } from "@/components/empty-state";
import { getAllDownloads, getStorageCapBytes, getStorageUsedBytes, removeAllDownloads, removeDownload, setStorageCapBytes } from "@/lib/downloads";
import type { DownloadRow } from "@/lib/downloads";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function DownloadsScreen() {
  const [rows, setRows] = useState<DownloadRow[]>([]);
  const [used, setUsed] = useState(0);
  const cap = getStorageCapBytes();

  const refresh = useCallback(() => {
    setRows(getAllDownloads());
    setUsed(getStorageUsedBytes());
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

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
    <SafeAreaView className="flex-1 bg-sand-50">
      <View className="gap-1 border-b border-sand-200 bg-white px-6 py-6">
        <Text className="text-xl font-bold text-ink">Downloads</Text>
        <Text className="text-sm text-ink-500">{fmtBytes(used)} / {fmtBytes(cap)} used · 2 GB default cap</Text>
        <View className="mt-3 flex-row gap-2">
          <Pressable onPress={handleRemoveAll} className="rounded-full border border-sand-200 bg-white px-4 py-2"><Text className="text-xs font-semibold text-ink">Remove all</Text></Pressable>
          <Pressable onPress={() => { const next = cap === 2 * 1024 ** 3 ? 4 * 1024 ** 3 : 2 * 1024 ** 3; setStorageCapBytes(next); refresh(); }} className="rounded-full bg-sand-50 px-4 py-2"><Text className="text-xs font-semibold text-ink">Toggle cap {fmtBytes(cap)}</Text></Pressable>
        </View>
      </View>
      {rows.length === 0 ? (
        <EmptyState title="No downloads yet" description="Download from a lecture page. Files persist until you delete them — no auto-eviction." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.episode_id}
          contentContainerClassName="p-4 gap-3"
          renderItem={({ item }) => (
            <View className="rounded-2xl border border-sand-200 bg-white p-4 gap-2">
              <Text className="text-sm font-semibold text-ink" numberOfLines={2}>{item.title}</Text>
              <Text className="text-xs text-ink-500">{item.scholar_name} · {fmtBytes(item.file_size_bytes)} · {new Date(item.downloaded_at).toLocaleDateString()}</Text>
              <Text className="text-[11px] text-ink-400" numberOfLines={1}>{item.file_uri}</Text>
              <View className="flex-row gap-2 pt-1">
                <Pressable onPress={() => handleRemove(item.episode_id)} className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5"><Text className="text-xs font-semibold text-red-700">Remove</Text></Pressable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
