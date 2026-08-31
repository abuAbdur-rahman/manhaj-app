# Website Changes for App Sideload — Spec (`/download` + `/privacy`)

**Parent spec:** `spec-v2.md` §13  
**Where:** `manhaj/` (Next.js app) — NOT in `manhaj-app/` (the Expo app)  
**Grill decisions:** APK via website new page + EAS artifact link; show sideload instructions; `/privacy` written now (not deferred to Play)

---

## 1. New page `/download` (or `/app` — pick one and 301 the other)

### Purpose
The sideload distribution channel. The production EAS APK's **artifact URL** is linked from here (+ QR), so users can install without Play Store. Free-tier EAS already produces this URL.

### Route
- Add `app/(public)/download/page.tsx` (public, no auth, no `proxy.ts` guard).
- If you prefer `/app`, keep `/download` as a `redirect` entry in `next.config.ts`.

### Content (layout — mobile-first, but a desktop page too)

```
[Header: Manhaj Sunnah — Download the Android App]

[Card: Latest APK]
  Version 0.1.0   •   Updated Aug 2026   •   APK ~35–50 MB   •   Requires Android 7+ (see note below)
  [Download APK]  ← href = EAS production artifact URL (not a local file)
  [QR code]       ← QR of the same URL for installing from a laptop screen
  SHA-256: <hash> (optional, if EAS exposes artifact hash)

[How to install (sideload)]
  1. Tap Download APK.
  2. When Android warns "Install blocked — Allow install from browser", tap Settings → Allow.
  3. Open the APK and tap Install.
  [Why sideload?] short explainer: Play Store coming later; APK is built by EAS Build from this repo.

[What's in the app]
  • Browse scholars, series, episodes
  • Stream or download for offline (Downloads page), 2 GB default cap, shows file size
  • Background playback + notification controls, speed 0.75–2×, sleep timer
  • Search, Share to WhatsApp, offline queue

[Links]
  Privacy Policy → /privacy
  Support → WhatsApp/Telegram (same as website footer)
  Source — github link if repo is public

[Note about Android 7 vs 9]
  "Tested on Android 9+; Android 7–8 may work but isn't QA'd on-device."
```

### Data / config
- Do NOT check the APK binary into git. The `EAS artifact URL` is external; you can also copy the hash/size/updated-at into env or a tiny JSON for the page to read.
- Option A (simple): hardcode `EAS_ARTIFACT_URL` as `NEXT_PUBLIC_APP_APK_URL` in `.env` + Vercel env; page reads it.
- Option B (no env): manually edit the page per release — acceptable for the first few builds.
- Generate QR server-side at build (e.g. `qrcode` lib) or as a static asset per release.

### Polish
- Install button is large (≥44×44), high-contrast forest palette, visible focus ring.
- Version + size + updated-at are real values (not placeholder).
- Add `<link rel="canonical" href="https://manhaj-sunnah.vercel.app/download">`.
- If deploying to a custom domain later, update EAS `EXPO_PUBLIC_API_URL` and this page's URLs together.

---

## 2. New page `/privacy`

### Purpose
Privacy policy for the **app** (grill: write now, even though Play Store is later — keeps you honest and satisfies early sideloaders).

### Route
- `app/(public)/privacy/page.tsx`, public, SEO `metadata` title.

### Content (concise, human-readable — adapt to your counsel, not legal advice)

Sections:

1. **Overview** — Manhaj Sunnah app respects your privacy; no accounts in v1.
2. **Data we collect**
   - Anonymous play counts: `episode_id` + timestamp + source (stream/offline). No name, email, or ID.
   - Anonymous crash logs: error message + stack + screen + app version + OS version (if you opt to send).
   - No location, contacts, or device identifiers beyond what OS requires for playback.
3. **Data we do NOT collect** — no accounts, no personal data, no third-party trackers.
4. **Offline files** — downloaded lectures are stored on your device only (`FileSystem.documentDirectory`); uninstalling deletes them.
5. **Permissions** — foreground service (background audio) + notifications (one-time prompt; you can deny).
6. **Sharing** — native Android share sheet; we don't see who you share with.
7. **Contact** — same WhatsApp/Telegram link as the site.
8. **Changes** — policy updated date; link from `/download`.

### Implementation note
Reuse the web's typography (Geist + Noto Naskh Arabic), sand/ink colors, and footer nav. Keep it as plain markdown/JSX — no CMS.

---

## 3. Supabase tables needed (app writes, web reads)

Add via Supabase migrations in `manhaj/supabase/` (not in the app repo).

```sql
-- episode_plays — lightweight analytics (grill decision)
create table if not exists public.episode_plays (
  id uuid primary key default gen_random_uuid(),
  episode_id text not null references public.episodes(id) on delete cascade,
  played_at timestamptz not null default now(),
  source text not null check (source in ('stream','offline'))
);
alter table public.episode_plays enable row level security;
create policy anon_insert_plays on public.episode_plays
  for insert to anon with check (true);
-- no anon SELECT; dashboards query via service_role or an admin-only policy

-- app_errors — crash logs (grill decision)
create table if not exists public.app_errors (
  id uuid primary key default gen_random_uuid(),
  message text,
  stack text,
  route text,
  app_version text,
  device_os text,
  created_at timestamptz not null default now()
);
alter table public.app_errors enable row level security;
create policy anon_insert_errors on public.app_errors
  for insert to anon with check (true);
```

Web admin can query both via `service_role` or add a `super_admin` SELECT policy.

---

## 4. Out of scope (explicitly not in this spec)

- Play Store listing, AAB, screenshots, content rating, data safety form — separate later task per `manhaj-deployment-budget-v2.md`.
- Deep links / `/.well-known/assetlinks.json` — skipped per grill.
- Push token tables / webhooks — dropped per grill.
- Auth / accounts — not in v1.

