import type { PersistedClient, Persister } from "@tanstack/query-persist-client-core";

import { kvDelete, kvGet, kvSet } from "./db";

const KEY = "rq-cache-v1";

/**
 * SQLite-backed query persister for offlineFirst.
 * Uses kv table (manhaj.db) via sync helpers but wraps as async Persister
 * to satisfy @tanstack/query-persist-client. Falls back to in-memory if SQLite unavailable.
 */
export function createNativePersister(): Persister {
  let mem: PersistedClient | undefined;
  return {
    async persistClient(p: PersistedClient) {
      mem = p;
      try {
        kvSet(KEY, JSON.stringify(p));
      } catch {
        // keep mem fallback
      }
    },
    async restoreClient() {
      try {
        const raw = kvGet(KEY);
        if (raw) return JSON.parse(raw) as PersistedClient;
      } catch {}
      return mem;
    },
    async removeClient() {
      mem = undefined;
      try {
        kvDelete(KEY);
      } catch {}
    },
  };
}

// alias for queryClient wiring
export const createSqlitePersister = createNativePersister;
