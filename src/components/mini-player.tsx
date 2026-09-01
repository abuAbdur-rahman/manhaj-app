import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import TrackPlayer, { useIsPlaying, useProgress } from "@rntp/player";
import { usePlayerStore } from "@/store/player";
import { formatDuration } from "@/lib/audio";
import { togglePlayPause } from "@/lib/trackPlayer";
import { QueueSheet } from "@/components/queue-sheet";

export function MiniPlayer() {
  const { currentEpisode, currentTime, duration, speed, queue } = usePlayerStore();
  const playing = useIsPlaying();
  const progress = useProgress(1);
  const [showQueue, setShowQueue] = useState(false);

  // tick sleep timer + sync progress (v5: sync JSI getProgress)
  useEffect(() => {
    const i = setInterval(() => {
      try {
        const { position, duration: dur } = TrackPlayer.getProgress();
        if (Number.isFinite(position)) usePlayerStore.getState().setCurrentTime(position);
        if (Number.isFinite(dur) && dur > 0) usePlayerStore.getState().setDuration(dur);
      } catch {}
      const s = usePlayerStore.getState();
      if (s.sleepTimerRemaining !== null) {
        s.tickSleepTimer();
        if (getSnapshotSleepDone()) {
          try { TrackPlayer.pause(); } catch {}
        }
      }
    }, 1000);
    return () => clearInterval(i);
  }, []);

  function getSnapshotSleepDone() {
    return usePlayerStore.getState().sleepTimerRemaining === null;
  }

  if (!currentEpisode) return null;

  const syncedDuration = progress.duration || duration || currentEpisode.duration_seconds || 0;
  const syncedPosition = progress.position || currentTime;
  const isTrackPlaying = playing || usePlayerStore.getState().isPlaying;
  const speeds: (typeof speed)[] = [0.75, 1, 1.25, 1.5, 2];

  return (
    <>
      {showQueue ? <QueueSheet onClose={() => setShowQueue(false)} /> : null}
      <View className="border-t border-sand-200 bg-white px-3 py-2 shadow-sm">
      <Link href={`/lectures/${currentEpisode.slug}` as never} asChild>
        <Pressable className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-forest-50">
            <Text className="text-xs font-bold text-forest-700">{currentEpisode.language.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-ink" numberOfLines={1}>{currentEpisode.title}</Text>
            <Text className="text-xs text-ink-500" numberOfLines={1}>{currentEpisode.scholar?.name ?? ""} · {formatDuration(syncedDuration)}</Text>
            <View className="mt-1 h-1 overflow-hidden rounded bg-sand-100">
              <View style={{ width: `${syncedDuration ? Math.min(100, (syncedPosition / syncedDuration) * 100) : 0}%` }} className="h-1 bg-forest-500" />
            </View>
          </View>
        </Pressable>
      </Link>
      <View className="mt-2 flex-row items-center justify-between">
        <View className="flex-row gap-2">
          <Pressable onPress={async () => { const { playPrevious } = usePlayerStore.getState(); if (playPrevious()) { const q = usePlayerStore.getState(); if (q.currentEpisode) { const { playEpisode } = await import("@/lib/trackPlayer"); await playEpisode(q.currentEpisode, q.queue); } } }} className="rounded-full border border-sand-200 px-3 py-1.5"><Text className="text-xs font-semibold text-ink">Prev</Text></Pressable>
          <Pressable onPress={togglePlayPause} className="rounded-full bg-forest-600 px-5 py-1.5"><Text className="text-xs font-bold text-white">{isTrackPlaying ? "Pause" : "Play"}</Text></Pressable>
          <Pressable onPress={async () => { const { playNext } = usePlayerStore.getState(); if (playNext()) { const q = usePlayerStore.getState(); if (q.currentEpisode) { const { playEpisode } = await import("@/lib/trackPlayer"); await playEpisode(q.currentEpisode, q.queue); } } }} className="rounded-full border border-sand-200 px-3 py-1.5"><Text className="text-xs font-semibold text-ink">Next</Text></Pressable>
        </View>
        <View className="flex-row gap-2">
          <Pressable onPress={() => setShowQueue((v) => !v)} className="rounded-full bg-sand-50 px-3 py-1.5"><Text className="text-xs font-semibold text-ink">Queue{queue.length ? ` ${queue.length}` : ""}</Text></Pressable>
          <Pressable onPress={() => { const idx = speeds.indexOf(speed); const next = speeds[(idx + 1) % speeds.length] as typeof speed; usePlayerStore.getState().setSpeed(next); try { TrackPlayer.setPlaybackSpeed(next); } catch {} }} className="rounded-full bg-sand-50 px-3 py-1.5"><Text className="text-xs font-semibold text-ink">{speed}×</Text></Pressable>
        </View>
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="font-mono text-[11px] text-ink-500">{formatDuration(Math.floor(syncedPosition))} / {formatDuration(Math.floor(syncedDuration))}</Text>
        {usePlayerStore.getState().sleepTimerRemaining !== null ? <Text className="text-[11px] font-semibold text-amber-700">Sleep {formatDuration(usePlayerStore.getState().sleepTimerRemaining ?? 0)}</Text> : null}
      </View>
      </View>
    </>
  );
}
