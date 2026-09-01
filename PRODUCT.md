# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

**Primary:** Nigerian Sunni/Salafi listeners (Yoruba / English / Arabic) who follow dars/lectures of named scholars. Situation: mid-range Android 9+ handsets (API 24 floor, validate to 28), flaky mobile data, intermittent connectivity, sideload-first distribution outside Play Store. No local Android toolchain on builder side — iteration via EAS cloud.

**Job:** Find, play, and continue a dars reliably — with real background playback, lock-screen/headset controls, queue/play-next, local resume, and resilient offline downloads that survive storage pressure and connection drops.

**Other audiences explicitly out of scope for v1:** admins (web-only `/admin/*`), listener accounts/sync, iOS users.

## Product Purpose

Native Android listener client for the existing Manhaj ecosystem that reuses the Supabase + R2 backend as a second client alongside the Next.js web app. The web app + admin panel stays unchanged.

Purpose: full listener parity on native with production-grade audio (foreground service, persistent notification, sleep timer, speeds 0.75–2×) and offline-first downloads (non-evictable, resumable), without reinventing backend endpoints.

Success: a listener can Home → Scholar → Series → Lecture on device, stream or download with cellular warning and 2 GB cap enforcement, background the app and control from lock screen/headset, airplane-mode play a download, and see newly published episodes on next open/pull-to-refresh — verified on a real mid-range handset. Sideload install via website `/download` EAS artifact QR works on a fresh device. JS fixes ship OTA without reinstall.

## Positioning

Not a web wrapper. The meaningful difference over the PWA is the **real Android foreground service** (`@rntp/player` — the maintained react-native-track-player v5 fork — with `PlaybackService` for RemotePlay/Pause/Next/Seek/Duck + `FOREGROUND_SERVICE`/`FOREGROUND_SERVICE_MEDIA_PLAYBACK` and `POST_NOTIFICATIONS` once on first playback) plus **non-evictable, resumable offline** (`expo-file-system` `createDownloadResumable` → `documentDirectory/audio/<id>.mp3` + `expo-sqlite` `downloads` table) and queue/last-episode persistence that the browser Cache API/SQLite + Howler PWA cannot guarantee. Same public data — stronger delivery.

A neighboring product could not truthfully copy the sideload + OTA channel (preview/production) and hybrid data-path discipline without the same backend reuse.

## Operating Context

**Ecosystem layout:**
- `manhaj-ecosystem/manhaj/` — Next.js web + admin on Vercel (`/api/search`, `/api/download` optional, `/admin/*` SSR).
- `manhaj-ecosystem/manhaj-app/` — Expo app (this product). Types copied from web `types/index.ts`.

**Hybrid data path (locked, grill-decided):**
- `scholars`, `series`, `episodes` lists/detail/home feeds → direct Supabase via `@supabase/supabase-js` anon key, `public_read_*` RLS (no new policies).
- Search → `GET ${EXPO_PUBLIC_API_URL}/api/search?q=&language=` on Vercel `https://manhaj-sunnah.vercel.app` (same route as web).
- Audio bytes stream → direct R2 public URL `episode.audio_url` (no `/api/download` hop unless bucket is private-presigned).
- Audio bytes download → same R2 URL via `createDownloadResumable` to scoped `documentDirectory` (no broad storage permission).
- Analytics `episode_plays {episode_id, played_at, source: stream|offline}` → direct anon INSERT.
- Crash `app_errors {message, stack, route, app_version, device_os}` → direct anon INSERT.

**Workflows:** browse Home (Recently Added, Featured Series, Scholars) → Scholars list → Scholar profile tabs → Series → Lecture detail + player/MiniPlayer → Search → Downloads → Settings (storage cap, WifiOnlyDownloads default OFF, links to /privacy and WhatsApp/Telegram support). Share via native `Share` sheet to `manhaj-sunnah.vercel.app/lectures/[slug]` URL (no deep links/App Links in v1).

**Environments:** `preview` (internal) + `production` (website APK) EAS channels with `expo-updates` OTA; free-tier 30 builds/mo, native changes need rebuild, JS-only via OTA. `EXPO_PUBLIC_*` via EAS secrets. Sideload via website `/download` (version badge, size, last updated, EAS artifact link + QR, sideload "Allow install from browser" instructions).

## Capabilities and Constraints

**Confirmed capabilities:**
- Read-only browsing with React Query cached-first + background refetch on focus + pull-to-refresh; persist via SQLite/AsyncStorage.
- Playback via `@rntp/player` + Zustand `store/player.ts` port; speeds 0.75/1/1.25/1.5/2, sleep timer, MiniPlayer driven by `useIsPlaying`/`useProgress`, `@gorhom/bottom-sheet` expand, artwork `series.cover_url ?? scholar.photo_url`.
- Offline downloads lifecycle: per-episode size via R2 HEAD, progress/pause/resume/retry/remove, 2 GB default cap enforced (Settings adjustable, shows used/available), block with "Manage downloads" CTA when exceeded; local playback via `file://` URI.
- Search debounced via Next API; hybrid reuse enforced — no Supabase RPC/Edge Function duplication.
- Sharing, lightweight analytics/crash logging, pull-to-refresh/empty/error/offline states per screen.

**Constraints (immutable/preserved):**
- `android.package: com.manhaj.app` immutable after first distribution; launcher display name `Manhaj Sunnah`; `version` semver from `0.1.0`; scheme `manhaj`; Expo latest stable SDK at scaffold (SDK 57 family, pin `sdkVersion`); `expo-dev-client` day one; `@rntp/player` requires custom dev client — **no Expo Go** (dev-build-only via EAS cloud).
- Android only (no iOS scaffold), no listener auth (pure anon RLS), no push notifications entirely (dropped in grill Batch 8), no deep links/App Links (`assetlinks.json` skipped), no admin in app.
- Types: copy, no shared package; app in `./manhaj-app` (not `apps/mobile`).
- Env: `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` + `EXPO_PUBLIC_API_URL` (public by design; never `service_role` in app).
- Terminology: `Scholar`, `Series`, `Episode`, `Language`, `Tag`, `Speed`.

**Explicitly undecided / deferred:**
- Play Store submission (separate later task: AAB, signing, screenshots, content rating, privacy policy URL, $25 fee).
- Min SDK bump to API 28 if track-player/bottom-sheet unstable on 24–27 (test on low-end preview device).
- Push re-evaluation post-Play if broadcast/per-scholar notifications prove necessary.

## Brand Commitments

- Name: **Manhaj Sunnah** (launcher `Manhaj Sunnah`, title template `%s — Manhaj`).
- Logo: `manhaj/public/logo.png` — dark forest crescent + play triangle (reuse in app icon/splash).
- Palette: carry web `@theme` tokens from `manhaj/app/globals.css` — `forest-50/#f0f7f4, 100/#dcede6, 500/#1a6b3c, 600/#155732, 700/#0f4126, 900/#07200f`; `sand-50/#fafaf7, 100/#f5f3ec, 200/#eae6d9, 300/#d9d3c0`; `clay-400/#c2754a, 500/#a85c35, 600/#8c4a29`; `ink-100/#eef1ee, 500/#5c6b60, 700/#2a332c, 800/#1c231e, 900/#141a16, 950/#0e1210`; single-accent-per-screen rule.
- Typography: **Geist Sans** (UI) + **Noto Naskh Arabic** (titles) via `expo-font`/`@expo-google-fonts/*`; load before splash hide; English UI + Arabic titles bilingual.
- Voice: short, reverent, scholarly — "Ilm, organized." (web tagline). No invented testimonials.
- References binding: spec-v2.md §9 `nativewind` Tailwind v4 mapping; Radix Tabs → `react-native-tab-view`/custom segmented, `vaul` → `@gorhom/bottom-sheet`.

## Evidence on Hand

- Real specs: `manhaj-app/spec-v2.md` (source of truth), `plan.md` (M0–M5 build order), `decisions.md` (13 grill batches 2026-08-31), `website-download-privacy-spec.md`, web `Design.md`, `globals.css` `@theme` values (above), `lib/downloads-db.ts` shape, `store/player.ts` logic.
- Assets: `manhaj/public/logo.png`, forest/sand/clay tokens (above), Geist/Noto fonts (to bundle).
- Backend proof: Supabase `scholars/series/episodes` with `public_read_*` RLS, R2 `audio_url` public-readable (verify ACL before ship; else pivot to presigned `/api/download`), `/api/search` Zod-validated, `episode_plays` + `app_errors` anon-INSERT tables (§12 SQL).
- No fabrication allowed: no fake reviews, benchmarks, pricing, or testimonials. Images/data must be verified via R2/DB before claim.

## Product Principles

1. **Reuse before reinvent** — reads go direct to Supabase, search and any new listener endpoint hits the Next API; never duplicate a route in Supabase for mobile.
2. **Native-grade reliability** — background service + notification + resumable, non-evictable offline are the reason to be native; qualify on real mid-range handsets, not emulators alone.
3. **Sideload-first, OTA-fast** — optimize for EAS cloud dev-build loop and free-tier limits: batch native changes, ship JS fixes OTA to preview/production, show sideload instructions plainly.
4. **Offline with consent** — allow cellular with warning + per-episode size + WifiOnly toggle + 2 GB cap; block gracefully with a Manage CTA, never silent eviction or surprise data use.
5. **Parity without accounts** — full listener parity and local resume/queue persistence with zero auth, no PII, and anonymous-only analytics/crash logs.

## Accessibility & Inclusion

- Languages: English UI, Arabic/English titles; bundle Noto Naskh Arabic and ensure proper RTL rendering where titles require it.
- Target baseline: Android accessibility (TalkBack) via `react-native` `accessibility*` props; minimum touch target 48dp; visible focus; no `Text` `onPress` for tappables; `NativeWind` dark variant parity when web ships dark mode.
- Inclusion: low-end device + low-bandwidth + offline-first; cellular cost sensitivity (warning before large downloads). No WCAG certification claimed yet; future work should audit to WCAG 2.1 AA for native.
