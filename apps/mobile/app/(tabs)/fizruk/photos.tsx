/**
 * `/fizruk/photos` — Body-photo progress screen (Phase 6 · PR-E).
 *
 * Thin wrapper around `@/modules/fizruk/pages/Photos`. All logic lives
 * in the module so the route file stays a no-op entry point, matching
 * the convention the other Fizruk routes use (index, progress,
 * measurements, …).
 */

import { Photos } from "@/modules/fizruk/pages/Photos";

export default function FizrukPhotosRoute() {
  return <Photos />;
}
