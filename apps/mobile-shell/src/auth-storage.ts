/**
 * Persistent bearer-token storage для Capacitor WebView.
 *
 * Under the hood — `@capacitor/preferences`, який на нативних платформах
 * мапиться у безпечне сховище:
 *   - iOS → Keychain;
 *   - Android → EncryptedSharedPreferences (API 23+) / SharedPreferences.
 *
 * Веб-сторінка всередині WebView НЕ бачить серверні cookie надійно
 * (`SameSite=None; Secure` тримається крипко на колд-старті Android,
 * а на iOS WebView взагалі ріжеться ITP-обмеженнями). Тому shell
 * живе на bearer-токенах: web читає токен зі сховища і додає у
 * `Authorization: Bearer <token>` на кожен запит, сервер (Better
 * Auth `bearer()` плагін) резолвить його у сесію так само, як
 * кукі. Браузерні юзери продовжують ходити по cookie — bearer ADDITIVE.
 *
 * **Важливо:** цей файл свідомо дозволяє дизайнеру динамічно-імпортувати
 * його з `apps/web` (`await import('@sergeant/mobile-shell/auth-storage')`).
 * Тільки при цьому умовному шляху (`isCapacitor()`) веб підтягує
 * `@capacitor/preferences` у lazy-chunk — браузерний bundle лишається
 * чистим.
 */
import { Preferences } from "@capacitor/preferences";

/**
 * Ключ у KV-сховищі. `auth.bearer` — namespaced, щоб уникнути колізій з
 * можливими майбутніми Better-Auth ключами (які краще тримати в одному
 * неймспейсі `auth.*`).
 */
const BEARER_KEY = "auth.bearer";

/** Читає збережений bearer-токен або `null`, якщо користувач ще не логінувався. */
export async function getBearerToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: BEARER_KEY });
  return value ?? null;
}

/** Перезаписує bearer-токен (викликаємо після успішного `sign-in` / `sign-up`). */
export async function setBearerToken(token: string): Promise<void> {
  await Preferences.set({ key: BEARER_KEY, value: token });
}

/** Видаляє bearer-токен (на `sign-out` або при 401 з невалідним токеном). */
export async function clearBearerToken(): Promise<void> {
  await Preferences.remove({ key: BEARER_KEY });
}
