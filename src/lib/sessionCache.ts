import type { CleanupOptions, Note } from '@/types/transcription';

const DB_NAME = 'musicme';
const DB_VERSION = 1;
const STORE = 'session';
const KEY = 'current';

export interface CachedTrack {
  id: string;
  name: string;
  blob: Blob;
  peaks: number[];
  duration: number;
  muted: boolean;
}

export type CachedSession = {
  tracks?: CachedTrack[];
  audio?: Blob; // Legacy single audio compatibility
  rawNotes: Note[];
  cleanedNotes: Note[];
  options: CleanupOptions;
  createdAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export const sessionCache = {
  save: (s: CachedSession) => tx('readwrite', (store) => store.put(s, KEY)),
  load: () => tx<CachedSession | undefined>('readonly', (store) => store.get(KEY)),
  clear: () => tx('readwrite', (store) => store.delete(KEY)),
};
