import { supabase } from "@/lib/supabase";

/** Fire-and-forget anon insert into app_errors (anon RLS insert-only). Never throws. */
export async function logAppError(params: {
  message: string;
  stack?: string;
  route?: string;
  appVersion?: string;
  deviceOs?: string;
}): Promise<void> {
  try {
    await supabase.from("app_errors").insert({
      message: params.message.slice(0, 2000),
      stack: params.stack?.slice(0, 4000) ?? null,
      route: params.route ?? null,
      app_version: params.appVersion ?? null,
      device_os: params.deviceOs ?? null,
    });
  } catch {}
}
