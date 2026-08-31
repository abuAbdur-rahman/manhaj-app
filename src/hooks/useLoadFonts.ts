import { useFonts } from "expo-font";

export function useLoadFonts() {
  const [loaded, error] = useFonts({
    // Geist is loaded via expo-font Google Fonts if needed;
    // For now use system fonts + Noto via remote loading.
    // TODO: bundle Geist/Noto TTFs under assets/fonts and map here.
  });
  return { loaded, error };
}
