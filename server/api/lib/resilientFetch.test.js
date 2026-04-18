import { describe, expect, it, vi } from "vitest";
import { resilientFetch } from "./resilientFetch.js";

describe("resilientFetch", () => {
  it("retries retryable HTTP status and eventually returns success", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));

    const response = await resilientFetch("https://example.com", {}, {
      fetchImpl,
      sleepImpl: async () => {},
      maxAttempts: 3,
      retryDelayMs: [0, 0, 0],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });

  it("does not retry non-retryable HTTP status", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("bad request", { status: 400 }));

    const response = await resilientFetch("https://example.com", {}, {
      fetchImpl,
      sleepImpl: async () => {},
      maxAttempts: 3,
      retryDelayMs: [0, 0, 0],
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(400);
  });

  it("retries retryable network errors and throws after max attempts", async () => {
    const error = new Error("network failed");
    const fetchImpl = vi.fn().mockRejectedValue(error);

    await expect(
      resilientFetch("https://example.com", {}, {
        fetchImpl,
        sleepImpl: async () => {},
        maxAttempts: 2,
        retryDelayMs: [0, 0],
      }),
    ).rejects.toThrow("network failed");

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

