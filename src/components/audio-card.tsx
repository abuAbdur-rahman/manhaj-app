import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { formatDuration } from "@/lib/audio";
import type { Episode } from "@/types";

type Variant = "row" | "card";

interface Props {
  episode: Episode;
  variant?: Variant;
  number?: number;
  onPlay?: (e: Episode) => void;
  onDownload?: (e: Episode) => void;
  href?: string;
}

export function AudioCard({ episode, variant = "row", number, onPlay, href }: Props) {
  const dur = formatDuration(episode.duration_seconds ?? 0);
  const scholarName = episode.scholar?.name ?? "";
  const title = episode.title;

  if (variant === "card") {
    return (
      <View className="w-48 shrink-0 rounded-2xl border border-sand-200 bg-sand-50 p-3">
        <View className="flex-row items-center justify-between">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-forest-600">
            <Text className="text-xs font-bold text-white">{scholarName[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <Text className="font-mono text-xs text-ink-500">{dur}</Text>
        </View>
        <Link href={(href ?? `/lectures/${episode.slug}`) as never} asChild>
          <Pressable>
            <Text className="mt-2 line-clamp-2 text-sm font-semibold text-ink" numberOfLines={2}>
              {title}
            </Text>
          </Pressable>
        </Link>
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => onPlay?.(episode)}
            className="flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-forest-700 py-2"
          >
            <Text className="text-sm font-semibold text-white">Play</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Link href={(href ?? `/lectures/${episode.slug}`) as never} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-2xl border border-sand-200 bg-white px-4 py-3 active:opacity-80">
        {number !== undefined && (
          <Text className="w-6 text-right font-mono text-xs font-semibold text-forest-400">{number}</Text>
        )}
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
            {title}
          </Text>
          {scholarName ? <Text className="text-xs font-medium text-ink-500">{scholarName}</Text> : null}
          <View className="mt-1 flex-row gap-1">
            <Text className="rounded bg-forest-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-forest-600">
              {episode.language.slice(0, 3)}
            </Text>
            {episode.tags.slice(0, 1).map((t) => (
              <Text key={t} className="rounded bg-sand-100 px-2 py-0.5 text-[10px] font-medium text-ink-600">
                {t}
              </Text>
            ))}
          </View>
        </View>
        <View className="items-end gap-1">
          <Text className="font-mono text-xs font-medium text-ink-500">{dur}</Text>
          {onPlay && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onPlay(episode);
              }}
              className="rounded-full bg-forest-50 px-3 py-1.5"
            >
              <Text className="text-xs font-semibold text-forest-700">Play</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

export function AudioCardSkeleton({ variant = "row" }: { variant?: Variant }) {
  if (variant === "card") {
    return <View className="h-32 w-48 shrink-0 rounded-2xl bg-sand-100" />;
  }
  return <View className="h-20 rounded-2xl bg-sand-100" />;
}
