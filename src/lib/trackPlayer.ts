import TrackPlayer, { Capability, AppKilledPlaybackBehavior } from "react-native-track-player";
import type { Episode } from "@/types";
import { getLocalUri } from "@/lib/downloads";
import { requestNotificationPermissionOnce } from "@/lib/permissions";
import { usePlayerStore } from "@/store/player";

let setupDone = false;

export async function setupTrackPlayer(): Promise<void> {
  if (setupDone) return;
  await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
    capabilities: [Capability.Play, Capability.Pause, Capability.SeekTo, Capability.SkipToNext, Capability.SkipToPrevious, Capability.SetRating],
    compactCapabilities: [Capability.Play, Capability.Pause],
    progressUpdateEventInterval: 1,
  });
  setupDone = true;
}

export async function playEpisode(episode: Episode, queue?: Episode[]): Promise<void> {
  await requestNotificationPermissionOnce();
  const { setEpisode, setQueue } = usePlayerStore.getState();
  if (queue && queue.length > 0) {
    const idx = queue.findIndex((e) => e.id === episode.id);
    setQueue(queue, idx >= 0 ? idx : 0);
  } else {
    setEpisode(episode);
  }

  const localUri = getLocalUri(episode.id);
  const url = localUri ?? episode.audio_url;
  if (!url) throw new Error("No audio URL");

  await setupTrackPlayer();
  await TrackPlayer.reset();
  const tracks = (queue ?? [episode]).map((ep) => {
    const u = getLocalUri(ep.id) ?? ep.audio_url;
    if (!u) throw new Error(`Episode ${ep.title} has no audio URL`);
    return {
      id: ep.id,
      url: u as string,
      title: ep.title,
      artist: ep.scholar?.name ?? "Manhaj Sunnah",
      artwork: (ep.series as unknown as { cover_url?: string })?.cover_url ?? ep.scholar?.photo_url ?? undefined,
      duration: ep.duration_seconds ?? undefined,
    };
  });
  const startIndex = queue ? Math.max(0, queue.findIndex((e) => e.id === episode.id)) : 0;
  await TrackPlayer.add(tracks);
  if (startIndex > 0) await TrackPlayer.skip(startIndex);
  await TrackPlayer.play();
  usePlayerStore.getState().setPlaying(true);
  usePlayerStore.getState().setLoading(false);
}

export async function togglePlayPause(): Promise<void> {
  const { isPlaying, setPlaying } = usePlayerStore.getState();
  if (isPlaying) {
    await TrackPlayer.pause();
    setPlaying(false);
  } else {
    await TrackPlayer.play();
    setPlaying(true);
  }
}

export async function seekTo(seconds: number): Promise<void> {
  await TrackPlayer.seekTo(seconds);
}
