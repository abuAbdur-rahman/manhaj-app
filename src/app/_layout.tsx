import "@/global.css";

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { ErrorBoundary } from "@/components/error-boundary";
import { MiniPlayer } from "@/components/mini-player";
import { queryClient } from "@/lib/queryClient";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
    // hydrate player queue + position from SQLite
    try { require("@/store/player").usePlayerStore.getState().hydrate(); } catch {}
    // register track-player service (no-op if already)
    import("react-native-track-player").then(async (TP) => {
      try { await TP.default.registerPlaybackService(() => require("@/service/PlaybackService").PlaybackService); } catch {}
      try { const { setupTrackPlayer } = await import("@/lib/trackPlayer"); await setupTrackPlayer(); } catch {}
    });
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
