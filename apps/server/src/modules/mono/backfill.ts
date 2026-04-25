import type { Request, Response } from "express";

/**
 * POST /api/mono/backfill — тригер re-backfill останніх 31 дня.
 *
 * Stub: повертає 501 до реалізації у Track B.
 */
export async function backfillHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  res.status(501).json({ error: "Not implemented" });
}
