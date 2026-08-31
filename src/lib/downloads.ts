import * as FileSystem from "expo-file-system";
import NetInfo from "@react-native-community/netinfo";
import type { Episode } from "@/types";
import { getDb, kvGet, kvSet } from "@/lib/db";

export const DEFAULT_CAP_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
export const CAP_KEY = "storage_cap_bytes";
export const WIFI_ONLY_KEY = "wifi_only_downloads";
const AUDIO_DIR = "audio";

function audioDir(): string {
  const base = (FileSystem as unknown as { documentDirectory?: string | null }).documentDirectory ?? "";
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
  // warn only if on cellular (or unknown but not wifi)
  return state.type === "cellular";
}

export function getLocalUri(episodeId: string): string | null {
  return getDownload(episodeId)?.file_uri ?? null;
}

export async function downloadEpisode(ep: Episode, onProgress?: (written: number, total: number) => void): Promise<string> {
  const existing = getDownload(ep.id);
  if (existing) {
    const info = await FileSystem.getInfoAsync(existing.file_uri);
    if (info.exists) return existing.file_uri;
    getDb().runSync(`DELETE FROM downloads WHERE episode_id = ?`, [ep.id]);
  }

  if (!ep.audio_url) throw new Error("Episode has no audio URL");
  // cap check — estimate from last download row or 0 if unknown
  const used = getStorageUsedBytes();
  const cap = getStorageCapBytes();
  // try HEAD to get size
  let expected = 0;
  try {
    const head = await fetch(ep.audio_url, { method: "HEAD" });
    const len = head.headers.get("content-length");
    if (len) expected = Number(len);
  } catch {}
  if (expected > 0 && used + expected > cap) {
    throw new Error(`Storage cap would be exceeded (${Math.round((used + expected) / 1e6)} MB > ${Math.round(cap / 1e6)} MB). Free space in Settings → Downloads.`);
  }

  const dir = await ensureAudioDir();
  const dest = `${dir}${ep.id}.mp3`;

  // Legacy API: FileSystem.createDownloadResumable (SDK 57 still supports)
  const FS = FileSystem as unknown as {
    createDownloadResumable?: (
      url: string,
      fileUri: string,
      opts: Record<string, unknown>,
      cb?: (p: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void,
    ) => { downloadAsync: () => Promise<{ uri: string } | null> };
  };

  let resUri: string | null = null;
  let sizeBytes = expected;

  if (FS.createDownloadResumable) {
    const dl = FS.createDownloadResumable(ep.audio_url as string, dest, {}, (p) => onProgress?.(p.totalBytesWritten, p.totalBytesExpectedToWrite));
    const res = await dl.downloadAsync();
    resUri = res?.uri ?? null;
    if (resUri) {
      const info = await FileSystem.getInfoAsync(resUri);
      if (info.exists && "size" in info) sizeBytes = (info as { size: number }).size ?? expected;
    }
  } else {
    // New File API fallback (expo-file-system >= 17)
    const { File, Directory } = FileSystem as unknown as {
      File: new (uri: string) => { uri: string; downloadAsync?: (url: string) => Promise<void>; size?: number };
      Directory: new (uri: string) => { exists: boolean };
    };
    // fallback to download via fetch + write (not resumable)
    const data = await fetch(ep.audio_url as string).then((r) => r.arrayBuffer());
    sizeBytes = data.byteLength;
    // write via legacy writeAsStringAsync base64 if needed — simplified path throws
    throw new Error("Resumable download not available on this FileSystem build — update expo-file-system");
  }

  if (!resUri) throw new Error("Download failed — no file returned");

  const dlInfo = await FileSystem.getInfoAsync(resUri);
  if (dlInfo.exists && "size" in dlInfo) {
    const sz = (dlInfo as { size?: number }).size;
    if (sz && sz > 0) sizeBytes = sz;
  }

  // re-check cap post-download
  const usedAfter = getStorageUsedBytes();
  if (usedAfter + sizeBytes > cap) {
    await FileSystem.deleteAsync(resUri, { idempotent: true });
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
  return resUri;
}

export async function removeDownload(episodeId: string): Promise<void> {
  const row = getDownload(episodeId);
  if (row) {
    try {
      await FileSystem.deleteAsync(row.file_uri, { idempotent: true });
    } catch {}
    getDb().runSync(`DELETE FROM downloads WHERE episode_id = ?`, [episodeId]);
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
}
