import { create } from "zustand";
import type { Episode, Speed } from "@/types";
import { kvDelete, kvGet, kvSet } from "@/lib/db";

const PLAYER_STATE_KEY = "player_state_v1";
const PLAYER_POSITION_KEY = "player_position_v1";

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
function persistPosition(time: number, speed: Speed) {
  try {
    kvSet(PLAYER_POSITION_KEY, JSON.stringify({ currentTime: time, speed }));
  } catch {}
}
export function flushPositionPersist() {
  if (persistTimeDebounce) {
    clearTimeout(persistTimeDebounce);
    persistTimeDebounce = null;
  }
  // persist latest in-memory state synchronously
  try {
    const s = usePlayerStore.getState();
    persist(s);
    persistPosition(s.currentTime, s.speed);
    lastPersistAt = Date.now();
  } catch {}
}
function persistTimeDebounced(state: Pick<PlayerStore, "currentTime" | "speed">) {
  const now = Date.now();
  const elapsed = now - lastPersistAt;
  // throttle: persist at most every 5s during continuous playback, otherwise debounce 5s
  const doPersist = () => {
    persistPosition(state.currentTime, state.speed);
    lastPersistAt = Date.now();
  };
  if (elapsed >= 5000) {
    if (persistTimeDebounce) clearTimeout(persistTimeDebounce);
    persistTimeDebounce = null;
    doPersist();
    return;
  }
  if (persistTimeDebounce) return;
  persistTimeDebounce = setTimeout(doPersist, 5000);
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
  sleepTimerPreset: number | null;
  miniPlayerHidden: boolean;
  setEpisode: (episode: Episode) => void;
  setQueue: (episodes: Episode[], startIndex?: number) => void;
  setActiveIndex: (index: number) => void;
  playNext: () => boolean;
  playPrevious: () => boolean;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setSpeed: (speed: Speed) => void;
  setLoading: (loading: boolean) => void;
  setSleepTimer: (seconds: number | null) => void;
  tickSleepTimer: () => void;
  hideMiniPlayer: () => void;
  showMiniPlayer: () => void;
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
  sleepTimerPreset: null as number | null,
  miniPlayerHidden: false,
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
  sleepTimerPreset: null,
  miniPlayerHidden: false,

  hideMiniPlayer: () => set({ miniPlayerHidden: true }),
  showMiniPlayer: () => set({ miniPlayerHidden: false }),

  hydrate: () => {
    const p = loadPersisted();
    if (!p) return;
    let currentTime = p.currentTime;
    let speed = p.speed;
    try {
      const raw = kvGet(PLAYER_POSITION_KEY);
      if (raw) {
        const pos = JSON.parse(raw) as { currentTime?: number; speed?: Speed };
        if (typeof pos.currentTime === "number") currentTime = pos.currentTime;
        if (pos.speed) speed = pos.speed;
      }
    } catch {}
    set({ currentEpisode: p.currentEpisode, queue: p.queue, queueIndex: p.queueIndex, currentTime, speed, duration: p.currentEpisode?.duration_seconds ?? 0 });
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

  setActiveIndex: (index) => {
    const { queue } = get();
    if (index < 0 || index >= queue.length) return;
    const ep = queue[index];
    set((s) => {
      const next = {
        currentEpisode: ep,
        queueIndex: index,
        currentTime: 0,
        duration: ep.duration_seconds ?? 0,
        isLoading: false,
      } as Partial<PlayerStore>;
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
  setCurrentTime: (time) => {
    set({ currentTime: time });
    const s = get();
    persistTimeDebounced({ currentTime: time, speed: s.speed });
  },
  setDuration: (duration) => set({ duration }),
  setSpeed: (speed) => {
    set({ speed });
    const s = get();
    persistTimeDebounced({ currentTime: s.currentTime, speed });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setSleepTimer: (seconds) => set({ sleepTimerRemaining: seconds, sleepTimerPreset: seconds }),
  tickSleepTimer: () => {
      const current = get().sleepTimerRemaining;
      if (current === null) return;
      if (current <= 1) {
        set({ sleepTimerRemaining: null, sleepTimerPreset: null, isPlaying: false });
         import("@rntp/player").then((m) => (m.default ?? m).pause()).catch(() => {});
     } else set({ sleepTimerRemaining: current - 1 });
   },
  clear: () =>
    set(() => {
      try {
        kvDelete(PLAYER_STATE_KEY);
        kvDelete(PLAYER_POSITION_KEY);
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
        sleepTimerPreset: null,
        miniPlayerHidden: false,
      };
    }),
}));
