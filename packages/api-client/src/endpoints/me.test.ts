// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHttpClient } from "../httpClient";
import { createMeEndpoints } from "./me";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

let originalFetch: typeof fetch;
beforeEach(() => {
  originalFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("createMeEndpoints", () => {
  it("GET /api/me повертає провалідовану MeResponse", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        user: {
          id: "user-123",
          email: "test@example.com",
          name: "Тест",
          image: null,
          emailVerified: true,
        },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const http = createHttpClient();
    const me = createMeEndpoints(http);
    const res = await me.get();

    expect(res).toEqual({
      user: {
        id: "user-123",
        email: "test@example.com",
        name: "Тест",
        image: null,
        emailVerified: true,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/me");
  });

  it("кидає ZodError на відповіді без поля user", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ oops: true }),
    ) as unknown as typeof fetch;
    const me = createMeEndpoints(createHttpClient());
    await expect(me.get()).rejects.toThrow();
  });

  it("кидає ZodError, якщо id порожній", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({
        user: {
          id: "",
          email: null,
          name: null,
          image: null,
          emailVerified: false,
        },
      }),
    ) as unknown as typeof fetch;
    const me = createMeEndpoints(createHttpClient());
    await expect(me.get()).rejects.toThrow();
  });

  it("пропускає AbortSignal у fetch", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        user: {
          id: "u1",
          email: null,
          name: null,
          image: null,
          emailVerified: false,
        },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const me = createMeEndpoints(createHttpClient());
    const ctrl = new AbortController();
    await me.get({ signal: ctrl.signal });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(ctrl.signal);
  });
});
