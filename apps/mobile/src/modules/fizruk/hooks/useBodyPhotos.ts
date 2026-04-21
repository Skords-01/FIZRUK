/**
 * Fizruk — `useBodyPhotos` hook (mobile).
 *
 * Native-first port of `apps/web/src/modules/fizruk/hooks/useBodyPhotos.ts`.
 * Differences from the web hook:
 *
 * - **Storage backend.** Web stored the full photo BLOB as a base64
 *   `dataUrl` in IndexedDB. Mobile writes only the lightweight
 *   `BodyPhotoMeta` records to MMKV (via the shared `@/lib/storage`
 *   helpers) and persists the BLOB on disk through the
 *   `photoFileStore` adapter (see `photoFileStore.ts`).
 * - **Ordering is delegated.** The web hook did an ad-hoc `localeCompare`
 *   inside the reducer. Mobile (and the web port once it catches up)
 *   calls `sortPhotosLatestFirst` from
 *   `@sergeant/fizruk-domain/domain/photos` so the sort contract is
 *   covered by vitest and shared across platforms.
 * - **Sync API.** MMKV is synchronous, so the hook returns the current
 *   value immediately on first render — no loading flash, `ready` is
 *   always `true` on the mobile return. We keep the flag in the return
 *   shape for parity with the web hook.
 *
 * CRUD surface: `list`, `add`, `update`, `remove`, `clear`. `photos` is
 * the sorted snapshot; `list()` is a convenience accessor that returns
 * the same value for callers that prefer calling a method.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { BODY_PHOTOS_STORAGE_KEY } from "@sergeant/fizruk-domain/constants";
import {
  filterValidPhotos,
  sortPhotosLatestFirst,
  type BodyPhotoMeta,
} from "@sergeant/fizruk-domain/domain/photos/index";

import { _getMMKVInstance, safeReadLS, safeWriteLS } from "@/lib/storage";

import {
  clearAllPersistedPhotos,
  deletePersistedUri,
  persistSourceUri,
} from "./photoFileStore";

/**
 * Input shape for `add` — the picker (once wired) hands the hook a
 * source URI; the hook is responsible for persisting the BLOB and
 * writing the metadata row.
 */
export interface AddBodyPhotoInput {
  /** Source URI from the image picker / camera. */
  sourceUri: string;
  /** ISO date-only string ("YYYY-MM-DD") — defaults to the current day. */
  takenAt?: string;
  /** Optional user-supplied note. */
  note?: string;
  /** Optional weight-in-kg snapshot. */
  weightKg?: number;
}

/** Patch shape for `update` — id is passed separately. */
export type UpdateBodyPhotoPatch = Partial<
  Pick<BodyPhotoMeta, "takenAt" | "note" | "weightKg">
>;

export interface UseBodyPhotosReturn {
  /** Sorted-latest-first snapshot. */
  photos: BodyPhotoMeta[];
  /** Always `true` on mobile (MMKV is sync) — kept for API parity. */
  ready: boolean;
  /** Same value as `photos`, exposed as a method for call-site taste. */
  list: () => BodyPhotoMeta[];
  /** Persist a new photo. Returns the written record. */
  add: (input: AddBodyPhotoInput) => Promise<BodyPhotoMeta>;
  /** Patch an existing record. No-op + resolves to `null` on unknown id. */
  update: (
    id: string,
    patch: UpdateBodyPhotoPatch,
  ) => Promise<BodyPhotoMeta | null>;
  /** Delete a record and its on-disk BLOB. */
  remove: (id: string) => Promise<void>;
  /** Delete every record and wipe the photo directory. */
  clear: () => Promise<void>;
}

/**
 * Dependency-injection seam for jest tests. Production code passes
 * nothing and the hook falls back to `Date.now()` / `Math.random()`.
 */
export interface UseBodyPhotosOptions {
  /** Clock seam — defaults to `new Date()`. */
  now?: () => Date;
  /** Id seam — defaults to a time-prefixed base-36 string. */
  generateId?: () => string;
}

function todayDateKey(clock: () => Date): string {
  const d = clock();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultIdFactory(clock: () => Date): () => string {
  return () =>
    `ph_${clock().getTime().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
}

function readPhotos(): BodyPhotoMeta[] {
  const raw = safeReadLS<unknown>(BODY_PHOTOS_STORAGE_KEY, []);
  return sortPhotosLatestFirst(filterValidPhotos(raw));
}

function writePhotos(photos: readonly BodyPhotoMeta[]): void {
  safeWriteLS(BODY_PHOTOS_STORAGE_KEY, photos);
}

export function useBodyPhotos(
  options: UseBodyPhotosOptions = {},
): UseBodyPhotosReturn {
  const clock = useMemo(() => options.now ?? (() => new Date()), [options.now]);
  const generateId = useMemo(
    () => options.generateId ?? defaultIdFactory(clock),
    [options.generateId, clock],
  );

  const [photos, setPhotos] = useState<BodyPhotoMeta[]>(() => readPhotos());

  useEffect(() => {
    // React to writes that originate outside the hook (e.g. a future
    // settings screen that clears the photo store). MMKV's listener
    // fires on every `set` — cheap enough to just re-read.
    const mmkv = _getMMKVInstance();
    const sub = mmkv.addOnValueChangedListener((key) => {
      if (key !== BODY_PHOTOS_STORAGE_KEY) return;
      setPhotos(readPhotos());
    });
    return () => sub.remove();
  }, []);

  const list = useCallback(() => photos, [photos]);

  const add = useCallback(
    async (input: AddBodyPhotoInput): Promise<BodyPhotoMeta> => {
      const id = generateId();
      const createdAt = clock().toISOString();
      const uri = await persistSourceUri(input.sourceUri, id);
      const meta: BodyPhotoMeta = {
        id,
        takenAt: input.takenAt || todayDateKey(clock),
        createdAt,
        uri,
      };
      if (input.note && input.note.length > 0) meta.note = input.note;
      if (typeof input.weightKg === "number" && Number.isFinite(input.weightKg))
        meta.weightKg = input.weightKg;

      const next = sortPhotosLatestFirst([meta, ...photos]);
      writePhotos(next);
      setPhotos(next);
      return meta;
    },
    [clock, generateId, photos],
  );

  const update = useCallback(
    async (
      id: string,
      patch: UpdateBodyPhotoPatch,
    ): Promise<BodyPhotoMeta | null> => {
      const existing = photos.find((p) => p.id === id);
      if (!existing) return null;
      const merged: BodyPhotoMeta = {
        ...existing,
        ...(patch.takenAt !== undefined ? { takenAt: patch.takenAt } : null),
      };
      // Scalar optional fields: an explicit `undefined` patch clears the
      // field, a defined value replaces it.
      if ("note" in patch) {
        if (patch.note && patch.note.length > 0) merged.note = patch.note;
        else delete merged.note;
      }
      if ("weightKg" in patch) {
        if (
          typeof patch.weightKg === "number" &&
          Number.isFinite(patch.weightKg)
        ) {
          merged.weightKg = patch.weightKg;
        } else {
          delete merged.weightKg;
        }
      }
      const next = sortPhotosLatestFirst(
        photos.map((p) => (p.id === id ? merged : p)),
      );
      writePhotos(next);
      setPhotos(next);
      return merged;
    },
    [photos],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      const target = photos.find((p) => p.id === id);
      if (!target) return;
      const next = photos.filter((p) => p.id !== id);
      writePhotos(next);
      setPhotos(next);
      await deletePersistedUri(target.uri);
    },
    [photos],
  );

  const clear = useCallback(async (): Promise<void> => {
    writePhotos([]);
    setPhotos([]);
    await clearAllPersistedPhotos();
  }, []);

  return { photos, ready: true, list, add, update, remove, clear };
}
