import { useFonts } from "expo-font";

export function useLoadFonts() {
  // Phase-0: system fonts; Geist + Noto Naskh Arabic bundled in Phase-1
  // when @expo-google-fonts/* is added. Keeping hook stable for _layout.
  const [loaded, error] = useFonts({});
  return { loaded, error };
}
