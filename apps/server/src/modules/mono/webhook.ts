import type { Request, Response } from "express";

/**
 * POST /api/mono/webhook/:secret — публічний endpoint для Monobank delivery.
 *
 * Stub: повертає 501 до реалізації у Track A · PR2.
 */
export async function webhookHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  res.status(501).json({ error: "Not implemented" });
}
