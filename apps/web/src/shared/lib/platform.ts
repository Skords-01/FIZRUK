/**
 * Feature-detect рантайм-платформу без compile-time залежності на
 * `@capacitor/core`.
 *
 * Коли `apps/web` білдиться для браузера (Vercel, Vite preview) —
 * Capacitor runtime відсутній, і цей модуль повертає `false`. Коли той
 * самий бандл завантажується всередині Capacitor-WebView (див.
 * `apps/mobile-shell`), native-runtime впорскує у `window` об'єкт
 * `Capacitor` ДО завантаження JS — тому перевірка на `window.Capacitor`
 * на top-level виклику вже валідна.
 *
 * Робимо feature-detect, а не `import` з `@capacitor/core`, щоб:
 *   - веб-бандл не тягнув Capacitor у main chunk (bundle-size);
 *   - типи `apps/web` не залежали від `@capacitor/*` пакетів (які
 *     живуть тільки у `apps/mobile-shell/node_modules`).
 */

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function getCapacitorGlobal(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/**
 * `true` коли код виконується всередині Capacitor WebView (Android/iOS
 * shell). Це наша єдина точка гілкування «web vs native» для вибору
 * механізму авторизації (cookie vs bearer-token).
 */
export function isCapacitor(): boolean {
  const cap = getCapacitorGlobal();
  return typeof cap?.isNativePlatform === "function"
    ? cap.isNativePlatform()
    : false;
}

/**
 * `"web" | "ios" | "android"`. Повертає `"web"` коли Capacitor відсутній
 * або повертає невідому платформу.
 */
export function getCapacitorPlatform(): "web" | "ios" | "android" {
  const cap = getCapacitorGlobal();
  const raw =
    typeof cap?.getPlatform === "function" ? cap.getPlatform() : "web";
  return raw === "ios" || raw === "android" ? raw : "web";
}
