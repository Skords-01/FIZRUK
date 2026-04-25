import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Request, Response } from "express";
import type { Mock } from "vitest";

// ── Mocks ────────────────────────────────────────────────────

vi.mock("../../db.js", () => ({
  query: vi.fn(),
}));

vi.mock("../../obs/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../obs/metrics.js", () => ({
  monoWebhookReceivedTotal: { inc: vi.fn() },
  monoWebhookDurationMs: { observe: vi.fn() },
}));

import { query as _query } from "../../db.js";
import {
  monoWebhookReceivedTotal as _counter,
  monoWebhookDurationMs as _histogram,
} from "../../obs/metrics.js";
import { webhookHandler } from "./webhook.js";

const dbQuery = _query as unknown as Mock;
const counter = _counter as unknown as { inc: Mock };
const histogram = _histogram as unknown as { observe: Mock };

// ── Helpers ──────────────────────────────────────────────────

interface TestResBody {
  ok?: boolean;
  error?: string;
}

interface TestRes {
  statusCode: number;
  body: TestResBody;
  status(code: number): TestRes;
  json(payload: unknown): TestRes;
}

function makeRes(): TestRes & Response {
  const res: TestRes = {
    statusCode: 200,
    body: {} as TestResBody,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload as TestResBody;
      return this;
    },
  };
  return res as TestRes & Response;
}

const VALID_SECRET = "a".repeat(64);

function validPayload() {
  return {
    type: "StatementItem",
    data: {
      account: "acc_uah",
      statementItem: {
        id: "tx_001",
        time: 1714000000,
        description: "Кава",
        mcc: 5814,
        amount: -6500,
        operationAmount: -6500,
        currencyCode: 980,
        balance: 1500000,
      },
    },
  };
}

function makeReq(secret: string, body?: unknown): Request {
  return {
    params: { secret },
    body: body ?? validPayload(),
  } as unknown as Request;
}

// ── Tests ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("webhookHandler", () => {
  it("returns 404 for unknown secret", async () => {
    dbQuery.mockResolvedValueOnce({ rows: [] });

    const res = makeRes();
    await webhookHandler(makeReq("unknown_secret_value"), res);

    expect(res.statusCode).toBe(404);
    expect(counter.inc).toHaveBeenCalledWith({ status: "invalid_secret" });
  });

  it("returns 400 for invalid payload", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });

    const res = makeRes();
    await webhookHandler(makeReq(VALID_SECRET, { type: "SomethingElse" }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid payload");
    expect(counter.inc).toHaveBeenCalledWith({ status: "bad_payload" });
  });

  it("processes valid webhook: upserts transaction, updates balance and last_event_at", async () => {
    // Lookup connection
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });

    // INSERT transaction
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // UPDATE balance
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // UPDATE last_event_at
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = makeRes();
    await webhookHandler(makeReq(VALID_SECRET), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(counter.inc).toHaveBeenCalledWith({ status: "ok" });
    expect(histogram.observe).toHaveBeenCalledWith(
      { status: "ok" },
      expect.any(Number),
    );

    // 4 DB calls: lookup + tx upsert + balance update + event update
    expect(dbQuery).toHaveBeenCalledTimes(4);
  });

  it("idempotent: duplicate mono_tx_id is handled by ON CONFLICT", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    // Both calls succeed (ON CONFLICT DO UPDATE)
    dbQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const res1 = makeRes();
    await webhookHandler(makeReq(VALID_SECRET), res1);
    expect(res1.statusCode).toBe(200);

    vi.clearAllMocks();
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    dbQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const res2 = makeRes();
    await webhookHandler(makeReq(VALID_SECRET), res2);
    expect(res2.statusCode).toBe(200);
  });

  it("returns 400 when payload is missing statementItem.id", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });

    const badPayload = {
      type: "StatementItem",
      data: {
        account: "acc_uah",
        statementItem: { description: "no id" },
      },
    };

    const res = makeRes();
    await webhookHandler(makeReq(VALID_SECRET, badPayload), res);

    expect(res.statusCode).toBe(400);
    expect(counter.inc).toHaveBeenCalledWith({ status: "bad_payload" });
  });

  it("returns 404 for missing secret param", async () => {
    const req = {
      params: {},
      body: validPayload(),
    } as unknown as Request;
    const res = makeRes();
    await webhookHandler(req, res);
    expect(res.statusCode).toBe(404);
  });

  it("re-throws DB errors and records error metric", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    dbQuery.mockRejectedValueOnce(new Error("DB gone"));

    const res = makeRes();
    await expect(webhookHandler(makeReq(VALID_SECRET), res)).rejects.toThrow(
      "DB gone",
    );

    expect(counter.inc).toHaveBeenCalledWith({ status: "error" });
  });
});
