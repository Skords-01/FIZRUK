import { useEffect, useRef } from "react";

import { useApiClient, useUser } from "@sergeant/api-client/react";

import { registerPush } from "./registerPush";

/**
 * No-UI компонент, що монтується у root-дереві (`app/_layout.tsx`) і
 * відповідає за передачу native push-токена на сервер після логіну.
 *
 * Чому useUser, а не окремий гуард зверху: root `_layout.tsx` у expo-
 * router живе над групами `(auth)` та `(tabs)`, тож ми не можемо
 * рендерити `PushRegistrar` «фізично всередині authenticated-гілки» без
 * дублювання провайдерів. Замість цього компонент сам перевіряє статус
 * через `useUser()` і запускає `registerPush` лише коли зʼявляється
 * активний `data.user`. Після sign-out (`data.user === null`) прапорець
 * скидається, тому наступний логін знову тригерить реєстрацію (з
 * AsyncStorage-кешем у `registerPush`).
 *
 * Помилки ловимо і логуємо — пуші це побічна фіча, не ламаємо UI.
 */
export function PushRegistrar() {
  const api = useApiClient();
  const { data } = useUser();
  const hasUser = !!data?.user;

  const inFlightRef = useRef(false);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!hasUser) {
      registeredRef.current = false;
      return;
    }
    if (registeredRef.current || inFlightRef.current) return;
    inFlightRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const result = await registerPush(api);
        if (cancelled) return;
        registeredRef.current = true;
        if (result.status === "registered") {
          console.info(
            `[PushRegistrar] registered ${result.platform} push token`,
          );
        } else {
          console.info(`[PushRegistrar] skipped: ${result.reason}`);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("[PushRegistrar] failed to register push token", error);
        }
      } finally {
        inFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, hasUser]);

  return null;
}
