# Manhaj App — Decision Log (Grill Session 2026-08-31)

**Context:** griefing interview ("grill-me") to sharpen `spec-v2.md (deleted)` into `spec-v2.md`.  
**Instruction:** ask through tool, split if necessary; cover all important parts.  
**Result:** 30+ decisions across 8 batches via `question` tool. This log is the authoritative record; spec v2 encodes the same decisions as build constraints.

> Previous doc `spec-v2.md (deleted)` is deleted as obsolete. Its good ideas (Supabase direct reads, R2, track-player, file-system downloads, NativeWind) survive in spec v2; its open claims (repo location, deep links, push, toolchain) are now pinned here.

---

## Batch 1 — Direction, Platforms, Push, Accounts

| Q | Options | Answer | Implication |
|---|---------|--------|-------------|
| Is `spec-v2.md (deleted)` still source of truth? | Keep / Reconsider PWA / Rewrite | **Keep Expo native plan** | Spec v2 is an update, not a rewrite |
| Platforms | Android only / Android+iOS / Android first | **Android only** | No iOS scaffolding, no iOS signing/CI |
| Push notifications | Fast-follow / In v1 / Defer to v2 | **Fast-follow** (later moved to dropped) | Initially scoped as post-launch; see Batch 6 revisit |
| Listener auth | No auth / Accounts in v1 / Lightweight opt-in | **No auth in v1** | Pure anon RLS; no login/signup screens; SecureStore adapter future-only |

## Batch 2 — Repo, Shared Code, Build, Testing

| Q | Answer | Implication |
|---|--------|-------------|
| App lives where? (`apps/mobile` vs sibling) | **In `./manhaj-app`** | Inside `manhaj-ecosystem/manhaj-app` |
| Types duplication | **Copy types, keep duplicate** | Copy `Scholar/Series/Episode` into app; no shared package |
| Build/test for native binary (dev-client required) | **`1+Expo go`** (ambiguous) | Flagged conflict — resolved in Batch 3 |
| Testing level | **Unit tests + manual device** | Vitest for store/downloads + manual device QA; no Maestro E2E in v1 |

## Batch 3 — Toolchain, Distribution, Feature Parity, Offline Default

| Q | Answer | Implication |
|---|--------|-------------|
| Dev workflow conflicting with no-toolchain answer | **Local dev-client builds** (initially) + **No local Android toolchain** | Conflict flagged — dev-build-only via **EAS cloud** (see Batch 4 fix) |
| Play Store state | **Sideload APK first** | Not going straight to Play; sideload channel decides store timing |
| App icon/splash | **Reuse web branding** | Logo, forest/sand/clay palette, Geist fonts carried over |
| Distribution path for APK | **APK via EAS build** (cloud artifact) | Not `adb` to own device only |

| Q | Answer | Implication |
|---|--------|-------------|
| Feature parity | **Full listener parity** | Home, Scholars, Scholar profile, Series, Lecture player, Search, Downloads, Share |
| Offline UX default | **Allow cellular with warning** | Not WiFi-only by default; warn on cellular before large download; toggle in Settings to enforce WiFi-only if user opts in |

## Batch 4 — Toolchain Conflict Resolution + Delivery Mechanics

| Q | Answer | Implication |
|---|--------|-------------|
| Resolve: `Local dev-client builds` but `No local Android toolchain` | **Expo Go + occasional dev build** (then corrected in next batch to **Accept: dev-build only**) | Expo Go pinned as interim, then dropped |
| How APK reaches users | **APK via EAS build** | EAS artifact URL, not adb |
| Feature parity | **Full listener parity** (reconfirmed) | — |
| Offline UX | **Allow cellular with warning** (reconfirmed) | — |

## Batch 5 — Expo Go Viability, Audio Delivery, Resume, Deep Links

| Q | Answer | Implication |
|---|--------|-------------|
| Expo Go can't load any app that imports `react-native-track-player` (missing native module) — `Expo Go for most screens` not viable | **Accept: dev-build only workflow** | Final: **no Expo Go at all**; every run needs an EAS dev build on a physical phone |
| Audio delivery: direct R2 vs `/api/download` | **Direct R2 public URLs** | `episode.audio_url` is already a public R2 URL; stream and download from same URL |
| Resume position survive restarts? | **Local resume only** | Persist to SQLite/AsyncStorage; no cross-device sync (conflicts with no-auth) |
| Deep links / App Links domain (`manhaj-sunnah.vercel.app` vs custom domain) | **Skip deep links** | Shared URLs open the website; no `assetlinks.json` in v1 |

## Batch 6 — OTA, App Identity, Player Parity, Search Backend

| Q | Answer | Implication |
|---|--------|-------------|
| OTA via `expo-updates` (sideload needs it to avoid reinstalling APK per fix) | **Yes, EAS Update** | Two channels `preview` + `production`; JS-only fixes go OTA |
| Android `applicationId` | **`com.manhaj.app`** | Immutable — baked into `app.json` |
| Player parity (speed/timer/queue) | **Full player parity** | 0.75–2×, sleep timer, queue/play-next |
| Search backend path | **Hit existing `/api/search`** | App calls `${API_URL}/api/search` on Vercel; no duplication |

## Batch 7 — Data Freshness, Push Backend, Error Monitoring, Min SDK

| Q | Answer | Implication |
|---|--------|-------------|
| Data freshness (React Query pattern) | **Cached-first, refetch** | Instant paint from cache → background refetch on focus + pull-to-refresh |
| Push backend home (`device_tokens` + webhook + Edge Function) | **In web repo, app only registers** | Initially; later superseded — push dropped entirely (see next batch) |
| Error monitoring (sideload has no Play crash reports) | **Lightweight crash log** | New `app_errors` table, anon INSERT |
| Min Android version (mid-range target) | **Android 7+ (API 24)** | Flagged fragile below API 28; spec notes willingness to bump to 28 after device testing |

## Batch 8 — Storage, Push Trigger, Play Timing, Budget

| Q | Answer | Implication |
|---|--------|-------------|
| Storage limits on downloads | **Storage cap + size display** | Enforce cap, show per-episode size before download |
| Push trigger (broadcast vs per-scholar) | **Drop push entirely** | **Supersedes Batch 1/7 fast-follow** — no push table, webhook, or Edge Function at all in v1 |
| Play Store timing vs sideload | **Sideload then store** | Sideload now, Play as separate later task (per `manhaj-deployment-budget-v2.md`) |
| EAS Build/Update budget | **Free tier only** | 30 builds/mo, OTA for JS churn |

## Batch 9 — Bilingual, APK Channel, Session Output, Timeline

| Q | Answer | Implication |
|---|--------|-------------|
| Text/script (Geist + Noto Naskh Arabic) | **English UI + Arabic titles** | Titles/scholar names are Arabic/English mixed; bundle both fonts |
| How APK reaches installers | **`2 using the website: i.e a new page`** | New page on the website (`/download`) hosts the EAS artifact link (+ QR) — see `website-download-privacy-spec.md` |
| What this session produces | **All importants do files not just update doc, even we'll delete the migration doc as it's obselute.** | Replace obsolete migration doc with full file suite (this log + spec v2 + plan + website spec) |
| Timeline | **No deadline** | Steady, complete build; no weekend-rush certitude |

## Batch 10 — Permissions, Env, RLS, Queue Persist

| Q | Answer | Implication |
|---|--------|-------------|
| Android permissions | **`1+one time perm only`** | Minimal: `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` always, `POST_NOTIFICATIONS` requested **once** on first playback, respect denial |
| Env secrets (anon key public via RLS, API URL) | **`1 but we need to make sure it reaches the Backend(Next API routes) instead of re-inventing the endpoints`** | Hybrid: do NOT reinvent endpoints — search and any new listener endpoint hits Next API; reads go direct to Supabase. Git-confirmed in spec v2 §6. |
| RLS change needed before app? | **No RLS change** | Ship on existing `public_read_*` anon policies |
| Queue / play-next survive restarts? | **Persist queue + last episode** | Save to SQLite/AsyncStorage |

## Batch 11 — Hybrid Data Path, Download Page, Install UX, Channels

| Q | Answer | Implication |
|---|--------|-------------|
| Data path after env comment | **Hybrid: Next API for search; Supabase direct for reads** | Locked in spec v2 §6 |
| APK hosted where? | **EAS build link directly on /download page** | Website `/download` links to EAS artifact URL + QR |
| Sideload "Unknown sources" instructions? | **Yes, show instructions** | `/download` explains "Allow install from browser" |
| EAS channels | **Two: preview + production** | Preview internal, production is the website APK |

## Batch 12 — Storage Cap, Crash Destination, Display Name, Content Freshness

| Q | Answer | Implication |
|---|--------|-------------|
| Default storage cap value | **2 GB cap** | Enforced default; user can change in Settings |
| Crash log destination | **Supabase `app_errors` table** | Anon INSERT `{message, stack, route, appVersion, deviceOs}` |
| Launcher display name | **Manhaj Sunnah** | `app.json` `name` |
| When does app see a newly published episode? | **On next app open / pull-to-refresh** | No Realtime subscription; React Query refetch on focus/refresh |

## Batch 13 — Expo SDK, Analytics, Privacy, Support

| Q | Answer | Implication |
|---|--------|-------------|
| Expo SDK version | **Latest stable (ask at scaffold time)** | Pin at `npx create-expo-app` time; spec says 54/55 family |
| Anonymous play/download analytics for admins? | **Yes, lightweight analytics** | New `episode_plays {episode_id, played_at, source}` (anon) |
| Privacy policy | **Write now on the website (/privacy)** | Do not defer to Play prep — website needs `/privacy` in v1 |
| Bug/help channel | **Same as web (WhatsApp/Telegram link)** | Reuse existing contact; no new in-app form in v1 |

---

## Superseded Answers (for audit)

- **Push: `Fast-follow` (Batch 1) → `In web repo` (Batch 7) → `Drop entirely` (Batch 8 final).** Final is **no push**. Spec v2 §10 reflects this.
- **Dev workflow: `Local dev-client` + `No toolchain` (Batch 2/3) → `Expo Go + occasional` (Batch 4) → `Accept: dev-build only` (Batch 5 final).** Final is **dev-build-only via EAS cloud, no Expo Go.**

## Invariants (never changed across batches)

- Android only; not iOS
- No listener auth (anon RLS)
- App in `./manhaj-app`
- Copy types
- Direct R2 audio URLs
- Sideload then Play Store (not Play-first)
- EAS free tier, latest stable SDK
- Full listener parity + full player parity + local resume
- No deep links

