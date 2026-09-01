# Impeccable Audit — manhaj-app 2026-09-01 (pre-fix baseline)

> Historical baseline recorded BEFORE the multi-agent review (Critical + Important fixes) and
> CodeRabbit rounds were applied. Scores below describe the pre-fix state; several claims no
> longer hold on `main`/`dev` (e.g. `accessibility*` props, `dark:` variants, touch targets,
> predictive back gesture, tab icons). Keep as reference only.

Health: **7/20 Poor** — android target, NativeWind, track-player

## Scores
- A11y 1/4 — zero `accessibility*` props, pills `py-1.5` <48dp, `text-[11px]` fixed, `Text onPress` retry
- Perf 2/4 — `ScrollView+map` unvirtualized (index/search/scholar-detail), 1s polling `getProgress`, no image priority
- Theming 1/4 — dual tokens `tailwind.config` vs `constants/theme Colors`, dark broken (`bg-white`, `bg-sand-50` hardcoded), no `dark:` variants, ad-hoc `emerald`, `global.css` vars unused
- Platform 2/4 — `predictiveBackGestureEnabled: false`, icon reuse `explore.png` for 3 tabs, Expo Starter leak `app-tabs.web.tsx:67`, no `FOREGROUND_SERVICE_DATA_SYNC` justification? (actually needed for RNTP)
- Adaptivity 1/4 — `orientation: portrait` locked, no tablet rail, no `KeyboardAvoidingView` on search

## P0
- Missing a11y semantics/roles/labels/hitSlop across Pressable/Text
- Dark theme completely unimplemented for NativeWind screens
- Undersized touch targets (filter chips, mini-player controls, card Play)
- `Text onPress` for retry (non-accessible tappable)
## P1
- `predictiveBackGestureEnabled false`
- Unvirtualized lists (use FlatList/VirtualizedList)
- Icon drift — duplicate `explore.png`
- Web scaffold still Expo Starter branding
- Text scaling / font load: `text-[11px]` should be `text-xs` + allowFontScaling
- Dual-theming tokens drift
- Search no keyboard handling (KeyboardAvoidingView + clear + labels)
## P2
- Queue BottomSheet missing a11y/backdrop/empty
- Image `cachePolicy` ok but no `priority`, missing accessibility labels
- Polling duplication (useProgress already polls — manual 1s `getProgress` redundant)
- Nested ScrollViews on Home/Scholar
- ThemeStore preference not reflected in NativeWind screens (only tabs)
- Mini-player bottom inset not accounting for safe-area/tab height

Positives: SafeAreaView consistent, expo-image cachePolicy, React Query cached-first+refetch, R2 host validation + 2GB cap, TrackPlayer service correctly registered headless.

Recommended order: harden → colorize → adapt → optimize → document → polish
