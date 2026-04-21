/**
 * Pure helpers backing the Fizruk photo-progress gallery.
 *
 * ALL ordering / grouping / date-bucket logic lives here so the mobile
 * and web Photos screens share the same behaviour — the React layer
 * only renders the shape these helpers return.
 *
 * Helpers are intentionally deterministic: no `Date.now()`, no
 * `Math.random()`, no I/O. Callers pass in the clock (e.g. photo
 * `takenAt` dates) so vitest can cover boundary behaviour without
 * fragile mocks.
 */

import type { BodyPhotoMeta, PhotoMonthGroup, PhotoPair } from "./types.js";

const UK_MONTHS = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
] as const;

const UK_MONTHS_NOMINATIVE = [
  "січень",
  "лютий",
  "березень",
  "квітень",
  "травень",
  "червень",
  "липень",
  "серпень",
  "вересень",
  "жовтень",
  "листопад",
  "грудень",
] as const;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_RE = /^\d{4}-\d{2}$/;

/** Returns true iff the input is an ISO date-only string ("YYYY-MM-DD"). */
export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && DATE_KEY_RE.test(value);
}

/** Returns true iff the input is a month key ("YYYY-MM"). */
export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && MONTH_KEY_RE.test(value);
}

/**
 * Extract the month key ("YYYY-MM") from a `takenAt` date-only string.
 * Returns `null` if the input is not a valid date key.
 */
export function monthKeyFromTakenAt(takenAt: string): string | null {
  if (!isDateKey(takenAt)) return null;
  return takenAt.slice(0, 7);
}

/**
 * Human label for a month key, in Ukrainian by default
 * ("2026-04" → "квітень 2026"). Returns the raw key on malformed input.
 */
export function formatMonthLabel(monthKey: string): string {
  if (!isMonthKey(monthKey)) return monthKey;
  const [yearStr, monthStr] = monthKey.split("-");
  const monthIdx = Number(monthStr) - 1;
  if (monthIdx < 0 || monthIdx > 11) return monthKey;
  return `${UK_MONTHS_NOMINATIVE[monthIdx]} ${yearStr}`;
}

/**
 * Human label for a single photo's `takenAt` date ("12 квітня 2026").
 * Returns the raw string on malformed input.
 */
export function formatTakenAtLabel(takenAt: string): string {
  if (!isDateKey(takenAt)) return takenAt;
  const [year, month, day] = takenAt.split("-");
  const monthIdx = Number(month) - 1;
  if (monthIdx < 0 || monthIdx > 11) return takenAt;
  const dayNum = Number(day);
  return `${dayNum} ${UK_MONTHS[monthIdx]} ${year}`;
}

/**
 * Stable copy of `photos`, sorted latest first by `takenAt`, with a
 * `createdAt` tiebreak (later-created record wins) and finally `id`
 * lexicographic ordering so the result is deterministic even when
 * both fields collide.
 */
export function sortPhotosLatestFirst(
  photos: readonly BodyPhotoMeta[],
): BodyPhotoMeta[] {
  return [...photos].sort((a, b) => {
    const takenCmp = (b.takenAt || "").localeCompare(a.takenAt || "");
    if (takenCmp !== 0) return takenCmp;
    const createdCmp = (b.createdAt || "").localeCompare(a.createdAt || "");
    if (createdCmp !== 0) return createdCmp;
    return (a.id || "").localeCompare(b.id || "");
  });
}

/**
 * Group photos by month bucket, latest month first. Photos within
 * each bucket are sorted latest-first via `sortPhotosLatestFirst`.
 * Photos whose `takenAt` is not a valid date key are dropped — they
 * cannot be assigned to a bucket.
 */
export function groupPhotosByMonth(
  photos: readonly BodyPhotoMeta[],
): PhotoMonthGroup[] {
  const byMonth = new Map<string, BodyPhotoMeta[]>();
  for (const photo of photos) {
    const key = monthKeyFromTakenAt(photo.takenAt);
    if (!key) continue;
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(photo);
    else byMonth.set(key, [photo]);
  }
  const keys = Array.from(byMonth.keys()).sort((a, b) => b.localeCompare(a));
  return keys.map((monthKey) => ({
    monthKey,
    label: formatMonthLabel(monthKey),
    photos: sortPhotosLatestFirst(byMonth.get(monthKey) ?? []),
  }));
}

/**
 * Earliest + latest photo of the same month — the "before / after"
 * pair the comparison UI can render. Returns `null` if fewer than two
 * photos exist in the requested bucket. When `monthKey` is omitted,
 * falls back to the most recent month that has ≥2 photos.
 */
export function pairBeforeAfterOfMonth(
  photos: readonly BodyPhotoMeta[],
  monthKey?: string,
): PhotoPair | null {
  const groups = groupPhotosByMonth(photos);
  const pick = monthKey
    ? groups.find((g) => g.monthKey === monthKey)
    : groups.find((g) => g.photos.length >= 2);
  if (!pick || pick.photos.length < 2) return null;
  // `pick.photos` is latest-first; after = first, before = last.
  const after = pick.photos[0];
  const before = pick.photos[pick.photos.length - 1];
  if (!before || !after || before.id === after.id) return null;
  return { before, after };
}

/**
 * 0-based index of the photo with id `id` inside `photos`, or `-1`
 * when the id is not found. The input is assumed to already be sorted
 * in display order.
 */
export function getPhotoIndex(
  photos: readonly BodyPhotoMeta[],
  id: string,
): number {
  for (let i = 0; i < photos.length; i += 1) {
    if (photos[i]?.id === id) return i;
  }
  return -1;
}

/**
 * Sibling photo at `currentIndex + delta`, clamped to the bounds of
 * `photos`. Returns `null` when the target index is out of range — the
 * caller (viewer) uses this to disable prev/next chevrons at the edges.
 */
export function neighborPhoto(
  photos: readonly BodyPhotoMeta[],
  currentId: string,
  delta: number,
): BodyPhotoMeta | null {
  const idx = getPhotoIndex(photos, currentId);
  if (idx === -1) return null;
  const next = idx + delta;
  if (next < 0 || next >= photos.length) return null;
  return photos[next] ?? null;
}

/**
 * Narrow an arbitrary unknown value (e.g. MMKV JSON) into a
 * `BodyPhotoMeta[]`. Entries missing required fields are dropped
 * silently — the hook uses this to survive schema drift on upgrades.
 */
export function filterValidPhotos(raw: unknown): BodyPhotoMeta[] {
  if (!Array.isArray(raw)) return [];
  const out: BodyPhotoMeta[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const r = entry as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : null;
    const takenAt = typeof r.takenAt === "string" ? r.takenAt : null;
    const createdAt = typeof r.createdAt === "string" ? r.createdAt : null;
    const uri = typeof r.uri === "string" ? r.uri : null;
    if (!id || !takenAt || !createdAt || !uri) continue;
    const meta: BodyPhotoMeta = { id, takenAt, createdAt, uri };
    if (typeof r.note === "string" && r.note.length > 0) meta.note = r.note;
    if (typeof r.weightKg === "number" && Number.isFinite(r.weightKg)) {
      meta.weightKg = r.weightKg;
    }
    out.push(meta);
  }
  return out;
}
