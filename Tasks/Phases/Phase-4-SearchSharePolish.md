# Phase 4 — Search, Share, Polish

status: todo
est: 2–3 days
plan: `../../plan.md#milestone-4`

## Goal
Search + share + lightweight polish; website channel.

## Tasks
- [ ] T4-01 `search.tsx` → `GET ${API_URL}/api/search?q=&language=`
- [ ] T4-02 Share sheet to `manhaj-sunnah.vercel.app/lectures/[slug]` (test WhatsApp top)
- [ ] T4-03 Website `/download` (Next.js) — version/size/updated-at, EAS artifact link + QR, sideload instructions, link to `/privacy`
- [ ] T4-04 Website `/privacy` policy (spec: `../../website-download-privacy-spec.md`)
- [ ] T4-05 Crash log `app_errors` (anon INSERT) + empty/error/offline polish
- [ ] T4-06 Support link (WhatsApp/Telegram) in Settings

## Verify
Search matches web; share opens WhatsApp; `/download` QR installs APK; `/privacy` loads.

## Parallel
Website work (T4-03/04) can run alongside Phase 3.
