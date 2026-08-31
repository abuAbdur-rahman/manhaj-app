import TrackPlayer, { Event } from "react-native-track-player";

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, (e: { position: number }) => TrackPlayer.seekTo(e.position));
  TrackPlayer.addEventListener(Event.RemoteDuck, async (e: { paused: boolean; permanent: boolean }) => {
    if (e.paused) await TrackPlayer.pause();
    else if (!e.permanent) await TrackPlayer.play();
  });
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    // handled via store playNext from UI; keep service minimal
  });
}
