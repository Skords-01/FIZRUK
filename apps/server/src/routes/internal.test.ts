import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { anthropicMessagesMock } = vi.hoisted(() => ({
  anthropicMessagesMock: vi.fn(),
}));

vi.mock("../lib/anthropic.js", () => ({
  anthropicMessages: anthropicMessagesMock,
}));

function makePool() {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  };
}

async function makeApp(internalKey: string | undefined, pool = makePool()) {
  vi.resetModules();
  anthropicMessagesMock.mockReset();
  vi.doMock("../lib/anthropic.js", () => ({
    anthropicMessages: anthropicMessagesMock,
  }));
  if (internalKey === undefined) delete process.env.INTERNAL_API_KEY;
  else process.env.INTERNAL_API_KEY = internalKey;
  process.env.ANTHROPIC_API_KEY = "anthropic-test-key";

  const { createInternalRouter } = await import("./internal/index.js");
  const app = express();
  app.use(express.json());
  app.use(createInternalRouter({ pool: pool as never }));
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(500).json({
        error: err instanceof Error ? err.message : String(err),
      });
    },
  );
  return { app, pool };
}

describe("/api/internal/*", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed when INTERNAL_API_KEY is not configured", async () => {
    const { app } = await makeApp(undefined);
    const res = await request(app)
      .post("/api/internal/ai-usage")
      .send({ source: "n8n" });

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "Internal API not configured" });
  });

  it("rejects requests with an invalid bearer token", async () => {
    const { app } = await makeApp("secret");
    const res = await request(app)
      .post("/api/internal/ai-usage")
      .set("Authorization", "Bearer wrong")
      .send({ source: "n8n" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("records n8n AI usage using the real ai_usage_daily schema", async () => {
    const pool = makePool();
    const { app } = await makeApp("secret", pool);

    const res = await request(app)
      .post("/api/internal/ai-usage")
      .set("Authorization", "Bearer secret")
      .send({
        source: "mono-enrichment",
        bucket: "categorize",
        inputTokens: 17,
        outputTokens: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, values] = pool.query.mock.calls[0];
    expect(sql).toContain("request_count");
    expect(sql).toContain("input_tokens");
    expect(sql).toContain("output_tokens");
    expect(sql).toContain("total_tokens");
    expect(sql).not.toContain("requests_count");
    expect(values).toEqual([
      "n8n:mono-enrichment",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      "categorize",
      17,
      5,
      22,
    ]);
  });

  it("updates billing through the internal guarded route", async () => {
    const pool = makePool();
    pool.query.mockResolvedValueOnce({
      rows: [{ id: "u_1", email: "paid@example.com" }],
    });
    const { app } = await makeApp("secret", pool);

    const res = await request(app)
      .post("/api/internal/billing/upgrade")
      .set("Authorization", "Bearer secret")
      .send({ stripeCustomerId: "cus_123" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      user: { id: "u_1", email: "paid@example.com" },
    });
    expect(pool.query.mock.calls[0][1]).toEqual(["cus_123"]);
  });

  it("rejects unsafe prompt slugs before reading from disk", async () => {
    const { app } = await makeApp("secret");
    const res = await request(app)
      .get("/api/internal/prompts/console/ops.agent")
      .set("Authorization", "Bearer secret");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid prompt slug" });
  });

  it("returns 502 when internal categorization cannot reach the AI service", async () => {
    const { app } = await makeApp("secret");
    anthropicMessagesMock.mockResolvedValueOnce({
      response: { ok: false },
      data: {},
    });

    const res = await request(app)
      .post("/api/internal/categorize")
      .set("Authorization", "Bearer secret")
      .send({ description: "test@example.com grocery", amount: -12345 });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: "AI service error" });
    expect(anthropicMessagesMock).toHaveBeenCalledTimes(1);
    const [, payload] = anthropicMessagesMock.mock.calls[0];
    expect(JSON.stringify(payload)).not.toContain("test@example.com");
  });
});
