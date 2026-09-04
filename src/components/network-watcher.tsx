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
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearOfflineTimer = () => {
      if (offlineTimerRef.current !== null) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
    };

    const commitOnline = (online: boolean) => {
      useNetworkStore.getState().setOnline(online);
      onlineManager.setOnline(online);
    };

    const handleState = (reachable: boolean | null) => {
      if (reachable === null || reachable === true) {
        // Online again (or unknown): cancel any pending offline commit and
        // assume online — matches the store's optimistic default.
        clearOfflineTimer();
        commitOnline(true);
      } else {
        // Reachable === false: only commit after a sustained offline period
        // so momentary flaps don't fire toasts mid-use. NetInfo fires its
        // callback on state changes, not periodically, so the transition has
        // to be scheduled rather than awaited as another event.
        if (offlineTimerRef.current === null) {
          offlineTimerRef.current = setTimeout(() => {
            offlineTimerRef.current = null;
            commitOnline(false);
          }, OFFLINE_DEBOUNCE_MS);
        }
      }
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      handleState(state.isInternetReachable);
    });

    // Re-fetch and process the current state when the app returns to the
    // foreground: NetInfo events can be missed while backgrounded.
    const appStateSub = AppState.addEventListener("change", async (s) => {
      if (s === "active") {
        clearOfflineTimer();
        const state = await NetInfo.fetch();
        handleState(state.isInternetReachable);
      }
    });

    return () => {
      clearOfflineTimer();
      unsubscribe();
      appStateSub.remove();
    };
  }, []);

  return null;
}
