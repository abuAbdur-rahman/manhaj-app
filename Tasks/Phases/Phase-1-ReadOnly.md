# Phase 1 — Read-Only Screens

status: todo
est: 3–5 days
plan: `../../plan.md#milestone-1`

## Goal
Browse without playback — Home → Scholars → Scholar Tabs → Series → Lecture.

## Tasks
- [ ] T1-01 Typed Supabase queries in `lib/supabase.ts`
- [ ] T1-02 Copy `types/index.ts` from `../../manhaj/types/` into app
- [ ] T1-03 React Query + persist (SQLite/AsyncStorage), cached-first + pull-to-refresh
- [ ] T1-04 Routes: `app/index.tsx` Home, `scholars/index` + `[slug]/index`, `scholars/[slug]/[series].tsx`, `lectures/[slug].tsx`, `search.tsx`, `downloads.tsx`/`settings.tsx` shells
- [ ] T1-05 Port `AudioCard` (3 variants) + bilingual titles (English UI / Arabic `font-arabic`)
- [ ] T1-06 Error/empty/offline states per screen

## Verify
Navigate Home→Scholar→Series→Lecture on device; pull-to-refresh reflects newly published episode.
