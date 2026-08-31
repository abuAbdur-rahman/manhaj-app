import { useQuery } from "@tanstack/react-query";

import {
  getAllScholars,
  getEpisodeBySlug,
  getFeaturedSeries,
  getRecentEpisodes,
  getScholarBySlug,
  getScholarEpisodes,
  getScholarSeries,
  getScholars,
  getSeriesWithEpisodes,
  searchEpisodes,
} from "@/lib/queries";

export function useRecentEpisodes(limit = 10) {
  return useQuery({
    queryKey: ["recent-episodes", limit],
    queryFn: () => getRecentEpisodes(limit),
  });
}

export function useFeaturedSeries() {
  return useQuery({
    queryKey: ["featured-series"],
    queryFn: () => getFeaturedSeries(),
  });
}

export function useScholars(limit = 3) {
  return useQuery({
    queryKey: ["scholars", limit],
    queryFn: () => getScholars(limit),
  });
}

export function useAllScholars() {
  return useQuery({
    queryKey: ["all-scholars"],
    queryFn: () => getAllScholars(),
  });
}

export function useScholarBySlug(slug: string) {
  return useQuery({
    queryKey: ["scholar", slug],
    queryFn: () => getScholarBySlug(slug),
    enabled: !!slug,
  });
}

export function useScholarSeries(scholarId: string) {
  return useQuery({
    queryKey: ["scholar-series", scholarId],
    queryFn: () => getScholarSeries(scholarId),
    enabled: !!scholarId,
  });
}

export function useScholarEpisodes(scholarId: string, limit = 50) {
  return useQuery({
    queryKey: ["scholar-episodes", scholarId, limit],
    queryFn: () => getScholarEpisodes(scholarId, limit),
    enabled: !!scholarId,
  });
}

export function useSeriesWithEpisodes(scholarSlug: string, seriesSlug: string) {
  return useQuery({
    queryKey: ["series-with-episodes", scholarSlug, seriesSlug],
    queryFn: () => getSeriesWithEpisodes(scholarSlug, seriesSlug),
    enabled: !!scholarSlug && !!seriesSlug,
  });
}

export function useEpisodeBySlug(slug: string) {
  return useQuery({
    queryKey: ["episode", slug],
    queryFn: () => getEpisodeBySlug(slug),
    enabled: !!slug,
  });
}

export function useSearchEpisodes(query: string, language?: string) {
  return useQuery({
    queryKey: ["search", query, language],
    queryFn: () => searchEpisodes(query, language),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}
