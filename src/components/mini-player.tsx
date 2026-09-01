import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TrackPlayer, { useIsPlaying, useProgress } from "@rntp/player";
import { usePlayerStore, flushPositionPersist } from "@/store/player";
import { formatDuration } from "@/lib/audio";
import { playEpisode, togglePlayPause } from "@/lib/trackPlayer";
import { QueueSheet } from "@/components/queue-sheet";

export function MiniPlayer() {
  const { currentEpisode, currentTime, duration, speed, queue } = usePlayerStore();
  const playing = useIsPlaying();
  const progress = useProgress(1);
  const [showQueue, setShowQueue] = useState(false);
  const insets = useSafeAreaInsets();

  // stable interval — reads progress via ref to avoid recreate every sec
  useEffect(() => {
    let progPos = progress.position;
    let progDur = progress.duration;
    // keep refs fresh without recreating interval
    const id = setInterval(() => {
      const s = usePlayerStore.getState();
      if (s.sleepTimerRemaining !== null) {
        s.tickSleepTimer();
        if (usePlayerStore.getState().sleepTimerRemaining === null) {
          try { TrackPlayer.pause(); } catch {}
          flushPositionPersist();
        }
      }
    }, 1000);
    return () => {
      clearInterval(id);
      flushPositionPersist();
    };
  }, []);

  // sync JSI progress into store throttled to 5s persistence
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (Number.isFinite(progress.position)) usePlayerStore.getState().setCurrentTime(progress.position);
        if (Number.isFinite(progress.duration) && progress.duration > 0) usePlayerStore.getState().setDuration(progress.duration);
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [progress.position, progress.duration]);

  if (!currentEpisode) return null;

  const syncedDuration = progress.duration || duration || currentEpisode.duration_seconds || 0;
  const syncedPosition = progress.position || currentTime;
  const isTrackPlaying = playing || usePlayerStore.getState().isPlaying;
  const speeds: (typeof speed)[] = [0.75, 1, 1.25, 1.5, 2];

  return (
    <>
      {showQueue ? <QueueSheet onClose={() => setShowQueue(false)} /> : null}
      <View className="border-t border-sand-200 bg-white px-3 py-2 shadow-sm dark:border-ink-800 dark:bg-ink-900" style={{ paddingBottom: Math.max(8, insets.bottom) }}>
      <Link href={`/lectures/${currentEpisode.slug}` as never} asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${currentEpisode.title}`} className="flex-row items-center gap-3" hitSlop={8}>
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-forest-50 dark:bg-forest-900">
            <Text className="text-xs font-bold text-forest-700 dark:text-forest-100">{currentEpisode.language.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-ink dark:text-ink-100" numberOfLines={1}>{currentEpisode.title}</Text>
            <Text className="text-xs text-ink-500 dark:text-ink-400" numberOfLines={1}>{currentEpisode.scholar?.name ?? ""} · {formatDuration(syncedDuration)}</Text>
            <View className="mt-1 h-1 overflow-hidden rounded bg-sand-100 dark:bg-ink-800" accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: syncedDuration || 100, now: Math.floor(syncedPosition) }}>
              <View style={{ width: `${syncedDuration ? Math.min(100, (syncedPosition / syncedDuration) * 100) : 0}%` }} className="h-1 bg-forest-500 dark:bg-forest-600" />
            </View>
          </View>
        </Pressable>
      </Link>
      <View className="mt-2 flex-row items-center justify-between">
        <View className="flex-row gap-2">
          <Pressable accessibilityRole="button" accessibilityLabel="Previous track" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} onPress={async () => { const { playPrevious } = usePlayerStore.getState(); if (playPrevious()) { const q = usePlayerStore.getState(); if (q.currentEpisode) await playEpisode(q.currentEpisode, q.queue); } }} className="rounded-full border border-sand-200 px-4 py-2.5 active:opacity-80 dark:border-ink-700"><Text className="text-xs font-semibold text-ink dark:text-ink-100">Prev</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={isTrackPlaying ? "Pause" : "Play"} hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} onPress={togglePlayPause} className="rounded-full bg-forest-600 px-5 py-2.5 active:opacity-90 dark:bg-forest-500"><Text className="text-xs font-bold text-white">{isTrackPlaying ? "Pause" : "Play"}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next track" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} onPress={async () => { const { playNext } = usePlayerStore.getState(); if (playNext()) { const q = usePlayerStore.getState(); if (q.currentEpisode) await playEpisode(q.currentEpisode, q.queue); } }} className="rounded-full border border-sand-200 px-4 py-2.5 active:opacity-80 dark:border-ink-700"><Text className="text-xs font-semibold text-ink dark:text-ink-100">Next</Text></Pressable>
        </View>
        <View className="flex-row gap-2">
          <Pressable accessibilityRole="button" accessibilityLabel={`Queue ${queue.length} items`} hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => setShowQueue((v) => !v)} className="rounded-full bg-sand-50 px-4 py-2.5 active:opacity-80 dark:bg-ink-800"><Text className="text-xs font-semibold text-ink dark:text-ink-100">Queue{queue.length ? ` ${queue.length}` : ""}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Playback speed ${speed} times`} hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => { const idx = speeds.indexOf(speed); const next = speeds[(idx + 1) % speeds.length] as typeof speed; usePlayerStore.getState().setSpeed(next); try { TrackPlayer.setPlaybackSpeed(next); } catch {} }} className="rounded-full bg-sand-50 px-4 py-2.5 active:opacity-80 dark:bg-ink-800"><Text className="text-xs font-semibold text-ink dark:text-ink-100">{speed}×</Text></Pressable>
        </View>
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="font-mono text-xs text-ink-500 dark:text-ink-400">{formatDuration(Math.floor(syncedPosition))} / {formatDuration(Math.floor(syncedDuration))}</Text>
        {usePlayerStore.getState().sleepTimerRemaining !== null ? <Text className="text-xs font-semibold text-clay-600 dark:text-clay-400">Sleep {formatDuration(usePlayerStore.getState().sleepTimerRemaining ?? 0)}</Text> : null}
      </View>
      </View>
    </>
  );
}
