import { useState, useCallback } from "react";
import { Linking, Pressable, Switch, Text, View, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as Updates from "expo-updates";

import { getStorageCapBytes, getStorageUsedBytes, getWifiOnly, setWifiOnly, setStorageCapBytes } from "@/lib/downloads";
import { BottomTabInset } from "@/constants/theme";
import { useThemeStore, type ThemePreference } from "@/store/theme";

function fmtBytes(n: number): string {
  if (n < 1_048_576) return `${Math.round(n / 1024)} KB`;
  if (n < 1_073_741_824) return `${(n / 1_048_576).toFixed(1)} MB`;
  return `${(n / 1_073_741_824).toFixed(2)} GB`;
}

const showDevHints = __DEV__ || Updates.channel === "preview";


export default function SettingsScreen() {
  const [wifiOnly, setWifiOnlyState] = useState(false);
  const [cap, setCap] = useState(2 * 1024 ** 3);
  const [used, setUsed] = useState(0);
  const themePref = useThemeStore((s) => s.preference);
  const setThemePref = useThemeStore((s) => s.setPreference);
  const insets = useSafeAreaInsets();

  const refresh = useCallback(() => {
    setWifiOnlyState(getWifiOnly());
    setCap(getStorageCapBytes());
    setUsed(getStorageUsedBytes());
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: Math.max(40, insets.bottom + BottomTabInset + 24) }}>
        <View className="gap-1 pt-1">
          <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600 dark:text-forest-100">Manhaj Sunnah</Text>
          <Text className="text-xl font-bold text-ink dark:text-white">Settings</Text>
          <Text className="text-sm text-ink-500 dark:text-ink-400">Storage, downloads & playback</Text>
        </View>

        <View className="rounded-2xl border border-sand-200 dark:border-ink-800 bg-white dark:bg-ink-800 p-4 gap-3">
          <Text className="text-sm font-semibold text-ink dark:text-white">Appearance</Text>
          <Text className="text-xs leading-4 text-ink-500 dark:text-ink-400">Theme persists to SQLite (system follows device).</Text>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {(["system", "light", "dark"] as ThemePreference[]).map((v) => {
              const active = themePref === v;
              return (
                <Pressable key={v} onPress={() => setThemePref(v)} accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={`Theme ${v}`} hitSlop={8} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center' }} className={`rounded-full px-5 py-2.5 ${active ? "bg-forest-600" : "border border-sand-200 dark:border-ink-700 bg-white dark:bg-ink-900"}`}>
                  <Text className={`text-xs font-bold capitalize ${active ? "text-white" : "text-ink dark:text-white"}`}>{v}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="rounded-2xl border border-sand-200 dark:border-ink-800 bg-white dark:bg-ink-800 p-4 gap-3">
          <Text className="text-sm font-semibold text-ink dark:text-white">Storage</Text>
          <Text className="text-xs text-ink-500 dark:text-ink-400">{fmtBytes(used)} / {fmtBytes(cap)} used</Text>
          <View className="flex-row flex-wrap gap-2">
            {[1, 2, 4].map((gb) => {
              const bytes = gb * 1024 ** 3;
              const active = cap === bytes;
              return (
                <Pressable key={gb} onPress={() => { setStorageCapBytes(bytes); refresh(); }} accessibilityRole="button" accessibilityLabel={`Set storage cap ${gb} gigabytes`} accessibilityState={{ selected: active }} hitSlop={8} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center' }} className={`rounded-full px-5 py-2.5 ${active ? "bg-forest-600" : "border border-sand-200 dark:border-ink-700 bg-white dark:bg-ink-900"}`}>
                  <Text className={`text-xs font-bold ${active ? "text-white" : "text-ink dark:text-white"}`}>{gb} GB</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="rounded-2xl border border-sand-200 dark:border-ink-800 bg-white dark:bg-ink-800 p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3 gap-1">
              <Text className="text-sm font-semibold text-ink dark:text-white">Wi-Fi only downloads</Text>
              <Text className="text-xs leading-4 text-ink-500 dark:text-ink-400">Ask before downloading over cellular data.</Text>
            </View>
            <Switch value={wifiOnly} onValueChange={(v) => { setWifiOnly(v); refresh(); }} accessibilityLabel="Wi-Fi only downloads" />
          </View>
        </View>

        <View className="rounded-2xl border border-sand-200 dark:border-ink-800 bg-white dark:bg-ink-800 p-4 gap-3">
          <Text className="text-sm font-semibold text-ink dark:text-white">Support</Text>
          <Text className="text-xs leading-4 text-ink-500 dark:text-ink-400">Questions or feedback - we&apos;d love to hear from you.</Text>
          <View className="flex-row flex-wrap gap-2 pt-1">
          {process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP_URL ? (
            <Pressable onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP_URL!)} accessibilityRole="button" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} className="rounded-full bg-forest-600 px-5 py-2.5"><Text className="text-xs font-semibold text-white">WhatsApp</Text></Pressable>
          ) : null}
          {process.env.EXPO_PUBLIC_SUPPORT_TELEGRAM_URL ? (
            <Pressable onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_SUPPORT_TELEGRAM_URL!)} accessibilityRole="button" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} className="rounded-full border border-sand-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-5 py-2.5"><Text className="text-xs font-semibold text-ink dark:text-white">Telegram</Text></Pressable>
          ) : null}
        </View>
          {showDevHints ? (
            <Text className="text-xs text-ink-400 dark:text-ink-400">Set EXPO_PUBLIC_SUPPORT_WHATSAPP_URL / EXPO_PUBLIC_SUPPORT_TELEGRAM_URL to show contact buttons.</Text>
          ) : null}
        </View>

        <View className="rounded-2xl border border-sand-200 dark:border-ink-800 bg-white dark:bg-ink-800 p-4 gap-3">
          <Text className="text-sm font-semibold text-ink dark:text-white">About</Text>
          <Text className="text-sm leading-5 text-ink-600 dark:text-ink-100">Ilm, organized — Nigerian Sunni/Salafi lectures. Offline files stay until you delete them. Background playback via track-player foreground service.</Text>
          <View className="flex-row flex-wrap gap-2 pt-2">
            <Pressable onPress={() => Linking.openURL("https://manhaj-sunnah.vercel.app/privacy")} accessibilityRole="button" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} className="rounded-full border border-sand-200 dark:border-ink-700 bg-sand-50 dark:bg-ink-900 px-5 py-2.5"><Text className="text-xs font-semibold text-ink dark:text-white">Privacy</Text></Pressable>
            <Pressable onPress={() => Linking.openURL("https://manhaj-sunnah.vercel.app/download")} accessibilityRole="button" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} className="rounded-full border border-sand-200 dark:border-ink-700 bg-sand-50 dark:bg-ink-900 px-5 py-2.5"><Text className="text-xs font-semibold text-ink dark:text-white">Download page</Text></Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
