# Phase 2 — Playback

status: todo
est: 4–6 days
plan: `../../plan.md#milestone-2`

## Goal
Streaming playback with background service, lock-screen + headset controls, full parity.

## Tasks
- [ ] T2-01 Track-player `PlaybackService` (`RemotePlay/Pause/Next/Seek/Duck`)
- [ ] T2-02 Port `store/player.ts` (replace Howler with `TrackPlayer` calls)
- [ ] T2-03 MiniPlayer via `usePlaybackState`/`useProgress` + `@gorhom/bottom-sheet`
- [ ] T2-04 Speed 0.75–2× + sleep timer → `pause` at zero
- [ ] T2-05 Queue + last episode + position persistence (SQLite)
- [ ] T2-06 Analytics insert `episode_plays {episode_id, source:'stream'}` on play
- [ ] T2-07 `POST_NOTIFICATIONS` one-time prompt on first playback

## Verify
Background → notification persists, lock-screen + headset work, timer fires, relaunch restores position.

## Blocked by
EAS dev build (no Expo Go).
