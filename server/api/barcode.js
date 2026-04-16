import { setCorsHeaders } from "./lib/cors.js";
import { checkRateLimit } from "./lib/rateLimit.js";

const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";
const OFF_FIELDS =
  "product_name,product_name_uk,brands,nutriments,serving_size,serving_quantity";

function normalizeProduct(product) {
  const n = product?.nutriments || {};
  const name =
    product?.product_name_uk ||
    product?.product_name ||
    null;
  const brand = product?.brands
    ? String(product.brands).split(",")[0].trim()
    : null;

  const round1 = (v) =>
    v != null && Number.isFinite(Number(v))
      ? Math.round(Number(v) * 10) / 10
      : null;

  const kcal = round1(
    n["energy-kcal_100g"] ?? n["energy-kcal"] ?? null,
  );
  const protein = round1(n["proteins_100g"] ?? null);
  const fat = round1(n["fat_100g"] ?? null);
  const carbs = round1(n["carbohydrates_100g"] ?? null);

  const servingSize = product?.serving_size
    ? String(product.serving_size)
    : null;
  const servingGrams =
    product?.serving_quantity != null &&
    Number.isFinite(Number(product.serving_quantity))
      ? Number(product.serving_quantity)
      : null;

  return {
    name,
    brand,
    kcal_100g: kcal,
    protein_100g: protein,
    fat_100g: fat,
    carbs_100g: carbs,
    servingSize,
    servingGrams,
  };
}

export default async function handler(req, res) {
  setCorsHeaders(res, req, {
    methods: "GET, OPTIONS",
    allowHeaders: "Content-Type",
  });
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const rl = checkRateLimit(req, {
    key: "api:barcode",
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok)
    return res.status(429).json({ error: "Забагато запитів. Спробуй пізніше." });

  const barcode = String(req.query.barcode || "")
    .trim()
    .replace(/\D/g, "");
  if (!barcode || !/^\d{8,14}$/.test(barcode)) {
    return res.status(400).json({ error: "Невірний штрихкод (8–14 цифр)" });
  }

  try {
    const url = `${OFF_BASE}/${barcode}.json?fields=${OFF_FIELDS}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Sergeant-NutritionApp/1.0 (https://sergeant.2dmanager.com.ua)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (r.status === 404) {
      return res.status(404).json({ error: "Продукт не знайдено" });
    }
    if (!r.ok) {
      return res
        .status(502)
        .json({ error: "Помилка зовнішнього сервісу (Open Food Facts)" });
    }

    const data = await r.json();
    if (data?.status !== 1 || !data?.product) {
      return res.status(404).json({ error: "Продукт не знайдено" });
    }

    return res.status(200).json({ product: normalizeProduct(data.product) });
  } catch (e) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      return res
        .status(504)
        .json({ error: "Сервіс недоступний (таймаут). Спробуй пізніше." });
    }
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
