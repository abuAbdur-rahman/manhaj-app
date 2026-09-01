export function useLoadFonts() {
  // Fonts are bundled natively via the expo-font config plugin (app.json),
  // so there is nothing to load at runtime.
  return { loaded: true, error: null };
}
