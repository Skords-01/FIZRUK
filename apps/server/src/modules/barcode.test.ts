import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../obs/metrics.js", () => ({
  barcodeLookupsTotal: { inc: vi.fn() },
  externalHttpRequestsTotal: { inc: vi.fn() },
  externalHttpDurationMs: { observe: vi.fn() },
}));
vi.mock("../lib/externalHttp.js", () => ({
  recordExternalHttp: vi.fn(),
}));

const { default: barcodeHandler } = await import("./barcode.js");

interface TestRes {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  status(code: number): TestRes;
  json(payload: unknown): TestRes;
  setHeader(name: string, value: string): void;
}

function mockRes(): TestRes & Response {
  const res: TestRes = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
  return res as TestRes & Response;
}

function asReq(
  r: Partial<Request> & { query?: Record<string, unknown> },
): Request {
  return r as Request;
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
    headers: { get: () => null },
  };
}

const OFF_NUTRIMENTS = {
  "energy-kcal_100g": 250,
  proteins_100g: 3.2,
  fat_100g: 1.1,
  carbohydrates_100g: 52,
};

function offHit(barcode: string) {
  return jsonResponse({
    status: 1,
    product: {
      product_name: "Nutella",
      product_name_uk: "Нутела",
      brands: "Ferrero, Italy",
      nutriments: OFF_NUTRIMENTS,
      serving_size: "15 g",
      serving_quantity: 15,
      code: barcode,
    },
  });
}
const offMiss = () => jsonResponse({ status: 0 });

const USDA_NUTRIENTS = [
  { nutrientId: 1008, value: 64 },
  { nutrientId: 1003, value: 3.4 },
  { nutrientId: 1004, value: 3.6 },
  { nutrientId: 1005, value: 4.8 },
];

function usdaHit(extra: Record<string, unknown> = {}) {
  return jsonResponse({
    foods: [
      {
        description: "Milk, whole",
        brandOwner: "Acme",
        foodNutrients: USDA_NUTRIENTS,
        servingSize: 240,
        servingSizeUnit: "ml",
        gtinUpc: "0123456789012",
        ...extra,
      },
    ],
  });
}
const usdaEmpty = () => jsonResponse({ foods: [] });

const upcitemdbHit = () =>
  jsonResponse({ items: [{ title: "Mystery Snack", brand: "Generic" }] });
const upcitemdbEmpty = () => jsonResponse({ items: [] });

function timeoutError() {
  const e = new Error("aborted");
  (e as Error & { name: string }).name = "TimeoutError";
  return e;
}

describe("barcode handler — validation", () => {
  it("returns 400 when `barcode` query param is missing", async () => {
    const res = mockRes();
    await barcodeHandler(asReq({ query: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: "Некоректні параметри запиту" });
  });

  it("returns 400 when stripped barcode is shorter than 8 digits", async () => {
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "abc-12" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: expect.stringContaining("8–14") });
  });

  it("returns 400 when stripped barcode is longer than 14 digits", async () => {
    const res = mockRes();
    await barcodeHandler(
      asReq({ query: { barcode: "012345678901234567" } }),
      res,
    );
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when string is too long (zod max 32)", async () => {
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "x".repeat(33) } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: "Некоректні параметри запиту" });
  });
});

describe("barcode handler — cascade OFF → USDA → UPCitemdb", () => {
  const origFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = origFetch;
    vi.restoreAllMocks();
  });

  it("returns OFF product on first-source hit and does not call USDA/UPC", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      offHit("3017620422003"),
    );
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "3017620422003" } }), res);
    expect(res.statusCode).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(res.body).toMatchObject({
      product: {
        source: "off",
        name: "Нутела",
        brand: "Ferrero",
        kcal_100g: 250,
        protein_100g: 3.2,
        fat_100g: 1.1,
        carbs_100g: 52,
        servingSize: "15 g",
        servingGrams: 15,
      },
    });
  });

  it("falls through to USDA when OFF reports no match", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(offMiss())
      .mockResolvedValueOnce(usdaHit());
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "0123456789012" } }), res);
    expect(res.statusCode).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(res.body).toMatchObject({
      product: {
        source: "usda",
        name: "Milk, whole",
        brand: "Acme",
        kcal_100g: 64,
        servingSize: "240 ml",
        servingGrams: 240,
      },
    });
  });

  it("falls through to UPCitemdb and marks partial when OFF and USDA miss", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(offMiss())
      .mockResolvedValueOnce(usdaEmpty())
      .mockResolvedValueOnce(upcitemdbHit());
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "12345678" } }), res);
    expect(res.statusCode).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(res.body).toMatchObject({
      product: {
        source: "upcitemdb",
        name: "Mystery Snack",
        brand: "Generic",
        kcal_100g: null,
        partial: true,
      },
    });
  });

  it("returns 404 when all three sources miss", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(offMiss())
      .mockResolvedValueOnce(usdaEmpty())
      .mockResolvedValueOnce(upcitemdbEmpty());
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "12345678" } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ error: "Продукт не знайдено" });
  });

  it("falls through past OFF timeout to USDA hit", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(timeoutError())
      .mockResolvedValueOnce(usdaHit());
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "12345678" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ product: { source: "usda" } });
  });

  it("falls through past OFF generic error to USDA hit", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("ENETUNREACH"))
      .mockResolvedValueOnce(usdaHit());
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "12345678" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ product: { source: "usda" } });
  });

  it("falls through past USDA timeout to UPCitemdb hit", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(offMiss())
      .mockRejectedValueOnce(timeoutError())
      .mockResolvedValueOnce(upcitemdbHit());
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "12345678" } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ product: { source: "upcitemdb" } });
  });

  it("returns 404 when all sources error/timeout (handler swallows per-source)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(timeoutError())
      .mockRejectedValueOnce(timeoutError())
      .mockRejectedValueOnce(timeoutError());
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "12345678" } }), res);
    // Per-source `try { … } catch { /* continue */ }` blocks swallow each
    // failure and proceed; with no successful product the handler returns 404,
    // matching client expectation that "no result" is the canonical signal.
    expect(res.statusCode).toBe(404);
  });
});

describe("barcode handler — normalization", () => {
  const origFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = origFetch;
    vi.restoreAllMocks();
  });

  it("OFF: prefers product_name_uk over product_name", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({
        status: 1,
        product: {
          product_name: "Milk",
          product_name_uk: "Молоко",
          nutriments: OFF_NUTRIMENTS,
        },
      }),
    );
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "12345678" } }), res);
    expect((res.body as { product: { name: string } }).product.name).toBe(
      "Молоко",
    );
  });

  it("OFF: rounds nutriments to one decimal place", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({
        status: 1,
        product: {
          product_name: "Round me",
          nutriments: { "energy-kcal_100g": 99.87, proteins_100g: 1.234 },
        },
      }),
    );
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "12345678" } }), res);
    const product = (
      res.body as { product: { kcal_100g: number; protein_100g: number } }
    ).product;
    expect(product.kcal_100g).toBe(99.9);
    expect(product.protein_100g).toBe(1.2);
  });

  it("OFF: takes only the first brand from comma-separated list", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({
        status: 1,
        product: {
          product_name: "X",
          brands: "Alpha, Beta, Gamma",
          nutriments: OFF_NUTRIMENTS,
        },
      }),
    );
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "12345678" } }), res);
    expect((res.body as { product: { brand: string } }).product.brand).toBe(
      "Alpha",
    );
  });

  it("OFF: skipped (returns null) when name is missing — falls through", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        jsonResponse({
          status: 1,
          product: { nutriments: OFF_NUTRIMENTS },
        }),
      )
      .mockResolvedValueOnce(usdaHit());
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "12345678" } }), res);
    expect((res.body as { product: { source: string } }).product.source).toBe(
      "usda",
    );
  });

  it("OFF: skipped when all macros are missing — falls through", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        jsonResponse({
          status: 1,
          product: { product_name: "Empty", nutriments: {} },
        }),
      )
      .mockResolvedValueOnce(usdaHit());
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "12345678" } }), res);
    expect((res.body as { product: { source: string } }).product.source).toBe(
      "usda",
    );
  });

  it("USDA: prefers exact gtinUpc match (after stripping leading zeros) over first result", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(offMiss())
      .mockResolvedValueOnce(
        jsonResponse({
          foods: [
            {
              description: "Wrong product",
              foodNutrients: USDA_NUTRIENTS,
              gtinUpc: "9999999999999",
            },
            {
              description: "Right product",
              foodNutrients: USDA_NUTRIENTS,
              gtinUpc: "0000123456789", // matches "123456789" after strip
            },
          ],
        }),
      );
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "123456789" } }), res);
    expect((res.body as { product: { name: string } }).product.name).toBe(
      "Right product",
    );
  });

  it("USDA: returns null and falls through when nutrients are empty", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(offMiss())
      .mockResolvedValueOnce(
        jsonResponse({
          foods: [{ description: "Empty", foodNutrients: [] }],
        }),
      )
      .mockResolvedValueOnce(upcitemdbHit());
    const res = mockRes();
    await barcodeHandler(asReq({ query: { barcode: "12345678" } }), res);
    expect((res.body as { product: { source: string } }).product.source).toBe(
      "upcitemdb",
    );
  });

  it("normalizes barcode by stripping non-digits before validation", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      offHit("3017620422003"),
    );
    const res = mockRes();
    await barcodeHandler(
      asReq({ query: { barcode: "  3017-6204-22003  " } }),
      res,
    );
    expect(res.statusCode).toBe(200);
    // verify upstream URL contains stripped barcode
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(String(calls[0][0])).toContain("3017620422003");
  });
});
