import NetInfo from "@react-native-community/netinfo";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import TrackPlayer, { useIsPlaying, useProgress } from "@rntp/player";
import { useShallow } from "zustand/react/shallow";

import { AudioCard } from "@/components/audio-card";
import { BackButton } from "@/components/back-button";
import { ErrorState } from "@/components/empty-state";
import { Scrubber } from "@/components/scrubber";
import { Colors } from "@/constants/theme";
import { formatDuration } from "@/lib/audio";
import { type DownloadRow, downloadEpisode, getDownload, getLocalUri, isPlayableEpisode, subscribeDownloads } from "@/lib/downloads";
import { playEpisode, seekTo, togglePlayPause } from "@/lib/trackPlayer";
import { useEpisodeBySlug, useSeriesWithEpisodes } from "@/hooks/useManhajQueries";
import { usePlayerStore } from "@/store/player";
import type { Episode, Speed } from "@/types";

const SPEEDS: Speed[] = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS: (number | null)[] = [null, 900, 1800, 3600];

function fmtBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 10) return `${mb.toFixed(1)} MB`;
  return `${Math.round(mb)} MB`;
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function LectureScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const q = useEpisodeBySlug(slug ?? "");
  const ep = q.data;
  const scheme = useColorScheme();
  const c = Colors[scheme === "dark" ? "dark" : "light"];

  const [dlProgress, setDlProgress] = useState<number | null>(null);
  const [dlBusy, setDlBusy] = useState(false);
  const [dlInfo, setDlInfo] = useState<DownloadRow | null>(null);

  const { currentEpisode, currentTime, duration, speed, sleepTimerRemaining, sleepTimerPreset } = usePlayerStore(
    useShallow((s) => ({
      currentEpisode: s.currentEpisode,
      currentTime: s.currentTime,
      duration: s.duration,
      speed: s.speed,
      sleepTimerRemaining: s.sleepTimerRemaining,
      sleepTimerPreset: s.sleepTimerPreset,
    })),
  );
  const playing = useIsPlaying();
  const progress = useProgress(1);

  const seriesQ = useSeriesWithEpisodes(ep?.scholar?.slug ?? "", ep?.series?.slug ?? "");

  // live download info
  useEffect(() => {
    if (!ep) return;
    const refresh = () => setDlInfo(getDownload(ep.id));
    refresh();
    return subscribeDownloads(refresh);
  }, [ep]);

  // sync playback progress into store while this episode is the active one
  const isActive = !!ep && currentEpisode?.id === ep.id;
  useEffect(() => {
    if (!isActive) return;
    try {
      if (Number.isFinite(progress.position)) usePlayerStore.getState().setCurrentTime(progress.position);
      if (Number.isFinite(progress.duration) && progress.duration > 0) usePlayerStore.getState().setDuration(progress.duration);
    } catch {}
  }, [isActive, progress.position, progress.duration]);

  // hooks before any early return
  const seriesEpisodes = useMemo(() => seriesQ.data?.episodes ?? [], [seriesQ.data]);
  const moreFromSeries = useMemo(
    () => seriesEpisodes.filter((x) => x.id !== ep?.id).slice(0, 5),
    [seriesEpisodes, ep?.id],
  );

  if (q.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
        <View className="flex-row items-center px-2 pt-2">
          <BackButton />
        </View>
        <View className="gap-4 p-6">
          <View className="mt-4 aspect-square max-w-[280px] self-center rounded-2xl bg-sand-100 dark:bg-ink-800" style={{ width: "70%" }} />
          <View className="h-5 w-3/4 rounded bg-sand-100 dark:bg-ink-800" />
          <View className="h-4 w-1/2 rounded bg-sand-100 dark:bg-ink-800" />
          <View className="h-12 rounded-full bg-sand-100 dark:bg-ink-800" />
        </View>
      </SafeAreaView>
    );
  }
  if (q.isError || !ep) {
    return (
      <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
        <View className="flex-row items-center px-2 pt-2">
          <BackButton />
        </View>
        <ErrorState message={q.isError ? "Failed to load lecture" : "Lecture not found"} onRetry={() => q.refetch()} />
      </SafeAreaView>
    );
  }

  const isDownloaded = !!dlInfo || !!getLocalUri(ep.id);
  const hasAudio = !!ep.audio_url || isDownloaded;

  // single source of truth for time; JSI duration wins once it resolves (>0),
  // otherwise fall back to store duration then DB duration — fixes "0:00" bug
  const syncedDuration = isActive
    ? progress.duration > 0
      ? progress.duration
      : duration || ep.duration_seconds || 0
    : ep.duration_seconds || 0;
  const syncedPosition = isActive ? progress.position || currentTime : 0;
  const isTrackPlaying = isActive && (playing || usePlayerStore.getState().isPlaying);

  const seriesIndex = seriesEpisodes.length > 1 ? seriesEpisodes.findIndex((x) => x.id === ep.id) : -1;

  const handlePlay = async () => {
    if (isActive) {
      togglePlayPause();
      return;
    }
    try {
      await playEpisode(ep);
      try {
        const { logPlayLocal } = await import("@/lib/db");
        logPlayLocal(ep.id, getLocalUri(ep.id) ? "offline" : "stream");
      } catch {}
    } catch {
      Alert.alert("Playback failed", "Something went wrong. Please try again.");
    }
  };

  const goPrev = () => {
    try {
      TrackPlayer.skipToPrevious();
    } catch {}
  };
  const goNext = () => {
    try {
      TrackPlayer.skipToNext();
    } catch {}
  };

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length] as Speed;
    usePlayerStore.getState().setSpeed(next);
    try {
      TrackPlayer.setPlaybackSpeed(next);
    } catch {}
  };

  const cycleSleep = () => {
    const idx = SLEEP_OPTIONS.indexOf(sleepTimerPreset);
    const next = SLEEP_OPTIONS[(idx + 1) % SLEEP_OPTIONS.length];
    usePlayerStore.getState().setSleepTimer(next);
  };

  const handleSeek = (seconds: number) => {
    if (!isActive) return;
    seekTo(seconds);
  };

  const handleShare = async () => {
    const url = `https://manhaj-sunnah.vercel.app/lectures/${ep.slug}`;
    try {
      await Share.share({ message: `${ep.title} — ${url}`, url });
    } catch {}
  };

  const handleDownload = async () => {
    if (isDownloaded) return;
    // cellular warning if wifi-only toggle is ON
    try {
      const state = await NetInfo.fetch();
      const { getWifiOnly } = await import("@/lib/downloads");
      if (getWifiOnly() && state.type === "cellular") {
        const ok = await new Promise<boolean>((res) =>
          Alert.alert("Cellular download", "You are on mobile data. Continue?", [
            { text: "Cancel", onPress: () => res(false), style: "cancel" },
            { text: "Download", onPress: () => res(true) },
          ]),
        );
        if (!ok) return;
      }
    } catch {}
    setDlBusy(true);
    setDlProgress(0);
    try {
      let lastStep = -1;
      await downloadEpisode(ep, (w, t) => {
        if (t > 0) {
          const pct = Math.round((w / t) * 100);
          if (pct - lastStep >= 5 || pct === 100) {
            lastStep = pct;
            setDlProgress(pct);
          }
        }
      });
      setDlProgress(100);
    } catch {
      Alert.alert("Download failed", "Something went wrong. Please try again.");
    } finally {
      setDlBusy(false);
      setTimeout(() => setDlProgress(null), 800);
    }
  };

  const playFromSeries = (e: Episode) => {
    const queue = seriesEpisodes.filter(isPlayableEpisode);
    playEpisode(e, queue.length ? queue : [e]).catch(() => {
      Alert.alert("Playback failed", "Something went wrong. Please try again.");
    });
  };

  const artwork = ep.series?.cover_url ?? ep.scholar?.photo_url ?? null;

  return (
    <SafeAreaView className="flex-1 bg-sand-50 dark:bg-ink-950">
      <ScrollView contentContainerClassName="gap-6 px-6 pb-16 pt-2">
        <View className="flex-row items-center justify-between">
          <BackButton />
          <Text className="text-xs font-semibold uppercase tracking-widest text-forest-600 dark:text-forest-100" numberOfLines={1}>
            {ep.series ? ep.series.title : "Lecture"}
          </Text>
          <View style={{ minWidth: 48 }} />
        </View>

        {artwork ? (
          <Image
            source={{ uri: artwork }}
            style={{ width: 260, height: 260, borderRadius: 24, alignSelf: "center" }}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityLabel={`${ep.scholar?.name ?? ""} artwork`}
          />
        ) : (
          <View className="aspect-square items-center justify-center self-center rounded-3xl bg-forest-600 dark:bg-forest-500" style={{ width: 260 }}>
            <Text className="text-6xl font-bold text-white">{ep.scholar?.name?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
        )}

        <View className="items-center gap-1.5 px-2">
          <Text className="text-center text-xl font-bold leading-7 text-ink dark:text-ink-100">{ep.title}</Text>
          {ep.scholar ? (
            <Link href={`/scholars/${ep.scholar.slug}` as never} asChild>
              <Pressable accessibilityRole="link" accessibilityLabel={`More from ${ep.scholar?.name}`} hitSlop={8} style={{ minHeight: 44 }}>
                <Text className="text-sm font-semibold text-forest-700 dark:text-forest-100">{ep.scholar.name}</Text>
              </Pressable>
            </Link>
          ) : null}
          <View className="mt-1 flex-row flex-wrap items-center justify-center gap-2">
            <Text className="rounded-full bg-forest-50 px-2 py-1 text-xs font-semibold uppercase text-forest-700 dark:bg-forest-900 dark:text-forest-100">{ep.language}</Text>
            <Text className="font-mono text-xs font-medium text-ink-500 dark:text-ink-400">{formatDuration(ep.duration_seconds ?? 0)}</Text>
            {seriesIndex >= 0 ? (
              <Text className="rounded-full bg-sand-100 px-2 py-1 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-400">
                Episode {seriesIndex + 1} of {seriesEpisodes.length}
              </Text>
            ) : null}
          </View>
        </View>

        {hasAudio ? (
          <View className="gap-2">
            <Scrubber duration={syncedDuration} position={syncedPosition} onSeek={handleSeek} disabled={!isActive} />
            <View className="flex-row items-center justify-between">
              <Text className="font-mono text-xs text-ink-500 dark:text-ink-400">{formatDuration(Math.floor(syncedPosition))}</Text>
              <Text className="font-mono text-xs text-ink-500 dark:text-ink-400">-{formatDuration(Math.floor(Math.max(0, syncedDuration - syncedPosition)))}</Text>
            </View>
          </View>
        ) : null}

        <View className="flex-row items-center justify-center gap-10">
          <Pressable onPress={goPrev} accessibilityRole="button" accessibilityLabel="Previous lecture" hitSlop={8} style={{ minHeight: 56, minWidth: 56, alignItems: "center", justifyContent: "center" }} className="active:opacity-60">
            <MaterialCommunityIcons name="skip-previous" size={38} color={c.textSecondary} />
          </Pressable>
          <Pressable
            onPress={handlePlay}
            disabled={!hasAudio}
            accessibilityRole="button"
            accessibilityLabel={isTrackPlaying ? "Pause" : "Play lecture"}
            hitSlop={8}
            style={{ minHeight: 84, minWidth: 84, alignItems: "center", justifyContent: "center" }}
            className="rounded-full bg-forest-600 active:opacity-90 dark:bg-forest-500"
          >
            <MaterialCommunityIcons name={isTrackPlaying ? "pause" : "play"} size={42} color="#ffffff" />
          </Pressable>
          <Pressable onPress={goNext} accessibilityRole="button" accessibilityLabel="Next lecture" hitSlop={8} style={{ minHeight: 56, minWidth: 56, alignItems: "center", justifyContent: "center" }} className="active:opacity-60">
            <MaterialCommunityIcons name="skip-next" size={38} color={c.textSecondary} />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-center gap-2">
          <Pressable
            onPress={cycleSpeed}
            accessibilityRole="button"
            accessibilityLabel={`Playback speed ${speed} times`}
            hitSlop={8}
            style={{ minHeight: 44, justifyContent: "center" }}
            className="flex-row items-center gap-1.5 rounded-full border border-sand-200 bg-white px-4 py-2 active:opacity-80 dark:border-ink-700 dark:bg-ink-800"
          >
            <MaterialCommunityIcons name="play-speed" size={18} color={c.text} />
            <Text className="text-xs font-semibold text-ink dark:text-ink-100">{speed}×</Text>
          </Pressable>
          <Pressable
            onPress={cycleSleep}
            accessibilityRole="button"
            accessibilityLabel={sleepTimerRemaining === null ? "Set sleep timer" : `Sleep timer ${formatDuration(sleepTimerRemaining)}`}
            hitSlop={8}
            style={{ minHeight: 44, justifyContent: "center" }}
            className="flex-row items-center gap-1.5 rounded-full border border-sand-200 bg-white px-4 py-2 active:opacity-80 dark:border-ink-700 dark:bg-ink-800"
          >
            <MaterialCommunityIcons name="weather-night" size={18} color={sleepTimerRemaining === null ? c.textSecondary : c.clay} />
            <Text className="text-xs font-semibold text-ink dark:text-ink-100">
              {sleepTimerRemaining === null ? "Sleep" : formatDuration(sleepTimerRemaining)}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share lecture"
            hitSlop={8}
            style={{ minHeight: 44, justifyContent: "center" }}
            className="flex-row items-center gap-1.5 rounded-full border border-sand-200 bg-white px-4 py-2 active:opacity-80 dark:border-ink-700 dark:bg-ink-800"
          >
            <MaterialCommunityIcons name="share-variant" size={18} color={c.text} />
            <Text className="text-xs font-semibold text-ink dark:text-ink-100">Share</Text>
          </Pressable>
        </View>

        <View className="items-center">
          {isDownloaded ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 dark:bg-forest-900" accessibilityLabel="Saved on this phone">
              <MaterialCommunityIcons name="check-circle" size={14} color={c.forest} />
              <Text className="text-xs font-semibold text-forest-700 dark:text-forest-100">Saved on your phone — plays without internet</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1.5" accessibilityLabel="Plays over the internet">
              <MaterialCommunityIcons name="cloud-outline" size={14} color={c.textSecondary} />
              <Text className="text-xs text-ink-500 dark:text-ink-400">Plays over the internet</Text>
            </View>
          )}
          {dlInfo?.file_size_bytes ? (
            <Text className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">
              {fmtBytes(dlInfo.file_size_bytes)}{dlInfo.downloaded_at ? ` · saved ${fmtDate(dlInfo.downloaded_at)}` : ""}
            </Text>
          ) : null}
        </View>

        {!isDownloaded && hasAudio ? (
          <View className="items-center">
            <Pressable
              disabled={dlBusy}
              onPress={handleDownload}
              accessibilityRole="button"
              accessibilityLabel={dlBusy ? "Downloading" : "Download for offline listening"}
              hitSlop={8}
              style={{ minHeight: 48, justifyContent: "center" }}
              className={`flex-row items-center gap-2 rounded-full border px-6 py-3 active:opacity-80 dark:border-ink-700 ${
                dlBusy ? "border-sand-200 bg-sand-100 opacity-70 dark:bg-ink-800" : "border-sand-200 bg-white dark:bg-ink-800"
              }`}
            >
              <MaterialCommunityIcons name={dlBusy ? "progress-download" : "download"} size={20} color={c.text} />
              <Text className="text-sm font-semibold text-ink dark:text-ink-100">
                {dlBusy ? (dlProgress !== null ? `Downloading… ${dlProgress}%` : "Downloading…") : "Save for later"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {ep.description ? (
          <View className="gap-2 rounded-2xl border border-sand-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
            <Text className="text-xs font-semibold uppercase tracking-widest text-forest-600 dark:text-forest-100">About this lecture</Text>
            <Text className="text-sm leading-5 text-ink-700 dark:text-ink-100">{ep.description}</Text>
          </View>
        ) : null}

        {ep.tags.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {ep.tags.map((t) => (
              <Text key={t} className="rounded-full bg-sand-100 px-2 py-1 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-400">
                {t}
              </Text>
            ))}
          </View>
        ) : null}

        {moreFromSeries.length > 0 && ep.scholar && ep.series ? (
          <View className="gap-3">
            <Link href={`/scholars/${ep.scholar.slug}/series/${ep.series.slug}` as never} asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Open full series" hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text className="text-sm font-bold text-ink dark:text-ink-100">
                  More from {ep.series.title}
                </Text>
              </Pressable>
            </Link>
            <View className="gap-2">
              {moreFromSeries.map((x) => (
                <AudioCard key={x.id} episode={x} onPlay={playFromSeries} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
