/**
 * Nutrition-специфічні security-утиліти.
 *
 * `checkRateLimit` уніфіковано з `server/api/lib/rateLimit.js` — раніше тут була
 * окрема in-memory копія, що призводило до двох незалежних bucket-ів для
 * тих самих IP. Експортуємо звідти для зворотної сумісності з існуючими
 * імпортами nutrition-хендлерів; нові хендлери повинні імпортувати напряму
 * з `../lib/rateLimit.js`.
 */
export { checkRateLimit } from "../../lib/rateLimit.js";

export function requireNutritionTokenIfConfigured(req, res) {
  const expected = process.env.NUTRITION_API_TOKEN;
  if (!expected) return true; // token не налаштований → нічого не ламаємо
  const got = req?.headers?.["x-token"];
  if (!got || String(got) !== String(expected)) {
    res.status(401).json({ error: "Токен відсутній або невірний" });
    return false;
  }
  return true;
}
