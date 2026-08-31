# Manhaj App — Agent Instructions

> Native Android listener app. Expo + Supabase + R2. Sideload via website.
> Companion web: `../manhaj/` (Next.js, unchanged). Spec: `spec-v2.md`.

## Stack

- Expo (latest stable SDK, `expo-router`, `expo-dev-client` from day one)
- React Native 0.8x + TypeScript 5+, NativeWind (Tailwind v4 tokens ported from `../manhaj/app/globals.css`)
- Supabase JS (anon RLS only — no listener auth in v1), Cloudflare R2 public URLs for audio
- `react-native-track-player` (background + notification + headset), `expo-file-system` + `expo-sqlite` (offline), `@tanstack/react-query` (cached-first), `zustand` (player), `@gorhom/bottom-sheet`, `react-native-tab-view`, `@react-native-community/netinfo`, `expo-secure-store`
- EAS Build (free tier, 30/mo) + EAS Update (`expo-updates`) — two channels `preview`/`production`. No Expo Go (track-player incompatible). No local Android toolchain — dev-build-only via EAS cloud APK + QR.

## Commands

| Command | Action |
|---------|--------|
| `npx expo start` | Start dev server (requires EAS dev-client APK on device) |
| `npx expo start --clear` | Clear Metro cache |
| `eas build --platform android --profile preview` | Cloud dev build (EAS) |
| `eas build --platform android --profile production` | Production APK for `/download` page |
| `eas update --channel preview` | OTA JS-only update (no reinstall) |
| `npx tsc --noEmit` | Type-check |
| `pnpm lint` / `pnpm format` | Biome (if configured; match `../manhaj/` conventions) |

## Critical Conventions

- **App identity:** `android.package com.manhaj.app` (immutable after first APK), display name `Manhaj Sunnah`. Never change without explicit approval.
- **Types: copy, don't share.** Copy `Scholar/Series/Episode/Language/Tag/Speed` from `../manhaj/types/` into `./types/` or `./lib/types.ts`. No shared package in v1.
- **Data path is hybrid — do not reinvent endpoints:**
  - Reads (`scholars`/`series`/`episodes`/home) → direct Supabase anon RLS.
  - Search → `GET ${EXPO_PUBLIC_API_URL}/api/search` (Next API on Vercel). Never duplicate search in Supabase.
  - Audio stream & download bytes → direct R2 public URL (`episode.audio_url`). No `/api/download` hop.
- **Permissions minimal:** `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` + `POST_NOTIFICATIONS` (request once on first playback, respect denial). No broad storage perm — `FileSystem.documentDirectory` is scoped.
- **Offline contract:** `expo-file-system` `createDownloadResumable` → `documentDirectory/audio/<id>.mp3`; SQLite `downloads` table; 2 GB default cap enforced; show file size before download; allow cellular with warning + `WifiOnlyDownloads` toggle (default OFF); queue + last episode + position persisted to SQLite.
- **Playback contract:** `react-native-track-player` `PlaybackService` for `RemotePlay/Pause/Next/Seek/Duck`; speed 0.75–2× via `setRate`; sleep timer via Zustand `tickSleepTimer` → `pause`; mini-player from `usePlaybackState`/`useProgress`.
- **Freshness:** React Query cached-first + background refetch on focus + pull-to-refresh. No Realtime in v1. New episodes visible on next open / pull.
- **Share:** native `Share` sheet to website URL `manhaj-sunnah.vercel.app/lectures/[slug]`; no deep links / `assetlinks.json` in v1.
- **Branding:** reuse `../manhaj/public/logo.png`, forest/sand/clay/ink tokens, Geist + Noto Naskh Arabic (English UI + Arabic titles). Single accent per screen.
- **No push / no auth / no admin / no deep links in v1** — don't scaffold them.
- **OTA:** `expo-updates` channels `preview`/`production`. JS-only fixes go OTA; native changes need new EAS build. Budget builds (30/mo free).
- **Check existing components** before creating new — reuse `AudioCard` variants, `MiniPlayer` patterns from `../manhaj/components/` where sensible (adapt for RN flexbox — no `min-w-0` literal port).
- **Never commit:** secrets, `service_role`, APK/AAB binaries, `.env` values. Use EAS secrets + Vercel env.

## Env

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=https://manhaj-sunnah.vercel.app
```

## Architecture

- `app/` — expo-router routes: `index` (Home), `scholars/`, `lectures/[slug]`, `search`, `downloads`, `settings`
- `lib/` — `supabase.ts` (SecureStore adapter), `downloads.ts`, `analytics.ts`, `queryClient.ts`
- `store/` — `player.ts` (Zustand, ported from `../manhaj/store/player.ts`)
- `service/` — `PlaybackService.ts` (track-player headless task)
- `components/` — `AudioCard`, `MiniPlayer`, sheets, tabs
- `assets/` — icon/splash (reuse web)
- Website sideload channel: `../manhaj/app/(public)/download/` + `/privacy` (see `website-download-privacy-spec.md`)

## Data Model (read-only)

```
scholars → series → episodes
```

Same as `../manhaj/CODEBASE_STATE.md` §5. RLS: `public_read_*` anon policies already cover app. New tables `episode_plays` + `app_errors` (anon INSERT only).

## Player Store (Zustand)

Mirror `../manhaj/store/player.ts`: `currentEpisode`, `isPlaying`, `currentTime`, `duration`, `speed`, `isLoading`, `sleepTimerRemaining`, `queue`. Persist queue + last episode + position to SQLite.

## Before Saying Done

- `npx tsc --noEmit` passes
- Manual QA on physical Android 9+ device (mid-range) via EAS preview APK: background playback, notification controls, headset, downloads, cellular warning, storage cap, pull-to-refresh
- Verify R2 bucket public-readable or switch to presigned flow
