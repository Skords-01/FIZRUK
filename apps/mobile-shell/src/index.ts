/**
 * Native-shell bootstrap для Capacitor WebView.
 *
 * Цей модуль — єдине місце, де **compile-time** імпортуються рантайм-плагіни
 * `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`,
 * `@capacitor/app`. Браузерні користувачі це дерево ніколи не тягнуть — веб
 * (`apps/web`) імпортує цей файл **динамічно** і лише якщо
 * `isCapacitor()` (див. `apps/web/src/shared/lib/platform.ts`). Vite через
 * це виносить плагіни в окремий chunk, і точка входу бандлу лишається
 * вільною від Capacitor-runtime.
 *
 * `initNativeShell()` ідемпотентний — друге-трете викликання мовчки
 * ігнорується, щоби HMR у Capacitor LiveReload не дублював listener-и
 * (`App.addListener('appUrlOpen', ...)` інакше зростає на кожному ре-імпорті).
 */

import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

/** Колір status bar-а у light-темі — збігається з `--c-bg` (#fdf9f3). */
const STATUS_BAR_COLOR_LIGHT = "#fdf9f3";
/** Колір status bar-а у dark-темі — збігається з `.dark --c-bg` (#171412). */
const STATUS_BAR_COLOR_DARK = "#171412";

/** Deep-link scheme, оголошений в `AndroidManifest.xml` і `iOS Info.plist`. */
const DEEP_LINK_SCHEME = "com.sergeant.shell://";

export interface InitNativeShellOptions {
  /**
   * Хук навігації з web-side (зазвичай обгортка над React Router
   * `navigate()`). Викликається з відносним шляхом, витягнутим з
   * `com.sergeant.shell://<path>`. Якщо не передано — використовується
   * повний `window.location.assign(...)` як fallback.
   */
  navigate?: (path: string) => void;
}

let initialized = false;

/**
 * Детектує dark-тему так само, як веб: або клас `.dark` на `<html>`
 * (runtime toggle), або `prefers-color-scheme: dark` як fallback.
 */
function isDarkTheme(): boolean {
  if (typeof document !== "undefined") {
    if (document.documentElement.classList.contains("dark")) return true;
  }
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

/**
 * Витягує шлях з `com.sergeant.shell://<path>?q=1#frag` у вигляді, придатному
 * для React Router (`/path?q=1#frag`). Повертає `null`, якщо URL не відповідає
 * нашій схемі — щоби випадково не навігувати на чужий intent.
 */
export function parseDeepLink(url: string): string | null {
  if (!url.startsWith(DEEP_LINK_SCHEME)) return null;
  const rest = url.slice(DEEP_LINK_SCHEME.length);
  // `com.sergeant.shell://home` і `com.sergeant.shell:///home` трактуємо
  // однаково — перша форма частіше генерується Android `am start`.
  const normalized = rest.startsWith("/") ? rest : `/${rest}`;
  return normalized;
}

/**
 * Налаштовує native-UX (status bar, splash, keyboard, deep links).
 *
 * Безпечно викликати поза Capacitor — кожен плагін сам зробить no-op на
 * web-платформі, але ми все одно очікуємо, що виклик відбудеться лише
 * з guard-у `isCapacitor()`, щоб не тягнути цей chunk у браузер.
 */
export async function initNativeShell(
  options: InitNativeShellOptions = {},
): Promise<void> {
  if (initialized) return;
  initialized = true;

  const dark = isDarkTheme();

  // Помилки окремих плагінів не повинні ламати інші — кожен крок у
  // try/catch з console.warn, щоб застрягнути на status bar-і і не
  // дійти до splash.hide() = чорний екран користувачу.

  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({
      color: dark ? STATUS_BAR_COLOR_DARK : STATUS_BAR_COLOR_LIGHT,
    });
  } catch (err) {
    console.warn("[mobile-shell] StatusBar config failed", err);
  }

  try {
    // Явний `hide()` з fade даємо самі — інакше splash висить до
    // `launchShowDuration` з `capacitor.config.ts` (default 500 ms) і
    // дає flash між splash і першим React-рендером.
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch (err) {
    console.warn("[mobile-shell] SplashScreen.hide failed", err);
  }

  try {
    // `Body` режим піднімає все тіло при появі клавіатури — на iOS це
    // єдиний режим, де `position: fixed` елементи (BottomNav) не
    // заховуються під клавіатурою. На Android — no-op, WebView сам
    // ресайзить viewport.
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch (err) {
    console.warn("[mobile-shell] Keyboard.setResizeMode failed", err);
  }

  try {
    await App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      const path = parseDeepLink(event.url);
      if (path == null) return;
      if (options.navigate) {
        options.navigate(path);
      } else if (typeof window !== "undefined") {
        window.location.assign(path);
      }
    });
  } catch (err) {
    console.warn("[mobile-shell] App.addListener('appUrlOpen') failed", err);
  }
}
