import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db.js", () => {
  const pool = { query: vi.fn() };
  return { default: pool, pool };
});

vi.mock("../lib/anthropic.js", () => ({
  anthropicMessages: vi.fn(),
  extractAnthropicText: vi.fn(),
}));

import pool from "../db.js";
import { coachMemoryPost } from "./coach.js";
import { MAX_BLOB_SIZE } from "./sync.js";

function makeRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("coachMemoryPost blob-size guard", () => {
  it("повертає 413 коли merged-blob перевищує MAX_BLOB_SIZE і не робить INSERT", async () => {
    // getMemory: існуюча пам'ять з одним digest, котрий зараз у межах.
    pool.query.mockResolvedValueOnce({
      rows: [{ data: JSON.stringify({ weeklyDigests: [] }) }],
    });

    // Вхідний digest з великим полем, який після merge дасть blob > MAX_BLOB_SIZE.
    const huge = "x".repeat(MAX_BLOB_SIZE + 1);
    const req = {
      user: { id: "user_1" },
      body: {
        weeklyDigest: {
          weekKey: "2026-W01",
          weekRange: huge,
        },
      },
    };
    const res = makeRes();

    await coachMemoryPost(req, res);

    expect(res.statusCode).toBe(413);
    expect(res.body).toEqual({ error: "Coach memory blob too large" });
    // Рівно один query (getMemory). INSERT не виконувався.
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("нормальний розмір: робить INSERT і повертає ok", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // getMemory → немає існуючої
      .mockResolvedValueOnce({ rows: [] }); // INSERT

    const req = {
      user: { id: "user_1" },
      body: {
        weeklyDigest: {
          weekKey: "2026-W01",
          weekRange: "1–7 Jan",
          finyk: { summary: "усе ок" },
        },
      },
    };
    const res = makeRes();

    await coachMemoryPost(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(pool.query).toHaveBeenCalledTimes(2);
    const insertCall = pool.query.mock.calls[1];
    expect(insertCall[0]).toMatch(/INSERT INTO module_data/);
    expect(insertCall[1][0]).toBe("user_1");
  });
});
