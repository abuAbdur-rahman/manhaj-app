import "@/global.css";

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppState, View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { ErrorBoundary } from "@/components/error-boundary";
import { MiniPlayer } from "@/components/mini-player";
import { createNativePersister } from "@/lib/query-persister";
import { queryClient } from "@/lib/queryClient";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

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
        const TP = await import("react-native-track-player");
        await TP.default.registerPlaybackService(() => require("@/service/PlaybackService").PlaybackService);
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
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <AnimatedSplashOverlay />
            <View style={{ flex: 1 }}>
              <AppTabs />
              <MiniPlayer />
            </View>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
