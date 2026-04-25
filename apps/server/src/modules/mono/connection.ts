import type { Request, Response } from "express";

/**
 * POST /api/mono/connect — підключення Monobank токена.
 * POST /api/mono/disconnect — відключення.
 *
 * Stub: повертає 501 до реалізації у Track A · PR2.
 */
export async function connectHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  res.status(501).json({ error: "Not implemented" });
}

export async function disconnectHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  res.status(501).json({ error: "Not implemented" });
}

export async function syncStateHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  res.status(501).json({ error: "Not implemented" });
}
