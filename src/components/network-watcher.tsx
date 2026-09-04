import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

import { useNetworkStore } from "@/store/network";

// The app's offline contract is cached-first: React Query persists to SQLite
// for 12h, so Home/Scholars/Search render from cache and downloaded lectures
// keep playing with no connection. The store therefore only tracks reachability;
// the OfflineGate shows a toast, it never redirects away from cached screens.
// Debounce: isInternetReachable flaps for a second or two on cell/Wi-Fi
// handoff — require this much sustained offline before flipping the store.
const OFFLINE_DEBOUNCE_MS = 2500;

export function NetworkWatcher() {
  const offlineSinceRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable;
      if (reachable === null || reachable === true) {
        offlineSinceRef.current = null;
        useNetworkStore.getState().setOnline(true);
        onlineManager.setOnline(true);
        return;
      }
      // Reachable === false: only commit after a sustained offline period so
      // momentary flaps don't fire toasts mid-use.
      const now = Date.now();
      if (offlineSinceRef.current === null) {
        offlineSinceRef.current = now;
      }
      if (now - offlineSinceRef.current >= OFFLINE_DEBOUNCE_MS) {
        useNetworkStore.getState().setOnline(false);
        onlineManager.setOnline(false);
      }
    });

    // Re-evaluate when the app returns to the foreground: NetInfo events can
    // be missed while backgrounded.
    const appStateSub = AppState.addEventListener("change", (s) => {
      if (s === "active") offlineSinceRef.current = null;
    });

    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, []);

  return null;
}
