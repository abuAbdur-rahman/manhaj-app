# manhaj-app — Manhaj Sunnah (Android)

<p align="center">
  <em>Native Android listener app for Manhaj — Ilm, organized. On your phone, offline, in the background.</em>
  <br/><br/>
  <img src="https://img.shields.io/badge/Expo-SDK54-000020?logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/React_Native-0.8x-61DAFB?logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/Supabase-Anon_RLS-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Audio-R2-orange?logo=cloudflare" alt="R2" />
  <img src="https://img.shields.io/badge/Android-7%2B-3DDC84?logo=android" alt="Android" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" />
</p>

> **Ecosystem:** `manhaj/` (Next.js web + admin, unchanged) + `manhaj-app/` (this — Expo native Android, sideload-first).  
> **Source of truth:** [`spec-v2.md`](spec-v2.md) · **Build order:** [`plan.md`](plan.md) · **Decisions:** [`decisions.md`](decisions.md) · **Website channel:** [`website-download-privacy-spec.md`](website-download-privacy-spec.md)

---

## Why a native app?

The PWA (`manhaj/`) already works, but Android can kill a browser tab — no real background playback, no lock-screen controls, and Cache API/IndexedDB can be evicted under storage pressure. This app gives:

- **Real foreground service** via `react-native-track-player` — survives background, lock-screen + headset/Bluetooth controls
- **Resilient offline** — `expo-file-system` `createDownloadResumable` + `expo-sqlite` files that don't get evicted, resume on flaky connections, 2 GB cap
- **OTA without reinstall** — `expo-updates` (EAS Update) for JS fixes; sideload APK via website `/download`

No iOS, no listener auth, no push, no deep links in v1 — intentionally scoped (see `spec-v2.md` §10).

---

## Architecture

```
              ┌─────────────────────────────────┐
              │  manhaj (Next.js on Vercel)      │
              │  /api/search  /admin/*           │
              └──────────┬──────────────────────┘
                         │  Supabase anon RLS reads
                         │  R2 public audio URLs
          ┌──────────────┼──────────────┐
          │              │              │
     Web PWA listeners  App listeners   Admins (browser)
     (Cache + IDB)      (native FS+    (SSR cookies,
                         SQLite +       service_role)
                         track-player)
```

**Hybrid data path — do NOT reinvent endpoints** (`AGENTS.md`, `spec-v2.md` §6):

| Data | Path |
|------|------|
| `scholars` / `series` / `episodes` lists+detail, home feeds | Direct Supabase `public_read_*` RLS via `@supabase/supabase-js` |
| Search | `GET ${EXPO_PUBLIC_API_URL}/api/search?q=` — Next API on Vercel |
| Audio stream | Direct R2 public URL (`episode.audio_url`) |
| Audio download | `createDownloadResumable` from same R2 URL → `FileSystem.documentDirectory/audio/<id>.mp3` |
| Analytics `episode_plays` / crash `app_errors` | Direct Supabase anon INSERT |

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Expo latest stable SDK, `expo-router` (file-based), `expo-dev-client` from day one |
| Language | TypeScript 5+, React Native 0.8x |
| Styling | NativeWind (Tailwind v4 tokens ported from `../manhaj/app/globals.css` — forest/sand/clay/ink) |
| Playback | `react-native-track-player` (background + notification + `RemotePlay/Pause/Next/Seek/Duck`) |
| Offline | `expo-file-system` + `expo-sqlite` (`downloads` table, 2 GB default cap) |
| Data | `@supabase/supabase-js` (anon), `@tanstack/react-query` cached-first + persist |
| State | `zustand` (player store ported from `../manhaj/store/player.ts`) |
| UI | `@gorhom/bottom-sheet`, `react-native-tab-view`, `expo-font` (Geist + Noto Naskh Arabic) |
| Build | EAS Build (free tier 30/mo) + EAS Update (`expo-updates`) — channels `preview`/`production` |
| Env | `ExpoSecureStoreAdapter` for Supabase client |

**No Expo Go** — `track-player` requires a dev-client build (`spec-v2.md` §11).

---

## App Identity

| Field | Value |
|-------|-------|
| `android.package` | `com.manhaj.app` — **immutable after first APK** |
| Launcher name | `Manhaj Sunnah` |
| `scheme` | `manhaj` |
| Min SDK | Android 7 (API 24), QA target Android 9+ mid-range (bump to 28 if 24–27 unstable) |
| Permissions | `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` + `POST_NOTIFICATIONS` (request once on first playback, respect denial) |
| Versioning | `0.1.0` semver, two EAS channels `preview` (internal) / `production` (website APK) |

---

## Features (v1 — full listener parity)

- **Browse:** Home (Recently Added, Featured Series, Scholars) → Scholar profile (tabs via `react-native-tab-view`) → Series → Lecture detail — mirrors web
- **Player:** stream via R2 URL → track-player, mini-player from `usePlaybackState`/`useProgress`, speed 0.75/1/1.25/1.5/2×, sleep timer via Zustand `tickSleepTimer`, queue/play-next, artwork `series.cover_url ?? scholar.photo_url`, local resume (position persisted to SQLite)
- **Offline:** per-episode size display, progress bar, pause/resume/retry/remove, cellular warning (`@react-native-community/netinfo`, allow with warning, `WifiOnlyDownloads` toggle default OFF), storage cap 2 GB (Settings used/available, blocks over-budget)
- **Search:** debounced → Next `/api/search`, same result shapes as web
- **Share:** native `Share` sheet → `https://manhaj-sunnah.vercel.app/lectures/[slug]` (falls back to website, no App Links)
- **Analytics/crash:** anon `episode_plays {episode_id, source: stream|offline}` + `app_errors {message, stack, route, app_version, device_os}` inserts

Out of scope v1: push, auth/favorites sync, deep links, admin (`spec-v2.md` §10).

---

## Repo Layout

```
manhaj-ecosystem/
  manhaj/                 ← Next.js web + admin (unchanged)
  manhaj-app/             ← this app
    app/                  ← expo-router routes
      index.tsx           → Home
      scholars/index.tsx + [slug]/index.tsx + [slug]/[series].tsx
      lectures/[slug].tsx → Lecture detail + player
      search.tsx | downloads.tsx | settings.tsx
    lib/                  ← supabase.ts, downloads.ts, analytics.ts, queryClient.ts
    store/                ← player.ts (Zustand)
    service/              ← PlaybackService.ts (track-player headless)
    components/           ← AudioCard (3 variants), MiniPlayer, sheets, tabs
    assets/               ← icon/splash (reuse ../manhaj/public/logo.png)
    spec-v2.md | plan.md | decisions.md | website-download-privacy-spec.md
    Tasks/Phases/         ← Phase 0–5 checklists
```

- Types are **copied** from `../manhaj/types/index.ts` (`Scholar/Series/Episode/Language/Tag/Speed`), not shared — see `AGENTS.md`.
- Reuse `AudioCard`/`MiniPlayer` patterns from `../manhaj/components/` adapted for RN flexbox.

---

## Getting Started

### Prerequisites

- Node.js ≥ 20, pnpm ≥ 9
- Expo account + `eas-cli` (`npm i -g eas-cli && eas login`)
- Physical Android 9+ phone (no local Android toolchain, no Expo Go)
- Supabase + R2 env from `../manhaj/.env.local`

###env

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=https://manhaj-sunnah.vercel.app   # for /api/search
```

Set as **EAS secrets/env** (`eas env:create` or EAS dashboard) — `EXPO_PUBLIC_*` is public by design (anon key limited by RLS). Never embed `service_role`.

### Scaffold (Phase 0)

```bash
npx create-expo-app manhaj-app --template   # latest stable SDK — pin sdkVersion in app.json
cd manhaj-app
npx expo install expo-router expo-file-system expo-sqlite expo-secure-store expo-dev-client expo-updates expo-font @react-native-community/netinfo
npm i @supabase/supabase-js zustand nativewind @tanstack/react-query react-native-track-player @gorhom/bottom-sheet react-native-tab-view
# configure app.json: name Manhaj Sunnah, slug manhaj, android.package com.manhaj.app, permissions, expo-updates channels preview/production, scheme manhaj
# port @theme tokens from ../manhaj/app/globals.css into NativeWind; load Geist + Noto Naskh Arabic
eas build --platform android --profile preview   # dev-client APK — install via QR
npx expo start                                   # JS reload via dev-client; native changes need rebuild
```

See `Tasks/Phases/Phase-0-Scaffolding.md` for the T0-01…T0-06 checklist.

---

## Scripts

| Command | Action |
|---------|--------|
| `npx expo start` | Dev server (requires EAS dev-client APK on device) |
| `npx expo start --clear` | Clear Metro cache |
| `eas build --platform android --profile preview` | Cloud dev build (EAS) |
| `eas build --platform android --profile production` | Production APK for `/download` page |
| `eas update --channel preview` | OTA JS-only update (no reinstall) |
| `npx tsc --noEmit` | Type-check |
| `pnpm lint` / `pnpm format` | Biome (match `../manhaj/` conventions) |

---

## Build & Distribution — Sideload-first, Play later

**Toolchain reality** (`spec-v2.md` §11): no local Android toolchain → **dev-build-only via EAS cloud APK + QR**. Every run needs the dev-client build on a real phone; JS-only fixes go OTA without rebuild (budget: 30 builds/mo free tier).

1. `eas build --platform android --profile production` → EAS artifact URL (QR + link)
2. Website `../manhaj/app/(public)/download/page.tsx` links to that URL + QR, with sideload instructions ("Allow install from browser") — see `website-download-privacy-spec.md`
3. `../manhaj/app/(public)/privacy/page.tsx` — privacy policy (no accounts, anon analytics/crash only, on-device files)
4. Supabase migrations for `episode_plays` + `app_errors` (anon INSERT only) live in `../manhaj/supabase/` — see `website-download-privacy-spec.md` §3

OTA: `expo-updates` channels `preview`/`production` — JS fix → `eas update --channel preview|production` smoke test (`Tasks/Phases/Phase-5-QA-OTA.md`).

Play Store is a **separate later task** (AAB, signing, screenshots, $25 fee) — not in v1 (`plan.md` §Play Store).

---

## Phases

| Phase | Goal | Est | Spec |
|-------|------|-----|------|
| 0 Scaffolding | Empty Expo + EAS dev loop | 1–2d | `Tasks/Phases/Phase-0-Scaffolding.md` |
| 1 Read-Only | Browse Home→Scholar→Series→Lecture | 3–5d | `Phase-1-ReadOnly.md` |
| 2 Playback | track-player + queue + resume | 4–6d | `Phase-2-Playback.md` |
| 3 Downloads | FS + SQLite + cap | 3–5d | `Phase-3-Downloads.md` |
| 4 Search/Share/Polish | Search/share + website `/download`/`/privacy` | 2–3d | `Phase-4-SearchSharePolish.md` |
| 5 QA/OTA | Two-channel + OTA + device matrix | 1–2d | `Phase-5-QA-OTA.md` |

Total ~12–18 focused days, no deadline (`decisions.md`). Website work (Phase 4) can parallel Phase 3. Update each `status: todo|doing|done` as you go.

---

## Design

- **Palette:** forest/sand/clay/ink tokens from `../manhaj/app/globals.css` via NativeWind, single accent per screen
- **Typography:** Geist Sans (UI) + Noto Naskh Arabic (titles — English UI + Arabic titles), loaded via `expo-font`
- **Dark mode:** `next-themes` on web → `useColorScheme` on native
- **Branding:** reuse `../manhaj/public/logo.png` for icon/splash

---

## Security

- `EXPO_PUBLIC_*` anon key is public by design — RLS `public_read_*` covers reads, `episode_plays`/`app_errors` are anon INSERT only
- Never commit `service_role`, secrets, APK/AAB binaries, or `.env` values — use EAS secrets + Vercel env
- R2 audio URLs are public; if bucket is private, pivot streaming to presigned `/api/download` — check ACL before ship

---

## Before Saying Done

- `npx tsc --noEmit` passes
- Manual QA on Android 9+ mid-range via EAS preview APK: background playback, notification, headset, downloads, cellular warning, storage cap, pull-to-refresh
- R2 bucket confirmed public-readable or presigned fallback in place

---

<p align="center"><em>Ilm, organized — now native.</em> · Built for the Nigerian Sunni/Salafi community.</p>
