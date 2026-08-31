/**
 * Native query persister stub.
 * Web uses IndexedDB (manhaj/lib/query-persister.ts -> idb).
 * Native persistence goes via SQLite/AsyncStorage in M4 offline.
 * For M1 (read-only screens) persistence is in-memory only; React Query
 * still caches in JS heap and refetches on focus via offlineFirst.
 *
 * When M4 lands, replace with expo-sqlite or @react-native-async-storage
 * backed Persister implementing @tanstack/react-query-persist-client Persister.
 */
type PersistedClientStub = unknown;
type PersisterStub = {
  persistClient(p: PersistedClientStub): Promise<void>;
  restoreClient(): Promise<PersistedClientStub | undefined>;
  removeClient(): Promise<void>;
};

export function createNativePersister(): PersisterStub {
  let mem: PersistedClientStub | undefined;
  return {
    async persistClient(p: PersistedClientStub) {
      mem = p;
    },
    async restoreClient() {
      return mem;
    },
    async removeClient() {
      mem = undefined;
    },
  };
}
