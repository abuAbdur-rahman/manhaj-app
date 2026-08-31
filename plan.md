# Manhaj App — Build Plan (Task Breakdown)

**Spec:** `spec-v2.md` (source of truth)  
**Package:** `com.manhaj.app` · display name `Manhaj Sunnah` · Android only · sideload via website  
**Channels:** `preview` (internal) + `production` (website APK) · OTA via `expo-updates` · EAS free tier  
**Data path:** Supabase direct for reads, Next ` /api/search` for search, direct R2 for audio  
**Grill session:** 2026-08-31 — all decisions in `decisions.md`

---

## Milestone 0 — Scaffolding & Dev Loop (1–2 days)

**Goal:** empty Expo app that builds as an EAS dev-client APK and runs on a physical phone (no local Android toolchain, no Expo Go).

- [ ] `npx create-expo-app manhaj-mobile --template` with latest stable SDK; pin `sdkVersion` in `app.json`
- [ ] Install deps: `expo-router`, `expo-file-system`, `expo-sqlite`, `expo-sharing`, `expo-secure-store`, `expo-dev-client`, `expo-updates`, `expo-font`, `@react-native-community/netinfo`, `@supabase/supabase-js`, `zustand`, `nativewind`, `@tanstack/react-query`, `react-native-track-player`, `@gorhom/bottom-sheet`, `react-native-tab-view`
- [ ] `app.json` / `app.config.ts`: `name: Manhaj Sunnah`, `slug: manhaj`, `android.package: com.manhaj.app`, `android.permissions: [FOREGROUND_SERVICE, POST_NOTIFICATIONS, FOREGROUND_SERVICE_MEDIA_PLAYBACK]`, `expo-updates` channels `preview`/`production`, `scheme: manhaj`
- [ ] Port design tokens: copy `@theme` values (forest/sand/clay/ink, `--font-sans`, `--font-arabic`) from `manhaj/app/globals.css` into NativeWind config; load Geist + Noto Naskh Arabic via `expo-font`
- [ ] Supabase client stub `lib/supabase.ts` with `ExpoSecureStoreAdapter` + env `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `API_URL` as EAS secrets
- [ ] Verify: `eas build --platform android --profile preview` produces an APK; QR installs on phone; `npx expo start` works against the dev-client (JS reload via OTA, native changes need rebuild)
- **Verify:** APK installs on an Android 9+ handset, splash shows, empty Home renders
- **Risk:** EAS build queue / free-tier 30/mo — budget JS churn to OTA

---

## Milestone 1 — Read-Only Screens (3–5 days)

**Goal:** browse without playback — mirrors web Home → Scholars → Scholar Tabs → Series → Lecture detail.

- [ ] `lib/supabase.ts` typed queries: `scholars` (list), `scholars` by `slug` + series join, `series` by scholar/series, `episodes` by series, `episodes` by slug
- [ ] Copy `types/index.ts` (Scholar/Series/Episode/Language/Tag) into app
- [ ] React Query + persist: `@tanstack/react-query` with `createPersister` → SQLite/AsyncStorage; cached-first + background refetch on focus + pull-to-refresh
- [ ] Routes (`app/`):
  - [ ] `index.tsx` Home (Recently Added, Featured Series, Scholars) — reuses web query shapes
  - [ ] `scholars/index.tsx` + `[slug]/index.tsx` (profile + `react-native-tab-view` tabs — Radix Tabs replaced)
  - [ ] `scholars/[slug]/[series].tsx` (series + episodes)
  - [ ] `lectures/[slug].tsx` (detail + placeholder player area)
  - [ ] `search.tsx` (hits `${API_URL}/api/search?q=` + language filters)
  - [ ] `downloads.tsx` + `settings.tsx` shells
- [ ] Reuse/rewrap: `AudioCard` (row/card/download variants) — re-check truncation without the web `min-w-0` fix; RN flexbox differs
- [ ] Error/empty/offline states per screen; bilingual titles (English UI + Arabic title via `font-arabic`)
- **Verify:** navigate Home → Scholar → Series → Lecture on device; pull-to-refresh reflects a newly published episode from admin
- **No push, no deep links, no auth in this milestone**

---

## Milestone 2 — Playback (4–6 days)

**Goal:** streaming playback with real background service, lock-screen + headset controls, full parity.

- [ ] Register `react-native-track-player` `PlaybackService` (headless task) for `RemotePlay/Pause/Next/Seek/Duck`
- [ ] Port `store/player.ts`: keep `speed`/`sleepTimerRemaining`/`queue` logic; replace Howler/RN `<audio>` calls with `TrackPlayer.play/pause/setRate/seekTo`
- [ ] MiniPlayer: drive UI from `usePlaybackState` / `useProgress` + `queue` store; `@gorhom/bottom-sheet` for expand sheet
- [ ] Speed control 0.75/1/1.25/1.5/2 via `setRate`; sleep timer ticks via store → `pause` at zero
- [ ] Queue + last episode + position persistence: SQLite (`player_state` table or AsyncStorage)
- [ ] Local resume: restore last episode + position on cold launch; resume where left off
- [ ] Notification artwork: `episode.series?.cover_url ?? scholar.photo_url`
- [ ] Analytics stub: insert `episode_plays {episode_id, source:'stream'}` on play start (anon)
- [ ] `POST_NOTIFICATIONS` one-time permission prompt on first playback (respect denial)
- **Verify:** play an episode → background the app → notification persists, lock-screen controls work, headset play/pause works, sleep timer fires, speed changes persist, relaunch restores position
- **Blocked without:** EAS dev build (track-player requires native rebuild — no Expo Go)

---

## Milestone 3 — Offline Downloads (3–5 days)

**Goal:** resilient downloads that survive storage pressure and flaky connections.

- [ ] `lib/downloads.ts`: `expo-file-system` `createDownloadResumable` + `expo-sqlite` `downloads` table; `downloadEpisode(ep, onProgress)`, `getDownload(epId)`, `removeDownload(epId)`, `listDownloads()`
- [ ] Per-episode file size fetch (R2 `content-length` via `HEAD` on `audio_url`, fallback to 0)
- [ ] Download UI: size before download, progress bar, pause/resume (resumable handle), retry, remove
- [ ] Cellular gate: `NetInfo.fetch()` → if not WiFi, show warning dialog "Downloading on mobile data" with Confirm/Cancel; still **allow** (grill decision). Settings toggle `WifiOnlyDownloads` (default OFF) to enforce WiFi-only when enabled.
- [ ] Storage cap: **2 GB default** enforced; Settings to view used/available + change cap; block download when cap would be exceeded, with "Manage downloads" CTA
- [ ] Local playback path: check SQLite for `file_uri` first → pass `file://` to `TrackPlayer.add()`, else R2 URL
- [ ] `downloads.tsx`: list of downloaded episodes with play/remove; `settings.tsx` storage summary
- **Verify:** download on WiFi + on cellular (warning shown), airplane-mode playback of downloaded file, resume after killing app mid-download, storage cap blocks over-budget download, remove frees space

---

## Milestone 4 — Search, Share, Polish (2–3 days)

- [ ] `search.tsx`: debounced query → `GET ${API_URL}/api/search?q=&language=`; reuse web result shapes; Zod-validate on server already
- [ ] Share: `import { Share } from 'react-native'` → share `manhaj-sunnah.vercel.app/lectures/[slug]` URL (no deep link; falls back to website). Test WhatsApp appears as top option in sheet.
- [ ] Website channel (separate repo work, plan in `website-download-privacy-spec.md`):
  - [ ] New page `/download` (Next.js) — version badge, file size, last updated, EAS artifact link + QR, sideload instructions, link to `/privacy`
  - [ ] `/privacy` policy page — write now (required before Play, grill decision)
- [ ] Lightweight crash logging: catch + insert `app_errors {message, stack, route, app_version, device_os}` (anon) on JS errors
- [ ] Pull-to-refresh + empty/error/offline states across all screens
- [ ] Support: link to existing WhatsApp/Telegram support channel in Settings
- [ ] Dark mode parity if web ships it
- **Verify:** search returns same results as web; share sheet opens to WhatsApp; `/download` QR installs APK on a fresh device; `/privacy` loads

---

## Milestone 5 — Pre-Release QA & OTA Smoke Test (1–2 days)

- [ ] Two-channel build: `preview` + `production`; `eas update` path tested (change JS → push OTA to `preview` → verify no reinstall needed)
- [ ] Real-device matrix: low-end Android 9+ (mid-range handset) — especially playback + bottom-sheet + downloads on API 24–28 devices (grill flagged fragility below API 28; bump min to 28 if unstable)
- [ ] R2 bucket ACL check: confirm `NEXT_PUBLIC_R2_PUBLIC_URL` bucket is public-readable; else pivot streaming to presigned `/api/download`
- [ ] Permission flow: deny `POST_NOTIFICATIONS` → verify playback still works (just no notification)
- [ ] Analytics + crash table RLS: anon `INSERT` only, verified in Supabase dashboard
- [ ] EAS free-tier usage: confirm builds/month within 30; OTA covers JS churn
- **Verify:** production APK from EAS `production` installs via `/download` link on a phone that never had the app before

---

## Play Store — Separate Later Task (not in v1)

- Google Play developer account ($25 one-time) — create when ready; not gating v1 sideload
- AAB (not APK), app signing, screenshots (Home, Scholar, Player, Downloads, Search), short/long description, content rating, `assetlinks.json` if you add deep links, privacy policy URL (`/privacy`), and data safety declaration (anonymous analytics + crash logs)
- Per `manhaj-deployment-budget-v2.md`

---

## Dependency Graph

```
M0 scaffold → M1 read-only → M2 playback → M3 downloads → M4 search/share/website → M5 QA/OTA
Website /download + /privacy can run in parallel with M3/M4.
```

## Estimates

- **Total v1 (M0–M5): ~12–18 focused days** for a solo dev without toolchain, given EAS cloud-build latency. OTA absorbs JS iteration; native changes (track-player, permissions) batch and rebuild.
- No deadline pressure per grill — ship when QA on a real mid-range handset passes.

