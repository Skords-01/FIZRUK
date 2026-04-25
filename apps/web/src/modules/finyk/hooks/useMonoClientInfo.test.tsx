// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { server } from "../../../test/msw/server";
import { useMonoClientInfo } from "./useMonoClientInfo";

// AI-NOTE: MSW intercepts real fetch calls — no vi.mock("@shared/api") needed.
// The full code path (hook → monoApi → httpClient → fetch) is exercised.
// Endpoint: GET /api/v1/mono?path=/personal/client-info  (see mono.ts)

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useMonoClientInfo (MSW)", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("does not fetch when token is empty", async () => {
    let called = false;
    server.use(
      http.get("*/api/v1/mono", () => {
        called = true;
        return HttpResponse.json({});
      }),
    );

    const { result } = renderHook(() => useMonoClientInfo(""), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(called).toBe(false);
  });

  it("returns client info on success", async () => {
    const info = {
      clientId: "cl_123",
      name: "Тест",
      accounts: [{ id: "a1", currencyCode: 980 }],
    };

    server.use(
      http.get("*/api/v1/mono", ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("path") === "/personal/client-info") {
          expect(request.headers.get("X-Token")).toBe("TOKEN_A");
          return HttpResponse.json(info);
        }
        return HttpResponse.json({ error: "unexpected path" }, { status: 404 });
      }),
    );

    const { result } = renderHook(() => useMonoClientInfo("TOKEN_A"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(info);
  });

  it("does not retry auth errors (401)", async () => {
    let callCount = 0;
    server.use(
      http.get("*/api/v1/mono", () => {
        callCount++;
        return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
      }),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: 3 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useMonoClientInfo("TOKEN_B"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(callCount).toBe(1);
  });
});
