export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://manhaj-sunnah.vercel.app",
  r2PublicUrl: process.env.EXPO_PUBLIC_R2_PUBLIC_URL ?? "",
} as const;

export function assertEnv() {
  const missing: string[] = [];
  if (!env.supabaseUrl) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!env.supabaseAnonKey) missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }
}
