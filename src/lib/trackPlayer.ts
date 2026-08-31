import TrackPlayer, { Capability, AppKilledPlaybackBehavior, State } from "react-native-track-player";
import type { Episode } from "@/types";
import { getLocalUri } from "@/lib/downloads";
import { logAppError } from "@/lib/logError";
import { requestNotificationPermissionOnce } from "@/lib/permissions";
import { usePlayerStore } from "@/store/player";

let setupDone = false;
let setupPromise: Promise<void> | null = null;

export async function setupTrackPlayer(): Promise<void> {
  if (setupDone) return;
  if (setupPromise) return setupPromise;
  setupPromise = (async () => {
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
  })();
  try {
    await setupPromise;
  } finally {
    setupPromise = null;
  }
}

export async function playEpisode(episode: Episode, queue?: Episode[]): Promise<void> {
  try {
    await requestNotificationPermissionOnce();
    const { setEpisode, setQueue } = usePlayerStore.getState();
    const startIndex = queue && queue.length > 0 ? Math.max(0, queue.findIndex((e) => e.id === episode.id)) : 0;
    if (queue && queue.length > 0) setQueue(queue, startIndex);
    else setEpisode(episode);

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
    await TrackPlayer.add(tracks);
    if (startIndex > 0) await TrackPlayer.skip(startIndex);
    await TrackPlayer.play();
    usePlayerStore.getState().setPlaying(true);
    usePlayerStore.getState().setLoading(false);
  } catch (e) {
    void logAppError({ message: String(e), stack: (e as Error)?.stack, route: "playEpisode" });
    throw e;
  }
}

export async function togglePlayPause(): Promise<void> {
  try {
    const playbackState = await TrackPlayer.getPlaybackState();
    const st = (playbackState as unknown as { state?: State })?.state ?? (playbackState as unknown as State);
    const isPlaying = st === State.Playing;
    if (isPlaying) {
      await TrackPlayer.pause();
      usePlayerStore.getState().setPlaying(false);
    } else {
      await TrackPlayer.play();
      usePlayerStore.getState().setPlaying(true);
    }
  } catch (e) {
    void logAppError({ message: String(e), stack: (e as Error)?.stack, route: "togglePlayPause" });
    throw e;
  }
}

export async function seekTo(seconds: number): Promise<void> {
  await TrackPlayer.seekTo(seconds);
}
