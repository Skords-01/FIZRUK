/**
 * Fizruk — body-photo BLOB storage adapter (mobile).
 *
 * The web app stored photo BLOBs as base64 data URLs in IndexedDB. On
 * React Native that pattern is a non-starter: MMKV is a tight key/value
 * store, not a BLOB bucket, and stuffing large base64 strings in it
 * balloons memory. The canonical layout on mobile is:
 *
 *   `FileSystem.documentDirectory + "fizruk/photos/<id>.jpg"`
 *
 * with only the lightweight metadata (`BodyPhotoMeta`) persisted in
 * MMKV. This module is the thin adapter that the `useBodyPhotos` hook
 * talks to so the React layer never has to know about `expo-file-system`
 * directly.
 *
 * ────────────────────────────────────────────────────────────────────
 * NOTE (Phase 6 / PR-E): `expo-file-system` is NOT in
 * `apps/mobile/package.json` yet — per the PR spec we ship the Photos
 * page with a stubbed BLOB pipeline and a clear TODO. The stub
 * preserves the metadata-only MMKV contract so the follow-up PR that
 * adds `expo-file-system` + `expo-image-picker` can swap in the real
 * implementation without touching `useBodyPhotos` / `Photos.tsx` /
 * `PhotoGallery.tsx` / `PhotoViewer.tsx`.
 *
 * The stub:
 *  - `persistSourceUri` returns the input URI untouched. When callers
 *    pass a URI that already lives inside the app sandbox (e.g. a
 *    test fixture or a `file://` URI synthesised by the caller), the
 *    metadata points at that URI directly.
 *  - `deletePersistedUri` is a no-op (no file to clean up).
 *
 * When `expo-file-system` is wired up (follow-up PR):
 *  - `persistSourceUri` MUST:
 *      1. `await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true })`
 *      2. `await FileSystem.copyAsync({ from: sourceUri, to: targetUri })`
 *      3. return `targetUri` so the hook writes that to MMKV.
 *  - `deletePersistedUri` MUST:
 *      - `await FileSystem.deleteAsync(uri, { idempotent: true })`
 * ────────────────────────────────────────────────────────────────────
 */

/**
 * Logical directory under `FileSystem.documentDirectory` that owns
 * body-photo BLOBs. Exported so the follow-up PR can build the
 * `file://…` URI without re-hard-coding the string.
 */
export const PHOTOS_SUBDIR = "fizruk/photos";

/** File extension we use for persisted photos. */
export const PHOTOS_FILE_EXTENSION = "jpg";

/**
 * Build the target URI a persisted photo lives at. Exported so both
 * this module (stub + real impl) and any future migration tooling
 * (e.g. Android 14 storage-scoped relocation) converge on the same
 * naming convention.
 *
 * @param documentDirectory Root sandbox dir. On mobile this is
 *   `expo-file-system`'s `documentDirectory`. Pass `""` in the stub.
 * @param id Photo id the caller minted.
 */
export function buildPhotoUri(documentDirectory: string, id: string): string {
  const sep =
    documentDirectory === "" || documentDirectory.endsWith("/") ? "" : "/";
  return `${documentDirectory}${sep}${PHOTOS_SUBDIR}/${id}.${PHOTOS_FILE_EXTENSION}`;
}

/**
 * Copy a source URI (typically returned by `expo-image-picker`) into
 * the app's persistent photo directory and return the canonical URI
 * the hook should write to MMKV.
 *
 * STUB: returns the input URI unchanged until `expo-file-system`
 * lands. Safe to call from tests and UI code alike — no I/O is
 * performed.
 */
export async function persistSourceUri(
  sourceUri: string,
  _id: string,
): Promise<string> {
  // TODO(fizruk-mobile, PR-E follow-up): import `expo-file-system` and
  // copy `sourceUri` → `buildPhotoUri(FileSystem.documentDirectory,
  // _id)`. Keep the signature identical so `useBodyPhotos` does not
  // change. See the header comment for the full step list.
  return sourceUri;
}

/**
 * Delete the BLOB that backs a persisted photo.
 *
 * STUB: no-op. The follow-up PR routes this through
 * `FileSystem.deleteAsync(uri, { idempotent: true })`.
 */
export async function deletePersistedUri(_uri: string): Promise<void> {
  // TODO(fizruk-mobile, PR-E follow-up): `await
  // FileSystem.deleteAsync(uri, { idempotent: true })`. No-op until
  // the dep lands so deletion on the metadata side stays in sync with
  // file-side cleanup once it's wired up.
}

/**
 * Clear every BLOB under `PHOTOS_SUBDIR`. Used by the hook's `clear`
 * CRUD op. Stub = no-op for the same reason as above.
 */
export async function clearAllPersistedPhotos(): Promise<void> {
  // TODO(fizruk-mobile, PR-E follow-up): recursively delete
  // `FileSystem.documentDirectory + PHOTOS_SUBDIR`.
}
