import { create } from "zustand";

interface NetworkState {
  /** Optimistic default: assume online until NetInfo reports otherwise, so the
      first render (splash / cold start) is never gated on a null state. */
  isOnline: boolean;
  setOnline: (online: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  setOnline: (online) => set({ isOnline: online }),
}));
