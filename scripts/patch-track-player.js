#!/usr/bin/env node
// Fix react-native-track-player Kotlin compile error with Kotlin 2.x
// Track.kt originalItem is Bundle? nullable, but MusicModule passes directly to Arguments.fromBundle(Bundle) non-null
// Patch both call sites to nullable-safe: ?.let { Arguments.fromBundle(it) }
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "../node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt");
if (!fs.existsSync(file)) {
  console.log("[patch-track-player] MusicModule.kt not found, skipping");
  process.exit(0);
}
let t = fs.readFileSync(file, "utf8");
let patched = false;
const replacements = [
  [
    "        if (index >= 0 && index < musicService.tracks.size) {\n            callback.resolve(Arguments.fromBundle(musicService.tracks[index].originalItem))",
    "        if (index >= 0 && index < musicService.tracks.size) {\n            callback.resolve(musicService.tracks[index].originalItem?.let { Arguments.fromBundle(it) })",
  ],
  [
    "        callback.resolve(\n            if (musicService.tracks.isEmpty()) null\n            else Arguments.fromBundle(\n                musicService.tracks[musicService.getCurrentTrackIndex()].originalItem\n            )",
    "        callback.resolve(\n            if (musicService.tracks.isEmpty()) null\n            else musicService.tracks[musicService.getCurrentTrackIndex()].originalItem?.let { Arguments.fromBundle(it) }",
  ],
];
for (const [oldStr, newStr] of replacements) {
  if (t.includes(oldStr)) {
    t = t.replace(oldStr, newStr);
    patched = true;
    console.log("[patch-track-player] patched one occurrence");
  } else if (t.includes(newStr)) {
    console.log("[patch-track-player] already patched");
  } else {
    console.warn("[patch-track-player] pattern not found, file may have changed");
  }
}
if (patched) {
  fs.writeFileSync(file, t, "utf8");
  console.log("[patch-track-player] done");
} else {
  console.log("[patch-track-player] no changes needed");
}
