# Phase 0 — Scaffolding & Dev Loop

status: todo
est: 1–2 days
plan: `../../plan.md#milestone-0`

## Goal
Empty Expo app that builds as EAS dev-client APK and runs on physical phone (no toolchain, no Expo Go).

## Tasks
- [ ] T0-01 `npx create-expo-app` latest stable SDK; pin `sdkVersion` in `app.json`
- [ ] T0-02 Install deps: `expo-router` `expo-file-system` `expo-sqlite` `expo-sharing` `expo-secure-store` `expo-dev-client` `expo-updates` `expo-font` `@react-native-community/netinfo` `@supabase/supabase-js` `zustand` `nativewind` `@tanstack/react-query` `react-native-track-player` `@gorhom/bottom-sheet` `react-native-tab-view`
- [ ] T0-03 `app.json` identity: `name: Manhaj Sunnah`, `slug: manhaj`, `android.package: com.manhaj.app`, permissions `[FOREGROUND_SERVICE, POST_NOTIFICATIONS, FOREGROUND_SERVICE_MEDIA_PLAYBACK]`, `expo-updates` channels `preview`/`production`, `scheme: manhaj`
- [ ] T0-04 Port design tokens from `../../manhaj/app/globals.css` (`@theme` forest/sand/clay/ink) into NativeWind; load Geist + Noto Naskh Arabic via `expo-font`
- [ ] T0-05 Supabase stub `lib/supabase.ts` (SecureStore adapter) + EAS secrets `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY`/`API_URL`
- [ ] T0-06 Verify: `eas build --platform android --profile preview` → APK QR → `npx expo start` works on device

## Verify
APK installs on Android 9+ handset, splash shows, empty Home renders.

## Risks
EAS free 30/mo — budget JS churn to OTA.
