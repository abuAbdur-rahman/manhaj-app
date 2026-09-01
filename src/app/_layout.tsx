import "@/global.css";

import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppState, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { ErrorBoundary } from "@/components/error-boundary";
import { MiniPlayer } from "@/components/mini-player";
import { createNativePersister } from "@/lib/query-persister";
import { queryClient } from "@/lib/queryClient";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // restore persisted queries then hide splash
    (async () => {
      try {
        const persister = createNativePersister();
        const saved = await persister.restoreClient();
        if (saved && typeof saved === "object" && "clientState" in (saved as Record<string, unknown>)) {
          // persistQueryClient would hydrate here; we keep manual restore memo for now
        }
      } catch {}
      await SplashScreen.hideAsync();
    })();
    try {
      require("@/store/player").usePlayerStore.getState().hydrate();
    } catch {}
    (async () => {
      try {
        const { registerBackgroundPlayback } = await import("@/service/PlaybackService");
        registerBackgroundPlayback();
      } catch {}
      try {
        const { setupTrackPlayer } = await import("@/lib/trackPlayer");
        await setupTrackPlayer();
      } catch {}
    })();
    const sub = AppState.addEventListener("change", (s) => focusManager.setFocused(s === "active"));
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AnimatedSplashOverlay />
          <View style={{ flex: 1 }}>
            <AppTabs />
            <MiniPlayer />
          </View>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
