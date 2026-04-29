import { describe, expect, it } from "vitest";
import {
  BarcodeProductSchema,
  BarcodeLookupSuccessSchema,
  BarcodeLookupErrorSchema,
} from "./nutrition";

describe("BarcodeProductSchema", () => {
  it("accepts a fully-populated OFF product", () => {
    const parsed = BarcodeProductSchema.parse({
      name: "Milk 2%",
      brand: "Yagotynske",
      kcal_100g: 52,
      protein_100g: 3.4,
      fat_100g: 2,
      carbs_100g: 4.8,
      servingSize: "250 ml",
      servingGrams: 250,
      source: "off",
    });
    expect(parsed.brand).toBe("Yagotynske");
    expect(parsed.partial).toBeUndefined();
  });

  it("accepts null for every nullable field except enum", () => {
    const parsed = BarcodeProductSchema.parse({
      name: "Unknown",
      brand: null,
      kcal_100g: null,
      protein_100g: null,
      fat_100g: null,
      carbs_100g: null,
      servingSize: null,
      servingGrams: null,
      source: "upcitemdb",
      partial: true,
    });
    expect(parsed.brand).toBeNull();
    expect(parsed.partial).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(() =>
      BarcodeProductSchema.parse({
        name: "",
        brand: null,
        kcal_100g: null,
        protein_100g: null,
        fat_100g: null,
        carbs_100g: null,
        servingSize: null,
        servingGrams: null,
        source: "off",
      }),
    ).toThrow();
  });

  it("rejects an unknown source value", () => {
    expect(() =>
      BarcodeProductSchema.parse({
        name: "Milk",
        brand: null,
        kcal_100g: null,
        protein_100g: null,
        fat_100g: null,
        carbs_100g: null,
        servingSize: null,
        servingGrams: null,
        source: "barcoo",
      }),
    ).toThrow();
  });

  it("rejects undefined for a nullable field (guards against implicit absent)", () => {
    expect(() =>
      BarcodeProductSchema.parse({
        name: "Milk",
        // brand intentionally omitted
        kcal_100g: null,
        protein_100g: null,
        fat_100g: null,
        carbs_100g: null,
        servingSize: null,
        servingGrams: null,
        source: "off",
      }),
    ).toThrow();
  });
});

describe("BarcodeLookupSuccessSchema", () => {
  it("wraps a valid product in `product`", () => {
    const parsed = BarcodeLookupSuccessSchema.parse({
      product: {
        name: "Milk",
        brand: null,
        kcal_100g: 50,
        protein_100g: 3,
        fat_100g: 2,
        carbs_100g: 5,
        servingSize: null,
        servingGrams: null,
        source: "usda",
      },
    });
    expect(parsed.product.name).toBe("Milk");
  });

  it("rejects a missing product envelope (server must never send just a bare product)", () => {
    expect(() =>
      BarcodeLookupSuccessSchema.parse({
        name: "Milk",
      }),
    ).toThrow();
  });
});

describe("BarcodeLookupErrorSchema", () => {
  it("requires a non-empty error string", () => {
    expect(
      BarcodeLookupErrorSchema.parse({ error: "Продукт не знайдено" }).error,
    ).toBe("Продукт не знайдено");
    expect(() => BarcodeLookupErrorSchema.parse({ error: "" })).toThrow();
  });
});
