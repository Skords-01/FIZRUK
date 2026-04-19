import { describe, it, expect, vi } from "vitest";
import { requestIdMiddleware } from "./requestId.js";

function mockReq({ headers = {} } = {}) {
  return {
    get(name) {
      return headers[name.toLowerCase()];
    },
  };
}

function mockRes() {
  const headers = {};
  return {
    setHeader(name, value) {
      headers[name] = value;
    },
    getHeader(name) {
      return headers[name];
    },
  };
}

describe("requestIdMiddleware", () => {
  it("генерує UUID і кладе у req.requestId + response header", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();
    requestIdMiddleware(req, res, next);
    expect(typeof req.requestId).toBe("string");
    expect(req.requestId.length).toBeGreaterThanOrEqual(36);
    expect(res.getHeader("X-Request-Id")).toBe(req.requestId);
    expect(next).toHaveBeenCalledOnce();
  });

  it("поважає валідний X-Request-Id з запиту", () => {
    const id = "req-abc-123";
    const req = mockReq({ headers: { "x-request-id": id } });
    const res = mockRes();
    requestIdMiddleware(req, res, vi.fn());
    expect(req.requestId).toBe(id);
    expect(res.getHeader("X-Request-Id")).toBe(id);
  });

  it("ігнорує надто довгий X-Request-Id (>128 символів)", () => {
    const huge = "a".repeat(129);
    const req = mockReq({ headers: { "x-request-id": huge } });
    const res = mockRes();
    requestIdMiddleware(req, res, vi.fn());
    expect(req.requestId).not.toBe(huge);
    expect(req.requestId.length).toBeLessThanOrEqual(128);
  });

  it("тримує response header навіть коли клієнт не передав ID", () => {
    const req = mockReq();
    const res = mockRes();
    requestIdMiddleware(req, res, vi.fn());
    // Інваріант: будь-яка відповідь від /api/* мусить мати X-Request-Id
    // для кореляції з Sentry/логами в service-desk тікеті.
    expect(res.getHeader("X-Request-Id")).toBeDefined();
    expect(res.getHeader("X-Request-Id")).toBe(req.requestId);
  });
});
