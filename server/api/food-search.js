import { setCorsHeaders } from "./lib/cors.js";
import { checkRateLimit } from "./lib/rateLimit.js";

const OFF_SEARCH = "https://world.openfoodfacts.org/api/v2/search";
const OFF_FIELDS =
  "product_name,product_name_uk,brands,nutriments,serving_quantity";
const USDA_SEARCH = "https://api.nal.usda.gov/fdc/v1/foods/search";

// ╨Я╨╡╤А╤И╨╕╨╣ ╤В╨╛╨║╨╡╨╜ ╨╖╨░╨┐╨╕╤В╤Г тЖТ ╨░╨╜╨│╨╗╤Ц╨╣╤Б╤М╨║╨╕╨╣ ╨╡╨║╨▓╤Ц╨▓╨░╨╗╨╡╨╜╤В ╨┤╨╗╤П USDA / OFF-en ╨┐╨╛╤И╤Г╨║╤Г
const UK_TO_EN = {
  ╨│╤А╤Г╤И╨░: "pear",
  ╤П╨▒╨╗╤Г╨║╨╛: "apple",
  ╨▒╨░╨╜╨░╨╜: "banana",
  ╨░╨┐╨╡╨╗╤М╤Б╨╕╨╜: "orange",
  ╨╗╨╕╨╝╨╛╨╜: "lemon",
  ╨║╤Ц╨▓╤Ц: "kiwi",
  ╨╝╨░╨╜╨│╨╛: "mango",
  ╨┐╨╡╤А╤Б╨╕╨║: "peach",
  ╤Б╨╗╨╕╨▓╨░: "plum",
  ╨▓╨╕╤И╨╜╤П: "cherry",
  ╤З╨╡╤А╨╡╤И╨╜╤П: "cherry",
  ╨┐╨╛╨╗╤Г╨╜╨╕╤Ж╤П: "strawberry",
  ╤Б╤Г╨╜╨╕╤Ж╤П: "strawberry",
  ╨╝╨░╨╗╨╕╨╜╨░: "raspberry",
  ╤З╨╛╤А╨╜╨╕╤Ж╤П: "blueberry",
  ╨▓╨╕╨╜╨╛╨│╤А╨░╨┤: "grapes",
  ╨│╨░╤А╨▒╤Г╨╖: "pumpkin",
  ╨║╨░╨▒╨░╤З╨╛╨║: "zucchini",
  ╨▒╨░╨║╨╗╨░╨╢╨░╨╜: "eggplant",
  ╨┐╨╛╨╝╤Ц╨┤╨╛╤А: "tomato",
  ╤В╨╛╨╝╨░╤В: "tomato",
  ╨╛╨│╤Ц╤А╨╛╨║: "cucumber",
  ╨╝╨╛╤А╨║╨▓╨░: "carrot",
  ╤Ж╨╕╨▒╤Г╨╗╤П: "onion",
  ╤З╨░╤Б╨╜╨╕╨║: "garlic",
  ╨║╨░╤А╤В╨╛╨┐╨╗╤П: "potato",
  ╨▒╤А╨╛╨║╨╛╨╗╤Ц: "broccoli",
  ╤И╨┐╨╕╨╜╨░╤В: "spinach",
  ╨║╨░╨┐╤Г╤Б╤В╨░: "cabbage",
  ╨▒╤Г╤А╤П╨║: "beet",
  ╨│╤А╨╕╨▒╨╕: "mushrooms",
  ╤И╨░╨╝╨┐╤Ц╨╜╤М╨╛╨╜╨╕: "mushrooms",
  ╨░╨▓╨╛╨║╨░╨┤╨╛: "avocado",
  ╨║╤Г╤А╨║╨░: "chicken",
  ╤П╨╗╨╛╨▓╨╕╤З╨╕╨╜╨░: "beef",
  ╤Б╨▓╨╕╨╜╨╕╨╜╨░: "pork",
  ╨╗╨╛╤Б╨╛╤Б╤М: "salmon",
  ╤В╤Г╨╜╨╡╤Ж╤М: "tuna",
  ╤П╨╣╤Ж╨╡: "egg",
  ╨╝╨╛╨╗╨╛╨║╨╛: "milk",
  ╤Б╨╕╤А: "cheese",
  ╨╣╨╛╨│╤Г╤А╤В: "yogurt",
  ╨╝╨░╤Б╨╗╨╛: "butter",
  ╤А╨╕╤Б: "rice",
  ╨│╤А╨╡╤З╨║╨░: "buckwheat",
  ╨▓╤Ц╨▓╤Б╤П╨╜╨║╨░: "oatmeal",
  ╨╝╨░╨║╨░╤А╨╛╨╜╨╕: "pasta",
  ╤Е╨╗╤Ц╨▒: "bread",
  ╨╝╨╡╨┤: "honey",
  ╨│╨╛╤А╤Ц╤Е: "nuts",
  ╨░╤А╨░╤Е╤Ц╤Б: "peanut",
  ╨╝╨╕╨│╨┤╨░╨╗╤М: "almond",
  ╨║╨░╨▓╨░: "coffee",
  ╤З╨░╨╣: "tea",
  ╤Б╨╛╤З╨╡╨▓╨╕╤Ж╤П: "lentils",
  ╨║╨▓╨░╤Б╨╛╨╗╤П: "beans",
  ╨╜╤Г╤В: "chickpeas",
  ╤В╨╛╤Д╤Г: "tofu",
  ╨░╨╜╨░╨╜╨░╤Б: "pineapple",
  ╨┤╨╕╨╜╤П: "melon",
  ╨║╨░╨▓╤Г╨╜: "watermelon",
  ╨░╨▒╤А╨╕╨║╨╛╤Б: "apricot",
  ╨╝╨░╨╜╨┤╨░╤А╨╕╨╜: "tangerine",
  ╨│╤А╨╡╨╣╨┐╤Д╤А╤Г╤В: "grapefruit",
  ╤А╨╛╨┤╨╖╨╕╨╜╨║╨╕: "raisins",
  ╤З╨╛╤А╨╜╨╛╤Б╨╗╨╕╨▓: "prunes",
  ╨║╤Г╤А╨░╨│╨░: "dried apricot",
  ╨│╨░╤А╨▒╤Г╨╖╨╛╨▓╨╡: "pumpkin",
  ╤Ж╨▓╤Ц╤В╨╜╨░: "cauliflower",
  ╤Б╨╡╨╗╨╡╤А╨░: "celery",
  ╨┐╨╡╤В╤А╤Г╤И╨║╨░: "parsley",
  ╨║╤А╤Ц╨┐: "dill",
  ╤А╨╡╨┤╨╕╤Б╨║╨░: "radish",
  ╨│╨╛╤А╨╛╤И╨╛╨║: "peas",
  ╨║╤Г╨║╤Г╤А╤Г╨┤╨╖╨░: "corn",
  ╤Б╨┐╨░╤А╨╢╨░: "asparagus",
  ╨│╤А╨╡╤З╨░╨╜╨╡: "buckwheat",
  ╨▓╤Ц╨▓╤Б╤П╨╜╨╡: "oatmeal",
  ╨┐╤И╨╡╨╜╨╕╤Ж╤П: "wheat",
  ╨║╨╡╤Д╤Ц╤А: "kefir",
  ╤Б╨╝╨╡╤В╨░╨╜╨░: "sour cream",
  ╨▓╨╡╤А╤И╨║╨╕: "cream",
  ╤П╨╗╨╛╨▓╨╕╤З╨╕╨╣: "beef",
  ╨║╤Г╤А╤П╤З╨╕╨╣: "chicken",
  ╤Б╨▓╨╕╨╜╤П╤З╨╕╨╣: "pork",
  ╤А╨╕╨▒╨╜╨╕╨╣: "fish",
  ╨╛╤Б╨╡╨╗╨╡╨┤╨╡╤Ж╤М: "herring",
  ╤Б╨║╤Г╨╝╨▒╤А╤Ц╤П: "mackerel",
  ╤В╤А╤Ц╤Б╨║╨░: "cod",
  ╤Д╨╛╤А╨╡╨╗╤М: "trout",
  ╨║╨╛╤А╨╛╨┐: "carp",
};

// ╨в╨╛╤З╨╜╨╕╨╣ ╨░╨▒╨╛ prefix-match (╨╜╨░╨┐╤А. "╨│╤А╤Г╤И" тЖТ "╨│╤А╤Г╤И╨░" тЖТ "pear")
function translateFirstToken(query) {
  const token = query.trim().toLowerCase().split(/\s+/)[0];
  if (!token || token.length < 2) return null;
  if (UK_TO_EN[token]) return UK_TO_EN[token];
  if (token.length >= 3) {
    for (const [key, val] of Object.entries(UK_TO_EN)) {
      if (key.startsWith(token)) return val;
    }
  }
  return null;
}

function normalizeOFFProduct(product, idx) {
  const n = product?.nutriments || {};

  const round1 = (v) =>
    v != null && Number.isFinite(Number(v))
      ? Math.round(Number(v) * 10) / 10
      : null;

  // ╨Ф╨╛╨╖╨▓╨╛╨╗╤П╤Ф╨╝╨╛ ╨┤╤А╤Г╨║╨╛╨▓╨░╨╜╤Ц ╤Б╨╕╨╝╨▓╨╛╨╗╨╕ ╨╗╨░╤В╨╕╨╜╨╕╤Ж╤Ц + ╨║╨╕╤А╨╕╨╗╨╕╤Ж╤П (╨▒╨╡╨╖ ╨║╨╡╤А╤Г╤О╤З╨╕╤Е ╤Б╨╕╨╝╨▓╨╛╨╗╤Ц╨▓)
  const name =
    product?.product_name_uk ||
    (product?.product_name &&
    /^[\u0020-\u024F\u0400-\u04FF\d.,()\-/]+$/.test(product.product_name)
      ? product.product_name
      : null) ||
    null;
  if (!name) return null;

  const brand = product?.brands
    ? String(product.brands).split(",")[0].trim()
    : null;

  const kcal = round1(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? null);
  const protein = round1(n["proteins_100g"] ?? null);
  const fat = round1(n["fat_100g"] ?? null);
  const carbs = round1(n["carbohydrates_100g"] ?? null);

  if (kcal == null && protein == null && fat == null && carbs == null) {
    return null;
  }

  return {
    id: `off_${idx}_${Date.now()}`,
    name,
    brand,
    source: "off",
    per100: {
      kcal: kcal ?? 0,
      protein_g: protein ?? 0,
      fat_g: fat ?? 0,
      carbs_g: carbs ?? 0,
    },
    defaultGrams: product?.serving_quantity
      ? Math.round(Number(product.serving_quantity))
      : 100,
  };
}

// USDA nutrient IDs: 1008=Energy(kcal), 1003=Protein, 1004=Fat, 1005=Carbs
function normalizeUSDAProduct(food, idx) {
  const name = food?.description;
  if (!name) return null;

  const round1 = (v) =>
    v != null && Number.isFinite(Number(v))
      ? Math.round(Number(v) * 10) / 10
      : null;

  const nutrients = Array.isArray(food?.foodNutrients)
    ? food.foodNutrients
    : [];
  const get = (id) => {
    const n = nutrients.find((x) => x.nutrientId === id);
    return n?.value != null ? Number(n.value) : null;
  };

  const kcal = round1(get(1008));
  const protein = round1(get(1003));
  const fat = round1(get(1004));
  const carbs = round1(get(1005));

  if (kcal == null && protein == null && fat == null && carbs == null) {
    return null;
  }

  return {
    id: `usda_${idx}_${Date.now()}`,
    name,
    brand: null,
    source: "usda",
    per100: {
      kcal: kcal ?? 0,
      protein_g: protein ?? 0,
      fat_g: fat ?? 0,
      carbs_g: carbs ?? 0,
    },
    defaultGrams: 100,
  };
}

async function fetchOFF(searchTerms, lc, signal) {
  const url = new URL(OFF_SEARCH);
  url.searchParams.set("search_terms", searchTerms);
  url.searchParams.set("page_size", "20");
  url.searchParams.set("fields", OFF_FIELDS);
  url.searchParams.set("sort_by", "unique_scans_n");
  url.searchParams.set("lc", lc);
  url.searchParams.set("cc", "ua");

  const r = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "Sergeant-NutritionApp/1.0 (https://sergeant.2dmanager.com.ua)",
    },
    signal,
  });
  if (!r.ok) return [];
  const data = await r.json();
  return data?.products || [];
}

async function fetchUSDA(query, signal) {
  const apiKey = process.env.USDA_API_KEY || "DEMO_KEY";
  const url = new URL(USDA_SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("dataType", "Foundation,SR Legacy");
  url.searchParams.set("api_key", apiKey);

  const r = await fetch(url.toString(), { signal });
  if (!r.ok) return [];
  const data = await r.json();
  return data?.foods || [];
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
    key: "api:food-search",
    limit: 40,
    windowMs: 60_000,
  });
  if (!rl.ok)
    return res
      .status(429)
      .json({ error: "╨Ч╨░╨▒╨░╨│╨░╤В╨╛ ╨╖╨░╨┐╨╕╤В╤Ц╨▓. ╨б╨┐╤А╨╛╨▒╤Г╨╣ ╨┐╤Ц╨╖╨╜╤Ц╤И╨╡." });

  const query = String(req.query.q || "").trim();
  if (!query || query.length < 2) {
    return res.status(400).json({ error: "╨Ч╨░╨┐╨╕╤В ╨╖╨░╨╜╨░╨┤╤В╨╛ ╨║╨╛╤А╨╛╤В╨║╨╕╨╣" });
  }

  const signal = AbortSignal.timeout(8000);

  try {
    const enTerm = translateFirstToken(query);

    const [ukOff, enOff, usdaRaw] = await Promise.all([
      fetchOFF(query, "uk", signal).catch(() => []),
      enTerm
        ? fetchOFF(enTerm, "en", signal).catch(() => [])
        : Promise.resolve([]),
      enTerm ? fetchUSDA(enTerm, signal).catch(() => []) : Promise.resolve([]),
    ]);

    const offProducts = [...ukOff, ...enOff]
      .map((p, i) => normalizeOFFProduct(p, i))
      .filter(Boolean);

    const usdaProducts = usdaRaw
      .map((p, i) => normalizeUSDAProduct(p, i))
      .filter(Boolean);

    // OFF (╨╖ ╤Г╨║╤А╨░╤Ч╨╜╤Б╤М╨║╨╕╨╝╨╕ ╨╜╨░╨╖╨▓╨░╨╝╨╕) ╨╣╨┤╨╡ ╨┐╨╡╤А╤И╨╕╨╝, USDA тАФ ╤П╨║ fallback
    const allProducts = [...offProducts, ...usdaProducts];

    const qTokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 2);
    const enTokens = enTerm ? enTerm.toLowerCase().split(/\s+/) : [];
    const allTokens = [...qTokens, ...enTokens];

    const seen = new Set();
    const products = allProducts
      .filter((p) => {
        const key = `${(p.name || "").toLowerCase()}|${(p.brand || "").toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        if (!allTokens.length) return true;
        const n = (p.name || "").toLowerCase();
        return allTokens.some((t) => n.includes(t));
      })
      .slice(0, 8);

    return res.status(200).json({ products });
  } catch (e) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      return res
        .status(504)
        .json({ error: "╨б╨╡╤А╨▓╤Ц╤Б ╨╜╨╡╨┤╨╛╤Б╤В╤Г╨┐╨╜╨╕╨╣ (╤В╨░╨╣╨╝╨░╤Г╤В). ╨б╨┐╤А╨╛╨▒╤Г╨╣ ╨┐╤Ц╨╖╨╜╤Ц╤И╨╡." });
    }
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
