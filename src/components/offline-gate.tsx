import { usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { useNetworkStore } from "@/store/network";
import { useToastStore } from "@/store/toast";

// Routes that are usable with no internet connection: Downloads (plays saved
// files) and Settings (all local). Everything else streams/lists remote content.
const OFFLINE_SAFE = new Set(["/downloads", "/settings"]);

function requiresOnline(pathname: string): boolean {
  if (!pathname) return false;
  return !OFFLINE_SAFE.has(pathname);
}

/**
 * YouTube-style offline guard. When the app has no internet and the user lands
 * on (or tries to open) any route that needs a connection — Home, Scholars,
 * Search, a lecture or series page — show an "offline" toast and drop them back
 * on the Downloads tab where saved lectures still play.
 */
export function OfflineGate() {
  const pathname = usePathname();
  const router = useRouter();
  const isOnline = useNetworkStore((s) => s.isOnline);

  useEffect(() => {
    if (isOnline) return;
    if (!requiresOnline(pathname)) return;
    useToastStore.getState().show("You're offline — saved lectures are in Downloads.", "warning");
    router.replace("/downloads");
  }, [isOnline, pathname, router]);

  return null;
}
