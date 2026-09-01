import TrackPlayer, { Event } from "@rntp/player";

export function registerBackgroundPlayback() {
  TrackPlayer.registerPlaybackSession(() => {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
    TrackPlayer.addEventListener(Event.RemoteSeek, (e: { position: number }) => TrackPlayer.seekTo(e.position));
    // v5 handles audio ducking natively via audioMixing config; keep no-op for compat
  });
}
