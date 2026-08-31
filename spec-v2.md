# Manhaj App — Sharpened Spec v2 (Expo Native Android)

**Replaces:** `spec-v2.md (deleted)` (deleted as obsolete after grilling session 2026-08-31)  
**Source of truth for:** native Android listener app in `./manhaj-app`  
**Companion:** `plan.md` (build order), `decisions.md` (grill decision log), `website-download-privacy-spec.md` (website changes)  
**Audience:** solo dev, no local Android toolchain, sideload-first then Play Store

---

## 1. What this is

A **native Android app** built in **Expo** that reuses the existing **Supabase + R2 backend** as a second client. The Next.js web app + admin panel stays exactly as-is. The app is **listener-facing only** — no admin login in the app.

**Goal:** full listener parity on native with real background playback, lock-screen controls, resilient offline downloads, and OTA updates — without reinventing backend endpoints.

**Non-goals for v1:**
- iOS (Android only; structure for iOS later if needed)
- Listener accounts / auth (pure anon RLS reads)
- Push notifications (dropped entirely in grill; re-evaluate post-Play if needed)
- Deep links / Android App Links (skip; share falls back to website URL)
- Admin functionality in app

---

## 2. Architecture

```
              ┌─────────────────────────────────┐
              │  manhaj (Next.js on Vercel)      │
              │  /api/search  /api/download      │
              │  /admin/*  (web-only)            │
              └──────────┬──────────────────────┘
                         │  Supabase anon RLS reads
                         │  R2 public audio URLs
          ┌──────────────┼──────────────┐
          │              │              │
     Web PWA listeners  App listeners   Admins (browser)
     (PWA cache+idb)    (native FS+    (SSR cookies,
                         SQLite +       service_role)
                         track-player)
```

**Hybrid data path (grill decision):** do NOT reinvent endpoints.

| Data | Path | Why |
|------|------|-----|
| `scholars`, `series`, `episodes` lists/detail, home feeds | **Direct Supabase** via `@supabase/supabase-js` (anon key, public_read RLS) | Already public RLS; no new backend work; no Vercel hop |
| Search (`/api/search`) | **Next API** (`https://manhaj-sunnah.vercel.app/api/search` via `EXPO_PUBLIC_API_URL`) | Search is already a Next route; app must not duplicate it. Grill explicitly requires hitting the backend. |
| Audio bytes (stream) | **Direct R2 public URL** (`episode.audio_url`) | R2 public URL stored in DB; no `/api/download` hop needed for streaming |
| Audio bytes (download) | `expo-file-system` `createDownloadResumable` from **direct R2 URL** → `FileSystem.documentDirectory` | Resumable on flaky connections; bytes same URL as streaming |
| Analytics (`episode_plays`) | Direct Supabase insert (anon, timestamp only) | Lightweight, no user identity |
| Crash logs (`app_errors`) | Direct Supabase insert (`app_errors`) | Anon insert policy; see §12 |

No RLS change required — `public_read_scholars / series / episodes` already cover the app.

---

## 3. Repo layout

```
manhaj-ecosystem/
  manhaj/                 ← Next.js web + admin (unchanged)
  manhaj-app/             ← Expo app (this spec)
    app/                  ← expo-router file-based routes
    lib/                  ← supabase.ts, downloads.ts, analytics.ts
    store/                ← player store (zustand, ported)
    components/           ← native UI (AudioCard, MiniPlayer, etc.)
    assets/               ← icon, splash (reuse web)
```

- App lives **in `./manhaj-app`** inside `manhaj-ecosystem` (not `apps/mobile`).
- **Types: copy** `types/index.ts` (`Scholar`, `Series`, `Episode`, `Language`, `Tag`, `Speed`) into the app. No shared package yet — hoist only if duplication hurts.
- pnpm workspace: add `manhaj-app` to workspace only if you want shared deps hoisting; otherwise keep it a sibling install (your call — no build coupling required for v1).

---

## 4. App identity

| Field | Value | Notes |
|-------|-------|-------|
| `android.package` | `com.manhaj.app` | **Immutable after first distribution** — chosen in grill |
| Display name (launcher) | `Manhaj Sunnah` | Grill decision |
| Branding | Reuse web `public/logo.png`, forest/sand/clay palette, Geist + Noto Naskh Arabic | §9 for token mapping |
| `version` | `0.1.0` to start; semver; two EAS channels: `preview` (internal) + `production` (website APK) | §11 |

---

## 5. Audio playback, background, and notification controls

Primary reason to go native over PWA: a **real Android foreground service**, not a browser tab Android can kill.

**Library: `react-native-track-player`** (requires custom dev client; incompatible with Expo Go — see §11).

Why not `expo-audio`: `expo-audio` is a playback API, not a now-playing/notification framework. `track-player` gives background playback, persistent media-style notification, lock-screen controls, and hardware/Bluetooth media-button handling (headset play/pause) out of the box.

```ts
// service/PlaybackService.ts — headless JS task
import TrackPlayer, { Event } from "react-native-track-player";
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));
  // RemoteDuck: phone call / audio focus interrupts playback
}
```

```ts
// On episode select: prefer local file if downloaded, else R2 URL
const url = downloadedFileUri ?? episode.audio_url;
await TrackPlayer.reset();
await TrackPlayer.add({
  id: episode.id,
  url,
  title: episode.title,
  artist: episode.scholar?.name,
  artwork: episode.series?.cover_url ?? scholar.photo_url,
});
await TrackPlayer.play();
```

**Parity features (all included):**
- Speed `0.75×` / `1×` / `1.25×` / `1.5×` / `2×` via `TrackPlayer.setRate()`
- Sleep timer via existing Zustand `tickSleepTimer` → `TrackPlayer.pause()` at zero (port `store/player.ts` logic, replacing Howler calls)
- Queue / play-next (persisted — §7)
- Mini-player driven by `usePlaybackState` / `useProgress` hooks instead of manual Zustand `isPlaying/currentTime` bookkeeping

**Resume position:** local only, persisted to SQLite/AsyncStorage, survives restarts. No cross-device sync (conflicts with no-auth model).

**Permissions (minimal, one-time prompt):**
```xml
<!-- android.permissions -->
FOREGROUND_SERVICE
POST_NOTIFICATIONS   <!-- request once on first playback; respect denial -->
FOREGROUND_SERVICE_MEDIA_PLAYBACK  <!-- Android 14+ if SDK target requires -->
```
No broad storage permission — scoped storage (`FileSystem.documentDirectory`) needs none.

---

## 6. Data layer

**Supabase client (native):**
```ts
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const ExpoSecureStoreAdapter = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: ExpoSecureStoreAdapter, autoRefreshToken: true, persistSession: true } },
);
```
Listeners never sign in for v1 — this client only hits `public_read_*` policies. SecureStore adapter is future-proofing for v2 accounts; not required but harmless.

**Env (reuse web values):**
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=https://manhaj-sunnah.vercel.app   # for /api/search
```
Stored as **EAS secrets / env** (free tier). `EXPO_PUBLIC_*` is public by design (anon key is public via RLS).

**Data freshness:** React Query, **cached-first + background refetch** (same as web with persist). Cache persisted via SQLite/AsyncStorage; instant list paint on open, refetch on focus + pull-to-refresh. New episodes published in admin appear **on next app open / pull-to-refresh** — no Supabase Realtime subscription in v1.

```ts
// example: Home / Scholars lists use react-query with NetInfo-aware refetch
```

**Reuse backend — do not reinvent:**
- Do NOT create Supabase RPC/Edge Functions for data the Next API already serves. App hits `/api/search` for search; reads go direct to Supabase. Any new listener endpoint belongs on the Next API, not duplicated in Supabase for mobile.

---

## 7. Offline downloads

Upgrades over PWA: native files **do not get evicted** under storage pressure (browser Cache API does), and `createDownloadResumable` resumes on dropped connections.

| Aspect | Choice (grill) |
|--------|----------------|
| Bytes | `expo-file-system` → `FileSystem.documentDirectory/audio/<episodeId>.mp3` |
| Metadata (title, scholar, uri, size, downloadedAt) | `expo-sqlite` table `downloads` (same shape as web `lib/downloads-db.ts`'s three functions; port them) |
| Eviction | None — files persist until user/app deletes |
| Cell data | **Allow cellular with warning** (not WiFi-only). Show file size before download; warn on cellular; user can confirm. Provide Settings toggle `WifiOnlyDownloads` default OFF. Detect via `@react-native-community/netinfo`. |
| Resume | `FileSystem.createDownloadResumable` survives drops; no restart from zero |
| Storage cap | **2 GB default**, enforced in app; Settings lets user change cap; show used/available. Block new download when cap would be exceeded, with message + manage-downloads CTA. Display per-episode file size (from R2 `content-length` or prior download record) before download. |
| Playback of downloaded | Pass local `file://` URI to `TrackPlayer.add()`; check SQLite first before using R2 URL |
| Queue / last episode persistence | Persist queue + last `episodeId` + `position` in SQLite; restore on cold launch |

```ts
// lib/downloads.ts (sketch, native)
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
const db = SQLite.openDatabaseSync("manhaj.db");
db.execSync(`create table if not exists downloads (
  episode_id text primary key, title text, scholar_name text,
  file_uri text, downloaded_at text, file_size_bytes integer
)`);
export async function downloadEpisode(ep: Episode, onProgress?: (p:number)=>void) {
  const dest = `${FileSystem.documentDirectory}audio/${ep.id}.mp3`;
  const d = FileSystem.createDownloadResumable(ep.audio_url, dest, {},
    p => onProgress?.(p.totalBytesWritten / p.totalBytesExpectedToWrite));
  const res = await d.downloadAsync();
  if (!res) throw new Error("Download failed");
  db.runSync(`insert or replace into downloads values (?,?,?,?,?,?)`,
    [ep.id, ep.title, ep.scholar?.name ?? "", res.uri, new Date().toISOString(), 0]);
  return res.uri;
}
```

**Downloads lifecycle:** on app uninstall, OS deletes `documentDirectory` — acceptable. Provide explicit "Remove download" and "Remove all" actions; do not auto-evict.

---

## 8. Search, sharing, navigation

**Search:** app calls `GET ${EXPO_PUBLIC_API_URL}/api/search?q=...` (same route the web search bar hits). No extra backend work. The route is public; native `fetch` is unaffected by browser CORS. Pass language/tag filters the same way.

**Sharing:** native `Share` sheet (one tap to WhatsApp — top option for target users).

```ts
import { Share } from "react-native";
await Share.share({
  message: `${episode.title} — ${episode.scholar?.name}\nhttps://manhaj-sunnah.vercel.app/lectures/${episode.slug}`,
});
```
**Deep links: skipped for v1.** Shared URL falls back to website. No `assetlinks.json`, no App Links in v1. Revisit only if Play + custom domain justifies it.

**Navigation (expo-router, file-based like Next App Router):**
```
app/
  _layout.tsx
  index.tsx                    → Home (Recently Added, Featured Series, Scholars)
  scholars/
    index.tsx                  → Scholars list
    [slug]/index.tsx           → Scholar profile (tabs)
    [slug]/[series].tsx        → Series + episodes
  lectures/[slug].tsx          → Lecture detail + player
  search.tsx                   → Search
  downloads.tsx                → Downloads (SQLite-backed)
  settings.tsx                 → Storage cap, cellular warning, links to /privacy, support
```

---

## 9. UI & design system parity

`nativewind` carries Tailwind v4 tokens — same `@theme` values (forest/sand/clay/ink), same single-accent-per-screen rule, same typography.

- Fonts: **Geist Sans** (UI) + **Noto Naskh Arabic** (titles — English UI, Arabic titles per grill) via `expo-font` / `@expo-google-fonts/*`. Load before splash hide.
- Component mapping:

| Web | Native | Notes |
|-----|--------|-------|
| `AudioCard` (row/card/download variants) | Same component, same three variants | RN flexbox has no overflow-by-default — re-check truncation; don't port the `min-w-0` fix literally |
| `MiniPlayer` | Same, driven by track-player hooks | §5 |
| Radix `Tabs` (Scholar profile) | `react-native-tab-view` or simple custom segmented control | Radix is web-only — this needs a real swap |
| `vaul` (mini-player sheet) | `@gorhom/bottom-sheet` | Closest native drag-up gesture sheet |
| Radix `Select` | N/A (admin-only, stays web) | Not needed in listener app |

Dark mode: match web (`next-themes` → native `useColorScheme`).

---

## 10. What v1 does NOT include

- **Push notifications:** dropped entirely per grill. No `device_tokens` table, no webhook on `episodes` insert, no Edge Function. Re-evaluate after Play Store if broadcast/per-scholar notifications prove necessary.
- **Listener accounts / sync:** no auth, no cross-device resume, no favorites sync.
- **Deep links / App Links:** skipped.
- **Admin:** stays web-only at `/admin/*`.

---

## 11. Build, distribution, updates — sideload-first, Play later

**Toolchain reality (grill-resolved):**
- You have **no local Android toolchain**.
- `react-native-track-player` **cannot run in Expo Go** — any import breaks Expo Go entirely.
- Therefore: **dev-build-only workflow via EAS cloud**. Day-to-day iteration = EAS cloud dev builds installed on a physical Android phone; no Expo Go for this app.

**Stack:**
- Expo **latest stable SDK** at scaffold time (`npx create-expo-app` pinned; verify `sdkVersion` before scaffold).
- `expo-dev-client` from day one.

**Environments: two EAS channels (grill)**
- `preview` — internal testing, frequent builds.
- `production` — the APK linked from the website `/download` page.

**Build artifacts (EAS free tier — grill decision):**
- Free tier: **30 builds/month** is sufficient for sideload + OTA workflow. No paid plan in v1; stay within free limits.
- Primary artifact: **APK** for sideload (`eas build --platform android --profile preview/production`). AAB for Play later.
- **OTA updates: yes via `expo-updates` (EAS Update).** Push JS-only fixes OTA to both channels without reinstalling the APK. Native changes (track-player, permissions, SDK bump) still need a new build.

**Initial install (no Android toolchain):**
1. `eas build --platform android --profile production` in CI or locally with `eas` CLI (no Android Studio needed).
2. EAS returns an **artifact URL** (QR + link).
3. Website `/download` page links directly to the EAS artifact URL (see `website-download-privacy-spec.md`).
4. Users tap Install → Android prompts `Allow install from browser` ("Unknown sources") → instructions on the page guide them (grill: show instructions).

**Dev workflow (no local toolchain):**
```bash
npx create-expo-app manhaj-mobile --template
cd manhaj-mobile
npx expo install expo-router expo-file-system expo-sqlite expo-sharing expo-notifications expo-secure-store expo-dev-client expo-updates
npx expo install @react-native-community/netinfo
npm i @supabase/supabase-js zustand nativewind react-native-track-player @tanstack/react-query @gorhom/bottom-sheet
# configure app.json: android.package com.manhaj.app, displayName Manhaj Sunnah, permissions (§5), expo-updates channels
eas build --platform android --profile preview   # dev build with dev-client
# install APK on phone via QR, then `npx expo start` with dev-client
```

---

## 12. Analytics & crash logging (lightweight, grill-mandated)

**Analytics (anonymous):** on episode play start (stream or local), insert one row:
```sql
-- Supabase table episode_plays (new, anon-insert allowed)
create table episode_plays (
  id uuid primary key default gen_random_uuid(),
  episode_id text not null references episodes(id),
  played_at timestamptz default now(),
  source text check (source in ('stream','offline'))
);
-- RLS: anon can INSERT, no SELECT for anon; admins/host can SELECT via service_role
```
No user identity, no PII. Lets admins gauge demand.

**Crash/error logging:** client-side `try/catch` + global error handler inserts to `app_errors`:
```sql
create table app_errors (
  id uuid primary key default gen_random_uuid(),
  message text, stack text, route text, app_version text,
  device_os text, created_at timestamptz default now()
);
-- RLS: anon INSERT only
```
Poll `app_errors` in Supabase dashboard; no Sentry in v1. For `preview` builds consider verbose logging.

---

## 13. Website changes (sideload channel)

See `website-download-privacy-spec.md` for the full spec of:

- **New page `/download`** (or `/app`): version badge, file size, last updated, **EAS artifact link**, QR, **sideload install instructions** ("Allow install from browser"), storage/permission explainer, link to `/privacy`.
- **`/privacy` page:** privacy policy for the app (required before Play, grill says write it now on the website). Covers: no accounts, anonymous analytics + crash logs only, offline files on-device, no third-party trackers.

---

## 14. Device targeting & compatibility

- **Min SDK: Android 7 (API 24)** per grill. Note: Expo 54/55 + `react-native-track-player` + new architecture / Hermes on old ARM SoCs can be fragile below API 28 — test on a real low-end device via EAS preview before calling this "supported". Be prepared to bump to **API 28 (Android 9)** if stability on 24-27 is poor.
- Target modern mid-range Android phones (reference device for QA: a sub-$150 Android 9+ handset).

---

## 15. Security notes

- `EXPO_PUBLIC_*` keys are public by design (anon key limited by RLS). Never embed `service_role` in the app.
- R2 audio URLs are public; if bucket policy is private-presigned, switch streaming to presigned URLs via `/api/download` instead — check bucket ACL before shipping.
- No secrets in repo; use EAS secrets + Vercel env.
- Validate external input (search `q`) with Zod on the Next API (already does).

---

## 16. Suggested build order (updated from v1 with grill decisions)

1. Scaffold Expo app + `expo-router` + NativeWind, port design tokens, ship empty screens behind a dev build (EAS preview).
2. Data layer: Supabase client, read-only screens (Home → Scholar → Series → Lecture detail) — no player yet.
3. `react-native-track-player` + MiniPlayer + background service + notification controls; port Zustand player logic; speed + sleep timer + local resume.
4. Offline downloads: `expo-file-system` + `expo-sqlite`, cellular warning, 2 GB cap, per-episode size, queue persistence, local playback path.
5. Search via `${API_URL}/api/search`.
6. Share sheet, analytics `episode_plays`, `app_errors` wiring.
7. Website `/download` + `/privacy` (per separate spec).
8. EAS `production` APK, OTA (`expo-updates`) smoke test, sideload QA on real device.
9. Play Store submission as a **separate later task** (per `manhaj-deployment-budget-v2.md` + $25 one-time fee — not in this v1).

---

## 17. Open risks to watch

- **No local Android toolchain + dev-build-only = slow iteration loop** (each native change needs an EAS cloud build). Mitigate with batching native changes and lean OTA for JS-only work.
- **API 24 floor**: track-player + bottom-sheet on old devices — test early on preview channel; be willing to raise min to API 28.
- **Free-tier EAS builds**: 30/mo is enough if OTA absorbs JS churn; watch usage before month-end.
- **R2 bucket visibility**: confirm `NEXT_PUBLIC_R2_PUBLIC_URL` bucket is actually public-readable; otherwise streaming breaks and we must pivot to presigned `/api/download`.

