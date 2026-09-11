"use client";

import { SavedPhotoMeta } from "./types";

// The photo library's actual storage: entirely on-device, in IndexedDB —
// no server round-trip, no dependency on any hosting platform's object
// storage being configured (see lib/storage.ts's own comment for why that
// used to be a real, silent failure mode on a Vercel deployment with no
// Blob store connected). Trade-off, and it's a real one: this library now
// lives in one browser on one device, and — unlike a real native app —
// iOS Safari can evict a PWA's site data (IndexedDB included) after
// roughly a week of the app going unused. Good enough for a personal
// camera app's working library; not a substitute for actually backing up
// photos you care about (see lib/sharePhoto.ts's "Enregistrer dans
// Photos", which puts the real file in the OS's own Photos app).
const DB_NAME = "camera-palama";
const DB_VERSION = 1;
const STORE = "photos";

export type StoredPhoto = SavedPhotoMeta & { blob: Blob };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function dbPutPhoto(record: StoredPhoto): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbListPhotos(): Promise<StoredPhoto[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as StoredPhoto[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDeletePhoto(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
