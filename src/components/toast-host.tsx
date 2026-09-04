import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useToastStore, type ToastMessage } from "@/store/toast";

function ToastItem({ message, kind }: { message: string; kind: ToastMessage["kind"] }) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-6));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 9, tension: 120 }),
    ]).start();
  }, [opacity, translateY]);

  const warning = kind === "warning";
  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }] }}
      className={`flex-row items-center gap-2 rounded-full px-4 py-2.5 shadow-lg ${warning ? "bg-clay-600 dark:bg-clay-400" : "bg-ink-800 dark:bg-ink-100"}`}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <MaterialCommunityIcons name={warning ? "wifi-off" : "information-outline"} size={16} color={warning ? "#ffffff" : "#fafaf7"} />
      <Text className={`text-xs font-semibold ${warning ? "text-white" : "text-sand-50 dark:text-ink-950"}`} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { top: insets.top + 8, alignItems: "center", paddingHorizontal: 24 }]}
    >
      <View pointerEvents="box-none" style={{ gap: 6, alignItems: "center" }}>
        {toasts.map((t) => (
          <ToastItem key={t.id} message={t.message} kind={t.kind} />
        ))}
      </View>
    </View>
  );
}
