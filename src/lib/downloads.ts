import * as FileSystem from "expo-file-system/legacy";
import NetInfo from "@react-native-community/netinfo";
import type { Episode } from "@/types";
import { getDb, kvGet, kvSet } from "@/lib/db";

export const DEFAULT_CAP_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
export const CAP_KEY = "storage_cap_bytes";
export const WIFI_ONLY_KEY = "wifi_only_downloads";
const AUDIO_DIR = "audio";

export function isAllowedAudioHost(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const r2 = process.env.EXPO_PUBLIC_R2_PUBLIC_URL ?? "";
    if (r2) {
      try {
        if (u.host === new URL(r2).host) return true;
      } catch {}
    }
    // also allow supabase storage host if audio ever hosted there
    const supa = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
    if (supa) {
      try {
        if (u.host === new URL(supa).host) return true;
      } catch {}
    }
    // no generic fallback — only explicit R2/Supabase hosts allowed
    return false;
  } catch {
    return false;
  }
}

export function isPlayableEpisode(ep: Episode): boolean {
  return !!getLocalUri(ep.id) || (!!ep.audio_url && isAllowedAudioHost(ep.audio_url));
}

function audioDir(): string {
  const base = FileSystem.documentDirectory ?? null;
  if (!base) throw new Error("No documentDirectory available");
  return `${base}${AUDIO_DIR}/`;
}

async function ensureAudioDir() {
  const dir = audioDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

export function getStorageCapBytes(): number {
  const raw = kvGet(CAP_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CAP_BYTES;
}
export function setStorageCapBytes(bytes: number): void {
  kvSet(CAP_KEY, String(bytes));
}
export function getWifiOnly(): boolean {
  return kvGet(WIFI_ONLY_KEY) === "1";
}
export function setWifiOnly(v: boolean): void {
  kvSet(WIFI_ONLY_KEY, v ? "1" : "0");
}

export type DownloadRow = {
  episode_id: string;
  title: string;
  scholar_name: string;
  file_uri: string;
  downloaded_at: string;
  file_size_bytes: number;
};

type Listener = () => void;
const listeners = new Set<Listener>();
function notifyDownloadsChanged() {
  for (const l of listeners) l();
}
export function subscribeDownloads(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type DownloadProgress = {
  episodeId: string;
  title: string;
  writtenBytes: number;
  totalBytes: number;
  percent: number;
};

const activeMap = new Map<string, DownloadProgress>();
let progressListeners = new Set<(p: DownloadProgress | null) => void>();

function getPrimaryProgress(): DownloadProgress | null {
  if (activeMap.size === 0) return null;
  // most recently updated is last inserted (upsert re-inserts)
  let last: DownloadProgress | null = null;
  for (const v of activeMap.values()) last = v;
  return last;
}

export function getActiveDownloadProgress(): DownloadProgress | null {
  return getPrimaryProgress();
}
export function subscribeDownloadProgress(listener: (p: DownloadProgress | null) => void): () => void {
  progressListeners.add(listener);
  listener(getPrimaryProgress());
  return () => {
    progressListeners.delete(listener);
  };
}
function notifyProgress() {
  const primary = getPrimaryProgress();
  for (const l of progressListeners) l(primary);
}
function upsertProgress(p: DownloadProgress) {
  activeMap.delete(p.episodeId);
  activeMap.set(p.episodeId, p);
  notifyProgress();
}
function clearProgress(episodeId: string) {
  activeMap.delete(episodeId);
  notifyProgress();
}
// kept for backwards compat — clears single entry if given, or all if null
function setActiveDownload(p: DownloadProgress | null) {
  if (p === null) {
    activeMap.clear();
    notifyProgress();
    return;
  }
  upsertProgress(p);
}

export function getAllDownloads(): DownloadRow[] {
  return getDb().getAllSync<DownloadRow>(`SELECT * FROM downloads ORDER BY downloaded_at DESC`);
}
export function getDownload(episodeId: string): DownloadRow | null {
  return getDb().getFirstSync<DownloadRow>(`SELECT * FROM downloads WHERE episode_id = ?`, [episodeId]) ?? null;
}
export function getStorageUsedBytes(): number {
  const row = getDb().getFirstSync<{ total: number }>(`SELECT COALESCE(SUM(file_size_bytes),0) as total FROM downloads`);
  return row?.total ?? 0;
}

export async function shouldWarnCellular(): Promise<boolean> {
  if (!getWifiOnly()) return false;
  const state = await NetInfo.fetch();
  // NetInfo: type cellular|wifi|unknown; isConnected may be null offline.
  // Warn if not wifi (cellular or unknown) and isInternetReachable !== false when known
  return state.type !== "wifi";
}

export function getLocalUri(episodeId: string): string | null {
  return getDownload(episodeId)?.file_uri ?? null;
}

export async function downloadEpisode(ep: Episode, onProgress?: (written: number, total: number) => void): Promise<string> {
  if (!/^[0-9a-f-]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ep.id)) throw new Error("Invalid episode id");
  const existing = getDownload(ep.id);
  if (existing) {
    const info = await FileSystem.getInfoAsync(existing.file_uri);
    if (info.exists) return existing.file_uri;
    getDb().runSync(`DELETE FROM downloads WHERE episode_id = ?`, [ep.id]);
  }

  if (!ep.audio_url) throw new Error("Episode has no audio URL");
  if (!isAllowedAudioHost(ep.audio_url)) throw new Error("Audio URL host not allowed");
  // cap check — estimate from HEAD; post-download check is authoritative
  const used = getStorageUsedBytes();
  const cap = getStorageCapBytes();
  // try HEAD to get size with 8s timeout (may CORS fail -> expected 0, fall through to post-check)
  let expected = 0;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    const head = await fetch(ep.audio_url, { method: "HEAD", signal: ac.signal as unknown as AbortSignal });
    clearTimeout(t);
    const len = head.headers.get("content-length");
    if (len) expected = Number(len);
  } catch {}
  if (expected > 0 && used + expected > cap) {
    throw new Error(`Storage cap would be exceeded (${Math.round((used + expected) / 1e6)} MB > ${Math.round(cap / 1e6)} MB). Free space in Settings → Downloads.`);
  }
  if (expected === 0 && used > cap * 0.9) {
    throw new Error("Storage near cap and size unknown — free space before downloading.");
  }

  const dir = await ensureAudioDir();
  const dest = `${dir}${ep.id}.mp3`;

  upsertProgress({ episodeId: ep.id, title: ep.title, writtenBytes: 0, totalBytes: expected, percent: 0 });
  const dl = FileSystem.createDownloadResumable(ep.audio_url, dest, {}, (p) => {
    const total = p.totalBytesExpectedToWrite > 0 ? p.totalBytesExpectedToWrite : expected;
    const percent = total > 0 ? Math.min(100, Math.round((p.totalBytesWritten / total) * 100)) : 0;
    upsertProgress({ episodeId: ep.id, title: ep.title, writtenBytes: p.totalBytesWritten, totalBytes: total, percent });
    onProgress?.(p.totalBytesWritten, total);
  });
  let res: Awaited<ReturnType<typeof dl.downloadAsync>>;
  try {
    res = await dl.downloadAsync();
  } catch (e) {
    clearProgress(ep.id);
    throw e;
  }
  const resUri = res?.uri ?? null;
  if (!resUri) {
    clearProgress(ep.id);
    throw new Error("Download failed — no file returned");
  }

  let sizeBytes = expected;
  const dlInfo = await FileSystem.getInfoAsync(resUri);
  if (dlInfo.exists && "size" in dlInfo) {
    const sz = (dlInfo as { size?: number }).size;
    if (sz && sz > 0) sizeBytes = sz;
  }

  // re-check cap post-download
  const usedAfter = getStorageUsedBytes();
  if (usedAfter + sizeBytes > cap) {
    await FileSystem.deleteAsync(resUri, { idempotent: true });
    clearProgress(ep.id);
    throw new Error("Download would exceed 2 GB cap — remove some downloads first.");
  }

  getDb().runSync(`INSERT OR REPLACE INTO downloads (episode_id, title, scholar_name, file_uri, downloaded_at, file_size_bytes) VALUES (?,?,?,?,?,?)`, [
    ep.id,
    ep.title,
    ep.scholar?.name ?? "",
    resUri,
    new Date().toISOString(),
    sizeBytes,
  ]);
  clearProgress(ep.id);
  notifyDownloadsChanged();
  return resUri;
}

export async function removeDownload(episodeId: string): Promise<void> {
  const row = getDownload(episodeId);
  if (row) {
    try {
      await FileSystem.deleteAsync(row.file_uri, { idempotent: true });
    } catch {}
    getDb().runSync(`DELETE FROM downloads WHERE episode_id = ?`, [episodeId]);
    notifyDownloadsChanged();
  }
}

export async function removeAllDownloads(): Promise<void> {
  const rows = getAllDownloads();
  for (const r of rows) {
    try {
      await FileSystem.deleteAsync(r.file_uri, { idempotent: true });
    } catch {}
  }
  getDb().runSync(`DELETE FROM downloads`);
  // try remove dir
  try {
    await FileSystem.deleteAsync(audioDir(), { idempotent: true });
  } catch {}
  notifyDownloadsChanged();
}
