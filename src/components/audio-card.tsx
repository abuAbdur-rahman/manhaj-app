import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

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
    const artwork = (episode.series as unknown as { cover_url?: string })?.cover_url ?? episode.scholar?.photo_url ?? null;
    return (
      <View className="w-48 shrink-0 rounded-2xl border border-sand-200 bg-sand-50 p-3 dark:border-ink-800 dark:bg-ink-900" accessibilityRole="text">
        <View className="flex-row items-start justify-between">
          {artwork ? (
            <Image source={{ uri: artwork }} style={{ width: 32, height: 32, borderRadius: 16 }} contentFit="cover" cachePolicy="memory-disk" priority="low" accessibilityLabel={`${scholarName} artwork`} />
          ) : (
            <View className="h-8 w-8 items-center justify-center rounded-full bg-forest-600">
              <Text className="text-xs font-bold text-white">{scholarName[0]?.toUpperCase() ?? "?"}</Text>
            </View>
          )}
          <Text className="font-mono text-xs text-ink-500 dark:text-ink-400">{dur}</Text>
        </View>
        <Link href={(href ?? `/lectures/${episode.slug}`) as never} asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={`${title} by ${scholarName}`} hitSlop={8} style={{ minHeight: 48 }}>
            <Text className="mt-2 line-clamp-2 text-sm font-semibold text-ink dark:text-ink-100" numberOfLines={2}>
              {title}
            </Text>
            {scholarName ? <Text className="mt-0.5 text-xs text-ink-500 dark:text-ink-400" numberOfLines={1}>{scholarName}</Text> : null}
          </Pressable>
        </Link>
        <View className="mt-1 flex-row flex-wrap gap-1">
          {episode.tags.slice(0, 2).map((t) => (
            <Text key={t} className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-400">{t}</Text>
          ))}
        </View>
        {onPlay ? (
          <Pressable
            onPress={() => onPlay(episode)}
            accessibilityRole="button"
            accessibilityLabel={`Play ${title}`}
            hitSlop={8}
            className="mt-3 h-11 w-11 items-center justify-center self-end rounded-full bg-forest-600 active:opacity-80"
          >
            <MaterialCommunityIcons name="play" size={20} color="#ffffff" />
          </Pressable>
        ) : null}
      </View>
    );
  }

  const artwork = (episode.series as unknown as { cover_url?: string })?.cover_url ?? episode.scholar?.photo_url ?? null;
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-sand-200 bg-white px-4 py-3 dark:border-ink-800 dark:bg-ink-900" style={{ minHeight: 56 }}>
      <Link href={(href ?? `/lectures/${episode.slug}`) as never} asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${title} by ${scholarName}`} className="flex-1 flex-row items-center gap-3" style={{ minHeight: 48 }}>
          {number !== undefined ? (
            <Text className="w-6 text-right font-mono text-xs font-semibold text-forest-600 dark:text-forest-100">{number}</Text>
          ) : artwork ? (
            <Image source={{ uri: artwork }} style={{ width: 44, height: 44, borderRadius: 10 }} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel={`${scholarName} artwork`} />
          ) : null}
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-ink dark:text-ink-100" numberOfLines={1}>
              {title}
            </Text>
            {scholarName ? <Text className="text-xs font-medium text-ink-500 dark:text-ink-400" numberOfLines={1}>{scholarName}</Text> : null}
            <View className="mt-1 flex-row flex-wrap gap-1">
              <Text className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                {episode.language.slice(0, 3)}
              </Text>
              {episode.tags.slice(0, 1).map((t) => (
                <Text key={t} className="rounded-full bg-sand-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-ink-600 dark:bg-ink-800 dark:text-ink-400">
                  {t}
                </Text>
              ))}
            </View>
          </View>
          <Text className="font-mono text-xs font-medium text-ink-500 dark:text-ink-400">{dur}</Text>
        </Pressable>
      </Link>
      {onPlay ? (
        <Pressable
          onPress={() => onPlay(episode)}
          accessibilityRole="button"
          accessibilityLabel={`Play ${title}`}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center self-center rounded-full bg-forest-600 active:opacity-80"
        >
          <MaterialCommunityIcons name="play" size={20} color="#ffffff" />
        </Pressable>
      ) : null}
    </View>
  );
}

export function AudioCardSkeleton({ variant = "row" }: { variant?: Variant }) {
  if (variant === "card") {
    return <View className="h-32 w-48 shrink-0 rounded-2xl bg-sand-100 dark:bg-ink-800" />;
  }
  return <View className="h-20 rounded-2xl bg-sand-100 dark:bg-ink-800" />;
}
