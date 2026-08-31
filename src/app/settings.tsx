import { useState, useCallback } from "react";
import { Linking, Pressable, Switch, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { getStorageCapBytes, getStorageUsedBytes, getWifiOnly, setWifiOnly, setStorageCapBytes } from "@/lib/downloads";

function fmtBytes(n: number): string {
  if (n < 1_048_576) return `${Math.round(n / 1024)} KB`;
  if (n < 1_073_741_824) return `${(n / 1_048_576).toFixed(1)} MB`;
  return `${(n / 1_073_741_824).toFixed(2)} GB`;
}

export default function SettingsScreen() {
  const [wifiOnly, setWifiOnlyState] = useState(false);
  const [cap, setCap] = useState(2 * 1024 ** 3);
  const [used, setUsed] = useState(0);

  const refresh = useCallback(() => {
    setWifiOnlyState(getWifiOnly());
    setCap(getStorageCapBytes());
    setUsed(getStorageUsedBytes());
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <SafeAreaView className="flex-1 bg-sand-50">
      <ScrollView contentContainerClassName="p-6 gap-4 pb-10">
        <View className="gap-1">
          <Text className="text-xl font-bold text-ink">Settings</Text>
          <Text className="text-sm text-ink-500">Manhaj Sunnah · com.manhaj.app · storage + playback</Text>
        </View>

        <View className="rounded-2xl border border-sand-200 bg-white p-4 gap-3">
          <Text className="text-sm font-semibold text-ink">Storage</Text>
          <Text className="text-xs text-ink-500">{fmtBytes(used)} / {fmtBytes(cap)} used</Text>
          <View className="flex-row gap-2">
            {[1, 2, 4].map((gb) => {
              const bytes = gb * 1024 ** 3;
              const active = cap === bytes;
              return (
                <Pressable key={gb} onPress={() => { setStorageCapBytes(bytes); refresh(); }} className={`rounded-full px-4 py-2 ${active ? "bg-forest-600" : "border border-sand-200 bg-white"}`}>
                  <Text className={`text-xs font-bold ${active ? "text-white" : "text-ink"}`}>{gb} GB</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="rounded-2xl border border-sand-200 bg-white p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3 gap-1">
              <Text className="text-sm font-semibold text-ink">Wi-Fi only downloads</Text>
              <Text className="text-xs leading-4 text-ink-500">When on, downloads warn on cellular (default off — spec).</Text>
            </View>
            <Switch value={wifiOnly} onValueChange={(v) => { setWifiOnly(v); refresh(); }} />
          </View>
        </View>

        <View className="rounded-2xl border border-sand-200 bg-white p-4 gap-3">
          <Text className="text-sm font-semibold text-ink">Support</Text>
          <Text className="text-xs leading-4 text-ink-500">Questions or feedback — reach us on WhatsApp or Telegram.</Text>
          <View className="flex-row flex-wrap gap-2 pt-1">
            <Pressable onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP_URL ?? "https://wa.me/2340000000000")} className="rounded-full bg-forest-600 px-4 py-2"><Text className="text-xs font-semibold text-white">WhatsApp</Text></Pressable>
            <Pressable onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_SUPPORT_TELEGRAM_URL ?? "https://t.me/manhajsupport")} className="rounded-full border border-sand-200 bg-white px-4 py-2"><Text className="text-xs font-semibold text-ink">Telegram</Text></Pressable>
          </View>
          <Text className="text-[11px] text-ink-400">Set EXPO_PUBLIC_SUPPORT_WHATSAPP_URL / TELEGRAM_URL to override.</Text>
        </View>

        <View className="rounded-2xl border border-sand-200 bg-white p-4 gap-3">
          <Text className="text-sm font-semibold text-ink">About</Text>
          <Text className="text-sm leading-5 text-ink-600">Ilm, organized — Nigerian Sunni/Salafi lectures. Offline files stay until you delete them. Background playback via track-player foreground service.</Text>
          <View className="flex-row flex-wrap gap-2 pt-2">
            <Pressable onPress={() => Linking.openURL("https://manhaj-sunnah.vercel.app/privacy")} className="rounded-full border border-sand-200 bg-sand-50 px-4 py-2"><Text className="text-xs font-semibold text-ink">Privacy</Text></Pressable>
            <Pressable onPress={() => Linking.openURL("https://manhaj-sunnah.vercel.app/download")} className="rounded-full border border-sand-200 bg-sand-50 px-4 py-2"><Text className="text-xs font-semibold text-ink">Download page</Text></Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
