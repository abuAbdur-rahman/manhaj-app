import TrackPlayer, { Event } from "@rntp/player";

import { logAppError } from "@/lib/logError";
import { usePlayerStore } from "@/store/player";

export function registerBackgroundPlayback() {
  TrackPlayer.registerPlaybackSession(() => {
    // Keep the Zustand store in sync with native auto-advance and
    // notification/headset transport controls (native handling).
    TrackPlayer.addEventListener(Event.MediaItemTransition, (e) => {
      try {
        const { setActiveIndex, setPlaying } = usePlayerStore.getState();
        if (typeof e.index === "number" && e.index >= 0) setActiveIndex(e.index);
        if (e.item !== null) setPlaying(true);
      } catch {}
    });
    TrackPlayer.addEventListener(Event.IsPlayingChanged, (e) => {
      try {
        usePlayerStore.getState().setPlaying(e.playing);
      } catch {}
    });
    TrackPlayer.addEventListener(Event.PlaybackError, (e) => {
      logAppError({ message: e.message, stack: undefined, route: "PlaybackService.PlaybackError" });
    });
  });
}
