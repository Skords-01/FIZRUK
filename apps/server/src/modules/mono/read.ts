import type { Request, Response } from "express";

/**
 * GET /api/mono/accounts — список акаунтів з DB.
 * GET /api/mono/transactions — транзакції з DB (cursor pagination).
 *
 * Stub: повертає 501 до реалізації у Track B.
 */
export async function accountsHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  res.status(501).json({ error: "Not implemented" });
}

export async function transactionsHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  res.status(501).json({ error: "Not implemented" });
}
