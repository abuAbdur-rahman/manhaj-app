import { kvDelete, kvGet, kvSet } from "./db";

type PersistedClientStub = unknown;
type PersisterStub = {
  persistClient(p: PersistedClientStub): Promise<void>;
  restoreClient(): Promise<PersistedClientStub | undefined>;
  removeClient(): Promise<void>;
};

const KEY = "rq-cache-v1";

/**
 * SQLite-backed query persister for offlineFirst.
 * Uses kv table (manhaj.db) via sync helpers but wraps as async Persister
 * to satisfy @tanstack/query-persist-client. Falls back to in-memory if SQLite unavailable.
 */
export function createNativePersister(): PersisterStub {
  let mem: PersistedClientStub | undefined;
  return {
    async persistClient(p: PersistedClientStub) {
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
        if (raw) return JSON.parse(raw) as PersistedClientStub;
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
