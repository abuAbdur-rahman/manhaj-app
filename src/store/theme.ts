import { Appearance } from "react-native";
import { create } from "zustand";
import { kvGet, kvSet } from "@/lib/db";

export type ThemePreference = "system" | "light" | "dark";
const THEME_KEY = "theme_preference_v1";

function loadPreference(): ThemePreference {
  try {
    const raw = kvGet(THEME_KEY) as ThemePreference | null;
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {}
  return "system";
}
function persistPreference(v: ThemePreference) {
  try {
    kvSet(THEME_KEY, v);
  } catch {}
}

interface ThemeStore {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  hydrate: () => void;
  resolved: (system: string | null | undefined) => "light" | "dark";
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  preference: loadPreference(),
  setPreference: (preference) => {
    persistPreference(preference);
    set({ preference });
  },
  hydrate: () => set({ preference: loadPreference() }),
  resolved: (system) => {
    const pref = get().preference;
    if (pref === "system") return system === "dark" ? "dark" : "light";
    return pref;
  },
}));
