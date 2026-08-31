import { Platform, PermissionsAndroid } from "react-native";
import { kvGet, kvSet } from "@/lib/db";

const KEY = "notification_prompt_done";

/** Request POST_NOTIFICATIONS once on first playback. Respects prior denial — never re-prompts. */
export async function requestNotificationPermissionOnce(): Promise<"granted" | "denied" | "skipped"> {
  if (Platform.OS !== "android") return "skipped";
  if (kvGet(KEY)) return "skipped";
  try {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    kvSet(KEY, "1");
    return result === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "denied";
  } catch {
    kvSet(KEY, "1");
    return "denied";
  }
}
