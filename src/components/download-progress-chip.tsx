import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { subscribeDownloadProgress, type DownloadProgress } from "@/lib/downloads";

export function DownloadProgressChip() {
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  useEffect(() => subscribeDownloadProgress(setProgress), []);

  if (!progress) return null;

  return (
    <View className="flex-row items-center gap-2 rounded-full bg-forest-600 px-4 py-2 shadow-lg dark:bg-forest-500" accessibilityRole="progressbar" accessibilityLabel={`Downloading ${progress.title}`} accessibilityValue={{ min: 0, max: 100, now: progress.percent }}>
      <ActivityIndicator size="small" color="#ffffff" />
      <View className="flex-1 pr-1">
        <Text className="text-xs font-semibold text-white" numberOfLines={1}>
          {progress.title}
        </Text>
        <View className="mt-1 h-1 overflow-hidden rounded bg-white/30">
          <View style={{ width: `${progress.percent}%` }} className="h-1 bg-white" />
        </View>
      </View>
      <Text className="text-xs font-bold text-white">{progress.percent}%</Text>
    </View>
  );
}
