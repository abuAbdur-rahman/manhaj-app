# Phase 5 — Pre-Release QA & OTA Smoke Test

status: todo
est: 1–2 days
plan: `../../plan.md#milestone-5`

## Goal
Two-channel build + OTA + real-device matrix before sideload.

## Tasks
- [ ] T5-01 Two-channel build `preview` + `production`; `eas update` OTA smoke test
- [ ] T5-02 Real-device matrix (low-end Android 9+, API 24–28 risk; bump min to 28 if unstable)
- [ ] T5-03 R2 bucket ACL check (public-readable or pivot to presigned)
- [ ] T5-04 Permission denial flow (deny POST_NOTIFICATIONS → playback still works)
- [ ] T5-05 RLS verify anon INSERT only on `episode_plays`/`app_errors`
- [ ] T5-06 Free-tier build budget check

## Verify
Production APK from `production` installs via `/download` on fresh device.

## Out of scope
Play Store (separate later task — see `plan.md`).
