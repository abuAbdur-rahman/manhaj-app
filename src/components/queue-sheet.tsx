import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { usePlayerStore } from "@/store/player";
import { playEpisode } from "@/lib/trackPlayer";

export function QueueSheet({ onClose }: { onClose?: () => void }) {
  const ref = useRef<BottomSheet>(null);
  const { queue, currentEpisode } = usePlayerStore();
  const snapPoints = useMemo(() => ["45%", "85%"], []);

  const onSelect = useCallback(
    async (idx: number) => {
      const ep = queue[idx];
      if (!ep) return;
      await playEpisode(ep, queue);
    },
    [queue],
  );

  if (queue.length === 0) {
    return (
      <BottomSheet ref={ref} index={0} snapPoints={snapPoints} enablePanDownToClose onClose={onClose} backgroundStyle={{ backgroundColor: "#fafaf7" }} handleIndicatorStyle={{ backgroundColor: "#d9d3c0" }} backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.3} />}>
        <View className="px-4 py-6 items-center gap-2">
          <Text className="text-base font-semibold text-ink">Queue empty</Text>
          <Text className="text-sm text-ink-500">Add lectures from lecture pages.</Text>
          <Pressable onPress={() => ref.current?.close()} accessibilityRole="button" className="mt-2 rounded-full bg-forest-600 px-5 py-2.5" style={{ minHeight: 48, minWidth: 48 }}><Text className="text-sm font-semibold text-white">Close</Text></Pressable>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet ref={ref} index={0} snapPoints={snapPoints} enablePanDownToClose onClose={onClose} backgroundStyle={{ backgroundColor: "#fafaf7" }} handleIndicatorStyle={{ backgroundColor: "#d9d3c0" }} backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.3} />}>
      <View className="px-4 pb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-ink dark:text-ink-900">Queue · {queue.length}</Text>
        <Pressable onPress={() => ref.current?.close()} accessibilityRole="button" accessibilityLabel="Close queue" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }} className="px-4 py-2 rounded-full bg-sand-100 dark:bg-ink-800 active:opacity-80">
          <Text className="text-sm text-ink dark:text-ink-100">Close</Text>
        </Pressable>
      </View>
      <BottomSheetFlatList
        data={queue}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item, index }) => {
          const active = currentEpisode?.id === item.id;
          return (
            <Pressable
              onPress={() => onSelect(index)}
              className={`py-3 border-b flex-row items-center justify-between ${active ? "bg-forest-50 border-forest-100" : "border-sand-100"}`}
            >
              <View className="flex-1 pr-3">
                <Text numberOfLines={1} className={`text-sm ${active ? "text-forest font-semibold" : "text-ink"}`}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} className="text-xs text-ink/60">
                  {item.scholar?.name ?? ""} {item.duration_seconds ? `· ${Math.floor(item.duration_seconds / 60)}m` : ""}
                </Text>
              </View>
              {active ? <Text className="text-xs font-bold text-forest">Now</Text> : null}
            </Pressable>
          );
        }}
      />
    </BottomSheet>
  );
}
