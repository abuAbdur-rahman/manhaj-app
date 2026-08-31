import { QueryClient } from "@tanstack/react-query";

/**
 * Offline-first defaults ported from manhaj/lib/query-client.ts
 * networkMode offlineFirst keeps cached data rendering while offline.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      networkMode: "offlineFirst",
      retry: 0,
    },
  },
});

export function invalidateDownloads(): void {
  queryClient.invalidateQueries({ queryKey: ["downloads"] });
}
