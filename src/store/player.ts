import { create } from "zustand";
import type { Episode, Speed } from "@/types";
import { kvDelete, kvGet, kvSet } from "@/lib/db";

const PLAYER_STATE_KEY = "player_state_v1";

type PersistedPlayer = {
  currentEpisode: Episode | null;
  queue: Episode[];
  queueIndex: number;
  currentTime: number;
  speed: Speed;
};

function loadPersisted(): PersistedPlayer | null {
  try {
    const raw = kvGet(PLAYER_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedPlayer;
  } catch {
    return null;
  }
}
function persist(state: Pick<PlayerStore, "currentEpisode" | "queue" | "queueIndex" | "currentTime" | "speed">) {
  try {
    const payload: PersistedPlayer = {
      currentEpisode: state.currentEpisode,
      queue: state.queue,
      queueIndex: state.queueIndex,
      currentTime: state.currentTime,
      speed: state.speed,
    };
    kvSet(PLAYER_STATE_KEY, JSON.stringify(payload));
  } catch {}
}
let persistTimeDebounce: ReturnType<typeof setTimeout> | null = null;
let lastPersistAt = 0;
export function flushPositionPersist() {
  if (persistTimeDebounce) {
    clearTimeout(persistTimeDebounce);
    persistTimeDebounce = null;
  }
  // persist latest in-memory state synchronously
  try {
    const s = usePlayerStore.getState();
    persist(s);
    lastPersistAt = Date.now();
  } catch {}
}
function persistTimeDebounced(state: PlayerStore) {
  const now = Date.now();
  const elapsed = now - lastPersistAt;
  // throttle: persist at most every 5s during continuous playback, otherwise debounce 5s
  if (elapsed >= 5000) {
    if (persistTimeDebounce) clearTimeout(persistTimeDebounce);
    persistTimeDebounce = null;
    persist(state);
    lastPersistAt = now;
    return;
  }
  if (persistTimeDebounce) return;
  persistTimeDebounce = setTimeout(() => {
    persist(state);
    lastPersistAt = Date.now();
    persistTimeDebounce = null;
  }, 5000);
}

interface PlayerStore {
  currentEpisode: Episode | null;
  queue: Episode[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: Speed;
  isLoading: boolean;
  sleepTimerRemaining: number | null;
  setEpisode: (episode: Episode) => void;
  setQueue: (episodes: Episode[], startIndex?: number) => void;
  playNext: () => boolean;
  playPrevious: () => boolean;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setSpeed: (speed: Speed) => void;
  setLoading: (loading: boolean) => void;
  setSleepTimer: (seconds: number | null) => void;
  tickSleepTimer: () => void;
  clear: () => void;
  hydrate: () => void;
}

const episodeState = (episode: Episode) => ({
  currentEpisode: episode,
  currentTime: 0,
  duration: episode.duration_seconds ?? 0,
  isPlaying: true,
  isLoading: true,
  sleepTimerRemaining: null as number | null,
});

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentEpisode: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  speed: 1 as Speed,
  isLoading: false,
  sleepTimerRemaining: null,

  hydrate: () => {
    const p = loadPersisted();
    if (!p) return;
    set({ currentEpisode: p.currentEpisode, queue: p.queue, queueIndex: p.queueIndex, currentTime: p.currentTime, speed: p.speed, duration: p.currentEpisode?.duration_seconds ?? 0 });
  },

  setEpisode: (episode) =>
    set((s) => {
      const next = { ...episodeState(episode), queue: [episode], queueIndex: 0 } as Partial<PlayerStore>;
      const merged = { ...s, ...next } as PlayerStore;
      persist(merged);
      return next;
    }),

  setQueue: (episodes, startIndex = 0) => {
    if (episodes.length === 0) return;
    const safeIndex = Math.min(Math.max(startIndex, 0), episodes.length - 1);
    set((s) => {
      const next = { ...episodeState(episodes[safeIndex]), queue: episodes, queueIndex: safeIndex } as Partial<PlayerStore>;
      const merged = { ...s, ...next } as PlayerStore;
      persist(merged);
      return next;
    });
  },

  playNext: () => {
    const { queue, queueIndex } = get();
    if (queueIndex < 0 || queueIndex >= queue.length - 1) {
      set({ isPlaying: false });
      return false;
    }
    const nextIndex = queueIndex + 1;
    const ep = queue[nextIndex];
    const next = { ...episodeState(ep), queueIndex: nextIndex } as Partial<PlayerStore>;
    set((s) => {
      persist({ ...s, ...next } as unknown as PlayerStore);
      return next;
    });
    return true;
  },

  playPrevious: () => {
    const { queue, queueIndex } = get();
    if (queueIndex <= 0) return false;
    const previousIndex = queueIndex - 1;
    const ep = queue[previousIndex];
    const next = { ...episodeState(ep), queueIndex: previousIndex } as Partial<PlayerStore>;
    set((s) => {
      persist({ ...s, ...next } as unknown as PlayerStore);
      return next;
    });
    return true;
  },

  setPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) =>
    set((s) => {
      persistTimeDebounced({ ...s, currentTime: time } as PlayerStore);
      return { currentTime: time };
    }),
  setDuration: (duration) => set({ duration }),
  setSpeed: (speed) =>
    set((s) => {
      persist({ ...s, speed } as PlayerStore);
      return { speed };
    }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSleepTimer: (seconds) => set({ sleepTimerRemaining: seconds }),
  tickSleepTimer: () => {
    const current = get().sleepTimerRemaining;
    if (current === null) return;
    if (current <= 1) {
      set({ sleepTimerRemaining: null, isPlaying: false });
        import("@rntp/player").then((m) => m.default.pause()).catch(() => {});
    } else set({ sleepTimerRemaining: current - 1 });
  },
  clear: () =>
    set(() => {
      try {
        kvDelete(PLAYER_STATE_KEY);
      } catch {}
      if (persistTimeDebounce) clearTimeout(persistTimeDebounce);
      return {
        currentEpisode: null,
        queue: [],
        queueIndex: -1,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        speed: 1 as Speed,
        isLoading: false,
        sleepTimerRemaining: null,
      };
    }),
}));
