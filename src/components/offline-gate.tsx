import { useEffect, useRef } from "react";
import { usePathname } from "expo-router";

import { useNetworkStore } from "@/store/network";
import { useToastStore } from "@/store/toast";

/**
 * Offline notice. The app is cached-first (React Query persisted to SQLite,
 * downloaded lectures play locally), so going offline never redirects –
 * screens keep rendering from cache. This fires one warning toast per offline
 * period when the user lands on a screen that streams remote content.
 */
export function OfflineGate() {
  const pathname = usePathname();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const offlineToastShownRef = useRef(false);

  useEffect(() => {
    if (isOnline) {
      offlineToastShownRef.current = false;
      return;
    }
    // One toast per offline period, not one per navigation.
    if (offlineToastShownRef.current) return;
    offlineToastShownRef.current = true;
    useToastStore
      .getState()
      .show("You're offline – some content may be unavailable. Saved lectures are in Downloads.", "warning");
  }, [isOnline, pathname]);

  return null;
}
