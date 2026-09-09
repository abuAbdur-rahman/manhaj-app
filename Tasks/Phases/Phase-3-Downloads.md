# Phase 3 — Offline Downloads

status: todo
est: 3–5 days
plan: `../../plan.md#milestone-3`

## Goal
Resilient downloads that survive storage pressure and flaky connections.

## Tasks
- [ ] T3-01 `lib/downloads.ts` + SQLite `downloads` table (`createDownloadResumable`)
- [ ] T3-02 Per-episode file size via R2 `content-length` HEAD
- [ ] T3-03 Download UI: size, progress, pause/resume, retry, remove
- [ ] T3-04 Cellular gate (`NetInfo`) — warn on mobile data, `WifiOnlyDownloads` toggle (default OFF)
- [ ] T3-05 Storage cap 2 GB default, Settings used/available + cap picker, block over-budget
- [ ] T3-06 Local playback path: SQLite `file_uri` → `TrackPlayer` else R2 URL
- [ ] T3-07 `downloads.tsx` list + `settings.tsx` storage summary

## Verify
Airplane-mode playback, resume mid-download, cap blocks over-budget.

## Notes
No auto-evict; explicit Remove / Remove-all only.
