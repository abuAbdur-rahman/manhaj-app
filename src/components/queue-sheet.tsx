import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo, useRef } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useShallow } from "zustand/react/shallow";
import { usePlayerStore } from "@/store/player";
import { playEpisode } from "@/lib/trackPlayer";
import { Colors } from "@/constants/theme";

export function QueueSheet({ onClose }: { onClose?: () => void }) {
  const ref = useRef<BottomSheet>(null);
  const { queue, currentEpisode } = usePlayerStore(
    useShallow((s) => ({ queue: s.queue, currentEpisode: s.currentEpisode })),
  );
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  const c = Colors[scheme === "dark" ? "dark" : "light"];
  const snapPoints = useMemo(() => ["45%", "85%"], []);
  const bgStyle = useMemo(() => ({ backgroundColor: dark ? "#1c231e" : "#fafaf7" }), [dark]);
  const handleStyle = useMemo(() => ({ backgroundColor: dark ? "#2a332c" : "#d9d3c0" }), [dark]);

  const onSelect = useCallback(
    async (idx: number) => {
      const ep = queue[idx];
      if (!ep) return;
      await playEpisode(ep, queue);
    },
    [queue],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof queue)[number]; index: number }) => {
      const active = currentEpisode?.id === item.id;
      return (
        <Pressable
          onPress={() => onSelect(index)}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          className={`py-3 border-b flex-row items-center justify-between ${active ? "bg-forest-50 border-forest-100" : "border-sand-100 dark:border-ink-800"}`}
        >
          <View className="flex-1 pr-3">
            <Text numberOfLines={1} className={`text-sm ${active ? "text-forest-600 font-semibold dark:text-forest-100" : "text-ink dark:text-ink-100"}`}>
              {item.title}
            </Text>
            <Text numberOfLines={1} className="text-xs text-ink-500 dark:text-ink-400">
              {item.scholar?.name ?? ""} {item.duration_seconds ? `· ${Math.floor(item.duration_seconds / 60)}m` : ""}
            </Text>
          </View>
          {active ? (
            <View className="flex-row items-center gap-1">
              <MaterialCommunityIcons name="volume-high" size={14} color={c.forest} />
              <Text className="text-xs font-bold text-forest-600 dark:text-forest-100">Now</Text>
            </View>
          ) : null}
        </Pressable>
      );
    },
    [currentEpisode, onSelect, c.forest],
  );

  if (queue.length === 0) {
    return (
      <BottomSheet ref={ref} index={0} snapPoints={snapPoints} enablePanDownToClose onClose={onClose} backgroundStyle={bgStyle} handleIndicatorStyle={handleStyle} backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.3} />}>
        <View className="px-4 py-6 items-center gap-2">
          <Text className="text-base font-semibold text-ink dark:text-ink-100">Queue empty</Text>
          <Text className="text-sm text-ink-500 dark:text-ink-400">Add lectures from lecture pages.</Text>
          <Pressable onPress={() => ref.current?.close()} accessibilityRole="button" className="mt-2 flex-row items-center justify-center gap-1.5 rounded-full bg-forest-600 px-5 py-2.5" style={{ minHeight: 48, minWidth: 48 }}><MaterialCommunityIcons name="close" size={16} color="#ffffff" /><Text className="text-sm font-semibold text-white">Close</Text></Pressable>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet ref={ref} index={0} snapPoints={snapPoints} enablePanDownToClose onClose={onClose} backgroundStyle={bgStyle} handleIndicatorStyle={handleStyle} backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.3} />}>
      <View className="px-4 pb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-ink dark:text-ink-100">Queue · {queue.length}</Text>
        <Pressable onPress={() => ref.current?.close()} accessibilityRole="button" accessibilityLabel="Close queue" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} className="flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-sand-100 dark:bg-ink-800 active:opacity-80">
          <MaterialCommunityIcons name="chevron-down" size={18} color={c.text} />
          <Text className="text-sm text-ink dark:text-ink-100">Close</Text>
        </Pressable>
      </View>
      <BottomSheetFlatList
        data={queue}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={renderItem}
      />
    </BottomSheet>
  );
}
