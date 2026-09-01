# Manhaj Design System — Single Source

> Android-only. NativeWind + semantic tokens. One accent per screen (forest).

## Tokens (source: `tailwind.config.js` + `global.css`)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `forest-*` | 600 #155732 | 400 tint | primary actions, active states |
| `sand-*` | 50 #fafaf7, 100,200 | `ink-800` bg, `ink-700` border | surface, cards, dividers |
| `ink` | #1a1a1a | white | headings |
| `ink-500/400` | muted | 400/500 flipped | secondary text |
| `clay-500` | #c47a3c | same | audio utility (progress) — not general accent |

- `darkMode: 'class'` — root `View` in `app/_layout.tsx` adds `dark` via `useThemeStore` resolved preference. All screens use `dark:` variants (`bg-white dark:bg-ink-800`, `border-sand-200 dark:border-ink-800`).
- `global.css` vars mirror tailwind tokens + `.dark` block. Do not add ad-hoc `emerald`/`amber`/`#hex`.

## Typography

- Geist (UI), Noto Naskh Arabic (titles). Never `text-[11px]` — minimum `text-xs` (12sp) + `allowFontScaling=true` (default).
- Section kicker: `text-xs uppercase tracking-widest text-forest-600 dark:text-forest-400`.

## Touch & A11y

- Min 44×44 dp: `style={{minHeight:44}}` + `hitSlop={8}` on all Pressables. Chips use `px-5 py-2.5`.
- Roles: `accessibilityRole="button"/"radio"` + `accessibilityLabel` + `accessibilityState` where selected.
- Never `Text onPress` — wrap in `Pressable`.

## Lists

- Virtualized: `FlatList` (lectures, downloads, scholars horizontal via `horizontal FlatList`). No `ScrollView+map` for unbounded data. `contentContainerClassName` + `ItemSeparatorComponent`.
- Images: `expo-image` `cachePolicy="memory-disk"` + `priority="low"` + `accessibilityLabel`.

## Platform

- `app.json` `android.predictiveBackGestureEnabled: true`, `orientation: "default"` (tablet rail future), `edgeToEdgeEnabled: true` — MiniPlayer respects `useSafeAreaInsets()`.
- Tabs: `NativeTabs` (android) + `app-tabs.web.tsx` (web, branded Manhaj Sunnah, no Expo Starter). Each tab `drawable` distinct, SF symbols distinct.

## Search

- `KeyboardAvoidingView behavior="padding"` + clear button + `accessibilityLabel="Search lectures"` + `FlatList` results.

## Player

- `useProgress` drives slider/progress; no manual 1s `getProgress` polling. `tickSleepTimer` only interval. Queue `BottomSheet` has backdrop + empty state.
