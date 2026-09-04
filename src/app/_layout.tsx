import "@/global.css";

import { focusManager, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import NetInfo from "@react-native-community/netinfo";
import * as SplashScreen from "expo-splash-screen";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, StyleSheet, View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colorScheme } from "nativewind";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { DownloadProgressChip } from "@/components/download-progress-chip";
import { ErrorBoundary } from "@/components/error-boundary";
import { MiniPlayer } from "@/components/mini-player";
import { OfflineGate } from "@/components/offline-gate";
import { ToastHost } from "@/components/toast-host";
import { useLoadFonts } from "@/hooks/useLoadFonts";
import { createNativePersister } from "@/lib/query-persister";
import { queryClient } from "@/lib/queryClient";
import { registerBackgroundPlayback } from "@/service/PlaybackService";
import { useNetworkStore } from "@/store/network";
import { usePlayerStore } from "@/store/player";
import { useThemeStore } from "@/store/theme";
import { BottomTabInset } from "@/constants/theme";

// Register playback session before UI mounts — required for headless/ background
// and Android Auto/CarPlay where JS runtime may not be running for Remote* events.
// Safe on web: native module is a no-op (web engine ignores service bridge).
try {
  registerBackgroundPlayback();
} catch {}

SplashScreen.preventAutoHideAsync();

// SQLite-backed offline cache restore (cached-first contract). Created once so
// PersistQueryClientProvider gates child fetching until restore completes.
const nativePersister = createNativePersister();

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const resolved = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { loaded: fontsLoaded } = useLoadFonts();
  // Drive NativeWind's colorScheme observable so dark: variants re-evaluate on manual theme change.
  useEffect(() => {
    try {
      colorScheme.set(resolved);
    } catch {}
  }, [resolved]);
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
    // wire onlineManager + network store to NetInfo for offlineFirst reconnect + offline gating
    const unsubNet = NetInfo.addEventListener((s) => {
      const online = s.isInternetReachable ?? s.isConnected ?? false;
      onlineManager.setOnline(online);
      useNetworkStore.getState().setOnline(online);
    });
    return () => { sub.remove(); try { (unsubNet as unknown as () => void)(); } catch {} };
  }, []);
  // gate splash on fonts
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // MiniPlayer docks above the native tab bar on tab screens; on pushed detail
  // screens (lectures/[slug], scholars/[slug], series) it rests on the system nav bar.
  const isTabRoot = !pathname || pathname === "/" || pathname.split("/").filter(Boolean).length === 1;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className={resolved === "dark" ? "dark flex-1" : "flex-1"}>
        <StatusBar style={resolved === "dark" ? "light" : "dark"} />
        <ErrorBoundary>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: nativePersister, maxAge: 1000 * 60 * 60 * 12, buster: "v1" }}
          >
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }} />
            <OfflineGate />
            <ToastHost />
            <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
              <View
                pointerEvents="box-none"
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: isTabRoot ? BottomTabInset + 120 : Math.max(insets.bottom, 8) + 120,
                  alignItems: "center",
                }}
              >
                <DownloadProgressChip />
              </View>
              <View
                pointerEvents="box-none"
                style={{ position: "absolute", left: 0, right: 0, bottom: isTabRoot ? BottomTabInset : Math.max(insets.bottom, 8) }}
              >
                <MiniPlayer />
              </View>
            </View>
          </PersistQueryClientProvider>
        </ErrorBoundary>
      </View>
    </GestureHandlerRootView>
  );
}
