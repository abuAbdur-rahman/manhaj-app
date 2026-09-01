import "@/global.css";

import { QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { ErrorBoundary } from "@/components/error-boundary";
import { MiniPlayer } from "@/components/mini-player";
import { useLoadFonts } from "@/hooks/useLoadFonts";
import { createNativePersister } from "@/lib/query-persister";
import { queryClient } from "@/lib/queryClient";
import { registerBackgroundPlayback } from "@/service/PlaybackService";
import { usePlayerStore } from "@/store/player";
import { useThemeStore } from "@/store/theme";

// Register playback session before UI mounts — required for headless/ background
// and Android Auto/CarPlay where JS runtime may not be running for Remote* events.
// Safe on web: native module is a no-op (web engine ignores service bridge).
try {
  registerBackgroundPlayback();
} catch {}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const resolved = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
  const { loaded: fontsLoaded } = useLoadFonts();
  useEffect(() => {
    try { useThemeStore.getState().hydrate(); } catch {}
    try {
      usePlayerStore.getState().hydrate();
    } catch {}
    (async () => {
      try {
        const { setupTrackPlayer } = await import("@/lib/trackPlayer");
        await setupTrackPlayer();
      } catch {}
    })();
    const sub = AppState.addEventListener("change", (s) => focusManager.setFocused(s === "active"));
    // wire onlineManager to NetInfo for offlineFirst reconnect
    const unsubNet = NetInfo.addEventListener((s) => onlineManager.setOnline(s.isConnected ?? s.isInternetReachable ?? false));
    // @ts-ignore persistQueryClient hydra — rehydrate if present, else no-op
    try {
      // @ts-ignore experimental persister
      const { persistQueryClient } = require("@tanstack/query-persist-client-core");
      const persister = createNativePersister();
      try { persistQueryClient({ queryClient, persister: persister as unknown as never, maxAge: 1000 * 60 * 60 * 12, buster: "v1" }); } catch {}
    } catch {}
    return () => { sub.remove(); try { (unsubNet as unknown as () => void)(); } catch {} };
  }, []);
  // gate splash on fonts (Geist/Noto placeholder — system fallback until bundled)
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className={resolved === "dark" ? "dark flex-1" : "flex-1"}>
        <StatusBar style={resolved === "dark" ? "light" : "dark"} />
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AnimatedSplashOverlay />
            <View style={{ flex: 1 }}>
              <AppTabs />
              <MiniPlayer />
            </View>
          </QueryClientProvider>
        </ErrorBoundary>
      </View>
    </GestureHandlerRootView>
  );
}
