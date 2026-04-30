'use client';

const DB_NAME = 'owner-ai-image-to-image-evaluation';
const DB_VERSION = 1;
const STORE_NAME = 'shared-floor-plan-files';
const SHARED_FLOOR_PLAN_ID = 'shared-floor-plan';

type StoredSharedFloorPlanFile = {
  id: typeof SHARED_FLOOR_PLAN_ID;
  blob: Blob;
  fileName: string;
  mimeType: string;
  updatedAt: string;
};

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

async function openSharedFileDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return null;

  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };

  return requestToPromise(request);
}

async function withSharedFileStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openSharedFileDb();
  if (!db) return null;

  try {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    return await requestToPromise(action(store));
  } finally {
    db.close();
  }
}

export async function saveSharedFloorPlanFile(file: File): Promise<void> {
  const record: StoredSharedFloorPlanFile = {
    id: SHARED_FLOOR_PLAN_ID,
    blob: file,
    fileName: file.name,
    mimeType: file.type,
    updatedAt: new Date().toISOString(),
  };

  await withSharedFileStore('readwrite', (store) => store.put(record));
}

export async function loadSharedFloorPlanFile(): Promise<File | null> {
  const record = await withSharedFileStore<StoredSharedFloorPlanFile | undefined>(
    'readonly',
    (store) => store.get(SHARED_FLOOR_PLAN_ID),
  );
  if (!record) return null;

  return new File([record.blob], record.fileName, {
    type: record.mimeType || record.blob.type,
    lastModified: new Date(record.updatedAt).getTime(),
  });
}

export async function clearSharedFloorPlanFile(): Promise<void> {
  await withSharedFileStore('readwrite', (store) => store.delete(SHARED_FLOOR_PLAN_ID));
}
