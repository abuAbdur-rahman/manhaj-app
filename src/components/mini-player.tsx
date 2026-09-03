import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useShallow } from "zustand/react/shallow";
import TrackPlayer, { useIsPlaying, useProgress } from "@rntp/player";
import { usePlayerStore, flushPositionPersist } from "@/store/player";
import { formatDuration } from "@/lib/audio";
import { togglePlayPause } from "@/lib/trackPlayer";
import { QueueSheet } from "@/components/queue-sheet";
import { Colors } from "@/constants/theme";

export function MiniPlayer() {
  const scheme = useColorScheme();
  const c = Colors[scheme === "dark" ? "dark" : "light"];
  const { currentEpisode, currentTime, duration, queue, miniPlayerHidden, sleepTimerRemaining } = usePlayerStore(
    useShallow((s) => ({
      currentEpisode: s.currentEpisode,
      currentTime: s.currentTime,
      duration: s.duration,
      queue: s.queue,
      miniPlayerHidden: s.miniPlayerHidden,
      sleepTimerRemaining: s.sleepTimerRemaining,
    })),
  );
  const playing = useIsPlaying();
  // poll at 1Hz while something is loaded, slow to once a minute otherwise
  const progress = useProgress(currentEpisode ? 1 : 60);
  const [showQueue, setShowQueue] = useState(false);

  // sleep timer — only run the 1s interval while a timer is actually set
  useEffect(() => {
    if (sleepTimerRemaining === null) return;
    const id = setInterval(() => {
      const s = usePlayerStore.getState();
      if (s.sleepTimerRemaining === null) return;
      s.tickSleepTimer();
      if (usePlayerStore.getState().sleepTimerRemaining === null) {
        try {
          TrackPlayer.pause();
        } catch {}
        flushPositionPersist();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [sleepTimerRemaining]);

  // sync JSI progress into store (persist throttled to 5s internally)
  useEffect(() => {
    try {
      if (Number.isFinite(progress.position)) usePlayerStore.getState().setCurrentTime(progress.position);
      if (Number.isFinite(progress.duration) && progress.duration > 0) usePlayerStore.getState().setDuration(progress.duration);
    } catch {}
  }, [progress.position, progress.duration]);

  if (!currentEpisode || miniPlayerHidden) return null;

  const syncedDuration = progress.duration || duration || currentEpisode.duration_seconds || 0;
  const syncedPosition = progress.position || currentTime;
  const isTrackPlaying = playing || usePlayerStore.getState().isPlaying;

  const goNext = () => {
    try {
      TrackPlayer.skipToNext();
    } catch {}
  };

  return (
    <>
      {showQueue ? <QueueSheet onClose={() => setShowQueue(false)} /> : null}
      <View className="border-t border-sand-200 bg-white px-3 py-2 shadow-sm dark:border-ink-800 dark:bg-ink-900">
        <View className="flex-row items-center gap-2.5">
          <Link href={`/lectures/${currentEpisode.slug}` as never} asChild>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${currentEpisode.title}`} className="flex-row flex-1 items-center gap-2.5" hitSlop={8}>
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-forest-50 dark:bg-forest-900">
                <Text className="text-xs font-bold text-forest-700 dark:text-forest-100">{currentEpisode.language.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-sm font-semibold text-ink dark:text-ink-100" numberOfLines={1}>{currentEpisode.title}</Text>
                <Text className="text-xs text-ink-500 dark:text-ink-400" numberOfLines={1}>
                  {currentEpisode.scholar?.name ?? ""} · {formatDuration(syncedDuration)}
                  {sleepTimerRemaining !== null ? ` · Sleep ${formatDuration(sleepTimerRemaining)}` : ""}
                </Text>
                <View className="mt-1 h-1 overflow-hidden rounded bg-sand-100 dark:bg-ink-800" accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: syncedDuration || 100, now: Math.floor(syncedPosition) }}>
                  <View style={{ width: `${syncedDuration ? Math.min(100, (syncedPosition / syncedDuration) * 100) : 0}%` }} className="h-1 bg-forest-500 dark:bg-forest-600" />
                </View>
              </View>
            </Pressable>
          </Link>
          <Pressable accessibilityRole="button" accessibilityLabel={isTrackPlaying ? "Pause" : "Play"} hitSlop={6} style={{ minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" }} onPress={togglePlayPause} className="rounded-full bg-forest-600 active:opacity-90 dark:bg-forest-500">
            <MaterialCommunityIcons name={isTrackPlaying ? "pause" : "play"} size={24} color="#ffffff" />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next track" hitSlop={6} style={{ minHeight: 48, minWidth: 44, alignItems: "center", justifyContent: "center" }} onPress={goNext} className="rounded-full active:opacity-70">
            <MaterialCommunityIcons name="skip-next" size={26} color={c.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Queue, ${queue.length} items`} hitSlop={6} style={{ minHeight: 48, minWidth: 44, alignItems: "center", justifyContent: "center" }} onPress={() => setShowQueue((v) => !v)} className="rounded-full active:opacity-70">
            <MaterialCommunityIcons name="playlist-music" size={26} color={c.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Hide player" hitSlop={6} style={{ minHeight: 48, minWidth: 44, alignItems: "center", justifyContent: "center" }} onPress={() => usePlayerStore.getState().hideMiniPlayer()} className="rounded-full active:opacity-70">
            <MaterialCommunityIcons name="chevron-down" size={26} color={c.textSecondary} />
          </Pressable>
        </View>
      </View>
    </>
  );
}
