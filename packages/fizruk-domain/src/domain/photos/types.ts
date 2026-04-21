/**
 * Shared domain types for the Fizruk body-photo sub-domain.
 *
 * Kept platform-neutral so both `apps/web` and `apps/mobile` consume
 * the same helpers. The web `BodyPhoto` type (see `../types.ts`) embeds
 * a `dataUrl` because the web app stored BLOBs in IndexedDB/base64;
 * the mobile port persists BLOBs on disk (via `expo-file-system` in a
 * follow-up PR) and keeps only lightweight metadata in MMKV. The
 * `BodyPhotoMeta` shape below is the canonical source-of-truth for the
 * metadata-only record — file bytes live under an OS-level `uri`.
 */

/**
 * Metadata for a single body progress photo. The actual BLOB lives on
 * disk; `uri` points at it (`file://.../fizruk/photos/<id>.jpg` on
 * mobile or a blob/data URL on web).
 */
export interface BodyPhotoMeta {
  /** Stable, unique id. */
  id: string;
  /**
   * Date the photo was taken / the user is tagging it with, as an
   * ISO date-only string ("YYYY-MM-DD"). Separate from `createdAt`
   * because the user may be backfilling old photos.
   */
  takenAt: string;
  /** ISO timestamp when the record was inserted. */
  createdAt: string;
  /** Free-form note — optional so the form can submit without one. */
  note?: string;
  /** Optional body-weight snapshot (kg) captured alongside the photo. */
  weightKg?: number;
  /**
   * OS-level URI of the BLOB. On mobile this is a `file://` path under
   * `FileSystem.documentDirectory + 'fizruk/photos/<id>.jpg'`; on web
   * it can be a blob/data URL for parity with the legacy hook.
   */
  uri: string;
}

/** Monthly bucket used by gallery grouping. */
export interface PhotoMonthGroup {
  /** "YYYY-MM". */
  monthKey: string;
  /** Localised human label ("квітень 2026"). */
  label: string;
  /** Photos in this bucket, latest first. */
  photos: BodyPhotoMeta[];
}

/** Before/after pair for the same month. */
export interface PhotoPair {
  before: BodyPhotoMeta;
  after: BodyPhotoMeta;
}
