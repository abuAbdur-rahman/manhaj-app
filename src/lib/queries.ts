import { supabase } from "@/lib/supabase";
import type { Episode, Scholar, Series } from "@/types";

function mapCount<T extends Record<string, unknown>>(row: T, key: string): number {
  const v = row[key] as { count: number }[] | undefined;
  return v?.[0]?.count ?? 0;
}

export async function getRecentEpisodes(limit = 10): Promise<Episode[]> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*, scholar:scholar_id(*), series:series_id(*)")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Episode[];
}

export async function getFeaturedSeries(): Promise<Series[]> {
  const { data, error } = await supabase
    .from("series")
    .select("*, scholar:scholar_id(*), episode_count:episodes(count)")
    .eq("is_featured", true)
    .eq("is_active", true)
    .limit(1);
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(
    (item) =>
      ({
        ...item,
        episode_count: mapCount(item, "episode_count"),
      }) as unknown as Series,
  );
}

export async function getScholars(limit = 3): Promise<Scholar[]> {
  const { data, error } = await supabase
    .from("scholars")
    .select("*, episode_count:episodes(count)")
    .eq("is_active", true)
    .order("name")
    .limit(limit);
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(
    (item) =>
      ({
        ...item,
        episode_count: mapCount(item, "episode_count"),
      }) as unknown as Scholar,
  );
}

export async function getAllScholars(): Promise<Scholar[]> {
  const { data, error } = await supabase
    .from("scholars")
    .select("*, episode_count:episodes(count), series_count:series(count)")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(
    (item) =>
      ({
        ...item,
        episode_count: mapCount(item, "episode_count"),
        series_count: mapCount(item, "series_count"),
      }) as unknown as Scholar,
  );
}

export async function getScholarBySlug(slug: string): Promise<Scholar | null> {
  const { data, error } = await supabase
    .from("scholars")
    .select("*, episode_count:episodes(count), series_count:series(count)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  return {
    ...(row as unknown as Scholar),
    episode_count: mapCount(row, "episode_count"),
    series_count: mapCount(row, "series_count"),
  } as Scholar;
}

export async function getScholarSeries(scholarId: string, limit = 50): Promise<Series[]> {
  const { data, error } = await supabase
    .from("series")
    .select("*, scholar:scholar_id(*), episode_count:episodes(count)")
    .eq("scholar_id", scholarId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(
    (item) =>
      ({
        ...item,
        episode_count: mapCount(item, "episode_count"),
      }) as unknown as Series,
  );
}

export async function getScholarEpisodes(scholarId: string, limit = 50): Promise<Episode[]> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*, scholar:scholar_id(*), series:series_id(*)")
    .eq("scholar_id", scholarId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Episode[];
}

export async function getSeriesWithEpisodes(
  scholarSlug: string,
  seriesSlug: string,
): Promise<{ series: Series; episodes: Episode[] } | null> {
  const { data: scholar, error: scholarError } = await supabase
    .from("scholars")
    .select("id, name, slug")
    .eq("slug", scholarSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (scholarError) throw scholarError;
  if (!scholar) return null;

  const { data: seriesData, error: seriesError } = await supabase
    .from("series")
    .select("*, scholar:scholar_id(*), episode_count:episodes(count)")
    .eq("scholar_id", (scholar as { id: string }).id)
    .eq("slug", seriesSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (seriesError) throw seriesError;
  if (!seriesData) return null;

  const row = seriesData as unknown as Record<string, unknown>;
  const series = {
    ...(row as unknown as Series),
    episode_count: mapCount(row, "episode_count"),
  } as Series;

  const { data: episodes, error: episodesError } = await supabase
    .from("episodes")
    .select("*, scholar:scholar_id(*), series:series_id(*)")
    .eq("series_id", series.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (episodesError) throw episodesError;
  return { series, episodes: episodes as Episode[] };
}

export async function getEpisodeBySlug(slug: string): Promise<Episode | null> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*, scholar:scholar_id(*), series:series_id(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  return data as Episode | null;
}

export async function getScholarById(id: string): Promise<Scholar | null> {
  const { data, error } = await supabase
    .from("scholars")
    .select("*, episode_count:episodes(count), series_count:series(count)")
    .eq("id", id)
    .eq("is_active", true)
    .single();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  return {
    ...(row as unknown as Scholar),
    episode_count: mapCount(row, "episode_count"),
    series_count: mapCount(row, "series_count"),
  } as Scholar;
}

export async function getSeriesEpisodes(seriesId: string, limit = 10): Promise<Episode[]> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*, scholar:scholar_id(*), series:series_id(*)")
    .eq("series_id", seriesId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Episode[];
}

export async function searchEpisodes(query: string, language?: string): Promise<Episode[]> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "https://manhaj-sunnah.vercel.app";
  const params = new URLSearchParams({ q: query });
  if (language) params.set("language", language);
  const res = await fetch(`${apiUrl}/api/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const json = await res.json();
  // API returns { data: Episode[] } or { episodes: ... } — handle both
  return (json.data ?? json.episodes ?? json) as Episode[];
}
