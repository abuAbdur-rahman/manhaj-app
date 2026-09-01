import TrackPlayer, { PlayerCommand } from "@rntp/player";
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
    // v5: setupPlayer/setCommands are synchronous JSI (void) — still guard dedup
    TrackPlayer.setupPlayer({
      contentType: "speech",
      handleAudioBecomingNoisy: true,
      android: {
        taskRemovedBehavior: "stop",
        audioMixing: { duck: true } as unknown as { duck: boolean },
      } as unknown as Record<string, unknown>,
      progressUpdateEventInterval: 1,
    } as unknown as Parameters<typeof TrackPlayer.setupPlayer>[0]);
    TrackPlayer.setCommands({
      capabilities: [
        PlayerCommand.PlayPause,
        PlayerCommand.Next,
        PlayerCommand.Previous,
        PlayerCommand.Seek,
        PlayerCommand.Stop,
      ],
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
    // gate notification already done; ensure queue committed before play
    const tracks = (queue ?? [episode]).map((ep) => {
      const u = getLocalUri(ep.id) ?? ep.audio_url;
      if (!u) throw new Error(`Episode ${ep.title} has no audio URL`);
      return {
        mediaId: ep.id,
        url: u as string,
        title: ep.title,
        artist: ep.scholar?.name ?? "Manhaj Sunnah",
        artworkUrl: (ep.series as unknown as { cover_url?: string })?.cover_url ?? ep.scholar?.photo_url ?? undefined,
        duration: ep.duration_seconds ?? undefined,
      };
    });
    try { (TrackPlayer as unknown as { clear?: () => void }).clear?.(); } catch {}
    await (TrackPlayer as unknown as { setMediaItems: (t: unknown, i: number) => Promise<void> }).setMediaItems(tracks, startIndex);
    await (TrackPlayer as unknown as { play: () => Promise<void> }).play();
    usePlayerStore.getState().setPlaying(true);
    usePlayerStore.getState().setLoading(false);
  } catch (e) {
    void logAppError({ message: String(e), stack: (e as Error)?.stack, route: "playEpisode" });
    throw e;
  }
}

export async function togglePlayPause(): Promise<void> {
  try {
    const isPlaying = TrackPlayer.isPlaying();
    if (isPlaying) {
      TrackPlayer.pause();
      usePlayerStore.getState().setPlaying(false);
    } else {
      TrackPlayer.play();
      usePlayerStore.getState().setPlaying(true);
    }
  } catch (e) {
    void logAppError({ message: String(e), stack: (e as Error)?.stack, route: "togglePlayPause" });
    throw e;
  }
}

export async function seekTo(seconds: number): Promise<void> {
  TrackPlayer.seekTo(seconds);
}
