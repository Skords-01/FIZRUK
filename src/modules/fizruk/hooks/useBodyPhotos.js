import { useCallback, useEffect, useState } from "react";

const DB_NAME = "fizruk_photos_v1";
const STORE = "photos";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("date", "date", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function dbGetAll(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

function dbPut(db, record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put(record);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function dbDelete(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

function uid() {
  return `ph_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Hook for storing body progress photos in IndexedDB.
 * Each photo record: { id, date (YYYY-MM-DD), dataUrl, note, createdAt }
 */
export function useBodyPhotos() {
  const [photos, setPhotos] = useState([]);
  const [ready, setReady] = useState(false);
  const [dbRef, setDbRef] = useState(null);

  useEffect(() => {
    let cancelled = false;
    openDB()
      .then(async (db) => {
        if (cancelled) return;
        setDbRef(db);
        const all = await dbGetAll(db);
        if (!cancelled) {
          setPhotos(
            all.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
          );
          setReady(true);
        }
      })
      .catch((err) => {
        console.error("useBodyPhotos: IndexedDB error", err);
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addPhoto = useCallback(
    async (dataUrl, dateStr, note = "") => {
      if (!dbRef) return null;
      const record = {
        id: uid(),
        date: dateStr || new Date().toISOString().slice(0, 10),
        dataUrl,
        note,
        createdAt: new Date().toISOString(),
      };
      await dbPut(dbRef, record);
      setPhotos((prev) =>
        [record, ...prev].sort((a, b) =>
          (b.date || "").localeCompare(a.date || ""),
        ),
      );
      return record;
    },
    [dbRef],
  );

  const deletePhoto = useCallback(
    async (id) => {
      if (!dbRef) return;
      await dbDelete(dbRef, id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    },
    [dbRef],
  );

  return { photos, ready, addPhoto, deletePhoto };
}
