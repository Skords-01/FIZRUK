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

vi.mock("../../push/send.js", () => ({
  sendToUserQuietly: vi.fn().mockResolvedValue(undefined),
}));

import { query as _query } from "../../db.js";
import {
  monoWebhookReceivedTotal as _counter,
  monoWebhookDurationMs as _histogram,
} from "../../obs/metrics.js";
import { sendToUserQuietly as _sendToUserQuietly } from "../../push/send.js";
import { webhookHandler } from "./webhook.js";

const dbQuery = _query as unknown as Mock;
const counter = _counter as unknown as { inc: Mock };
const histogram = _histogram as unknown as { observe: Mock };
const sendPushMock = _sendToUserQuietly as unknown as Mock;

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

    // INSERT transaction (RETURNING (xmax = 0) AS inserted → true on first delivery)
    dbQuery.mockResolvedValueOnce({
      rows: [{ inserted: true }],
      rowCount: 1,
    });
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

  it("fires push (fire-and-forget) on first INSERT with formatted amount + balance", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    dbQuery.mockResolvedValueOnce({
      rows: [{ inserted: true }],
      rowCount: 1,
    });
    dbQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const res = makeRes();
    await webhookHandler(makeReq(VALID_SECRET), res);

    // Push must run after the 200 has been sent, so flush microtasks.
    await Promise.resolve();

    expect(sendPushMock).toHaveBeenCalledTimes(1);
    const [userId, payload, ctx] = sendPushMock.mock.calls[0];
    expect(userId).toBe("user_1");
    expect(ctx).toEqual({ module: "mono" });
    // amount = -6500 (kopecks), currency = 980 → "−65,00 ₴"
    expect(payload.title).toBe("−65,00 ₴");
    // description = "Кава", balance = 1500000 (kopecks) → uk-UA locale uses
    // NBSP (U+00A0) as thousand separator and ICU `,` as decimal mark.
    expect(payload.body).toBe("Кава · доступно 15\u00A0000,00 ₴");
    expect(payload.url).toBe("/?module=finyk");
    expect(payload.data).toEqual({
      kind: "mono_tx",
      monoTxId: "tx_001",
      monoAccountId: "acc_uah",
    });
  });

  it("does NOT fire push when ON CONFLICT updates an existing row (Monobank retry)", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    dbQuery.mockResolvedValueOnce({
      rows: [{ inserted: false }],
      rowCount: 1,
    });
    dbQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const res = makeRes();
    await webhookHandler(makeReq(VALID_SECRET), res);
    await Promise.resolve();

    expect(res.statusCode).toBe(200);
    expect(sendPushMock).not.toHaveBeenCalled();
  });

  it("marks `(резерв)` in body for hold transactions", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    dbQuery.mockResolvedValueOnce({
      rows: [{ inserted: true }],
      rowCount: 1,
    });
    dbQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const base = validPayload();
    const holdPayload = {
      ...base,
      data: {
        ...base.data,
        statementItem: {
          ...base.data.statementItem,
          hold: true,
        },
      },
    };

    const res = makeRes();
    await webhookHandler(makeReq(VALID_SECRET, holdPayload), res);
    await Promise.resolve();

    expect(sendPushMock).toHaveBeenCalledTimes(1);
    expect(sendPushMock.mock.calls[0][1].body).toBe(
      "(резерв) Кава · доступно 15\u00A0000,00 ₴",
    );
  });

  it("idempotent: duplicate mono_tx_id is handled by ON CONFLICT", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    // First delivery: insert path (xmax=0 → inserted=true)
    dbQuery.mockResolvedValueOnce({
      rows: [{ inserted: true }],
      rowCount: 1,
    });
    dbQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const res1 = makeRes();
    await webhookHandler(makeReq(VALID_SECRET), res1);
    expect(res1.statusCode).toBe(200);

    vi.clearAllMocks();
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    // Re-delivery: update path (xmax≠0 → inserted=false)
    dbQuery.mockResolvedValueOnce({
      rows: [{ inserted: false }],
      rowCount: 1,
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

  it("маппить mcc → category_slug і передає його у INSERT (Monobank Roadmap C)", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    dbQuery.mockResolvedValueOnce({
      rows: [{ inserted: true }],
      rowCount: 1,
    });
    dbQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    // mcc=5814 → 'restaurant' (з validPayload())
    const res = makeRes();
    await webhookHandler(makeReq(VALID_SECRET), res);
    expect(res.statusCode).toBe(200);

    // Друга dbQuery-call — це сам upsert; останній параметр — categorySlug.
    const upsertCall = dbQuery.mock.calls[1];
    const params = upsertCall[1];
    expect(params[params.length - 1]).toBe("restaurant");
  });

  it("category_slug = null для невідомого MCC", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    dbQuery.mockResolvedValueOnce({
      rows: [{ inserted: true }],
      rowCount: 1,
    });
    dbQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const base = validPayload();
    const unknownMccPayload = {
      ...base,
      data: {
        ...base.data,
        statementItem: { ...base.data.statementItem, mcc: 9999 },
      },
    };

    const res = makeRes();
    await webhookHandler(makeReq(VALID_SECRET, unknownMccPayload), res);
    expect(res.statusCode).toBe(200);

    const params = dbQuery.mock.calls[1][1];
    expect(params[params.length - 1]).toBeNull();
  });

  it("ON CONFLICT-гілка SQL зберігає category_slug під захистом category_overridden", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    dbQuery.mockResolvedValueOnce({
      rows: [{ inserted: false }],
      rowCount: 1,
    });
    dbQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const res = makeRes();
    await webhookHandler(makeReq(VALID_SECRET), res);

    const sql = dbQuery.mock.calls[1][0];
    // Sanity-check, що SQL містить захист category_overridden.
    expect(sql).toMatch(/category_overridden/);
    expect(sql).toMatch(/category_slug = CASE/);
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

  it("FK violation (23503) on tx upsert → autocreates mono_account stub and retries", async () => {
    // Lookup connection
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    // First tx upsert attempt fails with FK violation (unknown account)
    const fkErr = Object.assign(new Error("FK violation"), { code: "23503" });
    dbQuery.mockRejectedValueOnce(fkErr);
    // Stub-INSERT into mono_account
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // Retry tx upsert succeeds
    dbQuery.mockResolvedValueOnce({
      rows: [{ inserted: true }],
      rowCount: 1,
    });
    // UPDATE balance
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // UPDATE last_event_at
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = makeRes();
    await webhookHandler(makeReq(VALID_SECRET), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(counter.inc).toHaveBeenCalledWith({ status: "account_autocreated" });
    expect(counter.inc).toHaveBeenCalledWith({ status: "ok" });

    // 6 DB calls: lookup + failed tx upsert + account stub + retry tx upsert
    //           + balance update + event update
    expect(dbQuery).toHaveBeenCalledTimes(6);

    // Verify the stub uses StatementItem currency + balance fields.
    const stubCall = dbQuery.mock.calls[2];
    expect(stubCall[0]).toMatch(/INSERT INTO mono_account/);
    expect(stubCall[0]).toMatch(/ON CONFLICT[\s\S]*DO NOTHING/);
    expect(stubCall[1]).toEqual(["user_1", "acc_uah", 980, 1500000]);
    expect(stubCall[2]).toEqual({ op: "mono_account_autocreate" });
  });

  it("non-FK errors are NOT retried (only 23503 triggers autocreate)", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user_1", webhook_secret: VALID_SECRET }],
    });
    // Some other DB error — must propagate without autocreate retry.
    const otherErr = Object.assign(new Error("connection lost"), {
      code: "08006",
    });
    dbQuery.mockRejectedValueOnce(otherErr);

    const res = makeRes();
    await expect(webhookHandler(makeReq(VALID_SECRET), res)).rejects.toThrow(
      "connection lost",
    );

    // Only 2 DB calls: lookup + failed tx upsert. No autocreate, no retry.
    expect(dbQuery).toHaveBeenCalledTimes(2);
    expect(counter.inc).toHaveBeenCalledWith({ status: "error" });
    expect(counter.inc).not.toHaveBeenCalledWith({
      status: "account_autocreated",
    });
  });
});
