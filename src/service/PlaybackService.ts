import TrackPlayer, { Event } from "@rntp/player";

export function registerBackgroundPlayback() {
  TrackPlayer.registerPlaybackSession(() => {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
    TrackPlayer.addEventListener(Event.RemoteSeek, (e: { position: number }) => TrackPlayer.seekTo(e.position));
    TrackPlayer.addEventListener(Event.RemoteStop, () => {
      try { TrackPlayer.pause(); } catch {}
    });
    (TrackPlayer as unknown as { addEventListener: (ev: string, cb: (e: Record<string, unknown>) => void) => void }).addEventListener("remote-duck" as unknown as Event, (e: Record<string, unknown>) => {
      try {
        if (e["paused"]) TrackPlayer.pause();
        else if (e["permanent"] === false) TrackPlayer.play();
      } catch {}
    });
    TrackPlayer.addEventListener(Event.PlaybackError, (e) => {
      try { console.warn("[PlaybackService] PlaybackError", (e as unknown as { error?: unknown }).error ?? e); } catch {}
    });
  });
}
