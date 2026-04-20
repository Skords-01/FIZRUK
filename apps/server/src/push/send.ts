import { logger } from "../obs/logger.js";

/**
 * Payload, з яким внутрішні флоу (coach, reminders, weekly digest і т.д.)
 * викликають `sendToUser`. Поля збігаються з тим, що очікує
 * `POST /api/v1/push/test` (див. `PushTestRequestSchema` у
 * `@sergeant/shared`), щоб один і той самий shape був і для тесту, і для
 * реальних side-effect-ів.
 */
export interface PushSendPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export type PushSendPlatform = "ios" | "android" | "web";

export interface PushSendError {
  platform: PushSendPlatform;
  reason: string;
}

export interface PushSendSummary {
  delivered: { ios: number; android: number; web: number };
  /** Скільки dead tokens сервер soft-deleted у цьому ж виклику. */
  cleaned: number;
  /** Per-device помилки; не per-виклик (той би кинувся вище). */
  errors: PushSendError[];
}

/**
 * **Тимчасовий stub до мерджу сесії 5A.**
 *
 * Сесія 5A (`apps/server/src/push/send.ts` з реальним APNs-`http2` клієнтом
 * та FCM HTTP v1 sender-ом) ще не змерджена у `main`. Цей модуль навмисно
 * експортує той самий public API (`sendToUser`), щоб сесія 5B (цей PR)
 * могла безпечно зашити виклик у coach/reminders-флоу, а також виставити
 * `POST /api/v1/push/test` — і при мерджі 5A зміни не потребували б
 * правок у викликачів.
 *
 * Контракт stub-а:
 *   - нічого не шле у APNs/FCM/web-push — тільки лог payload-а у
 *     structured-logger на рівні `info` з `msg: "push.sendToUser (stub)"`;
 *   - завжди повертає `{ delivered: {ios:0,android:0,web:0}, cleaned: 0,
 *     errors: [] }` — щоб викликач міг залогувати «push: delivered ios=0
 *     android=0 web=0» без спеціальної обробки null/undefined;
 *   - ніколи не кидає: side-effect має бути non-fatal для бізнес-флоу
 *     (coach insight, reminder, weekly digest і т.д.).
 *
 * ВАЖЛИВО: 5B треба мерджити **після** 5A, інакше тестова ручка не
 * доставить жоден push і юзер бачитиме лише `{ delivered: all-zeros }`.
 */
export async function sendToUser(
  userId: string,
  payload: PushSendPayload,
): Promise<PushSendSummary> {
  logger.info({
    msg: "push.sendToUser (stub)",
    userId,
    title: payload.title,
    body: payload.body,
    dataKeys: payload.data ? Object.keys(payload.data) : [],
    note: "5A sender not yet merged — payload logged only",
  });

  return {
    delivered: { ios: 0, android: 0, web: 0 },
    cleaned: 0,
    errors: [],
  };
}

/**
 * Безпечний fire-and-forget-обгортка: викликає `sendToUser`, ковтає будь-яку
 * помилку і логує короткий summary у форматі, який одразу читається у логах
 * Grafana/Railway:
 *
 *   `push: delivered ios=0 android=0 web=0 cleaned=0 errors=0 module=coach`
 *
 * Використовується бізнес-флоу (coach/reminders), де ми **не хочемо**, щоб
 * провал пуша зірвав handler — юзер має отримати HTTP-відповідь навіть
 * якщо APNs або FCM лежать.
 */
export async function sendToUserQuietly(
  userId: string,
  payload: PushSendPayload,
  context: { module: string },
): Promise<void> {
  try {
    const summary = await sendToUser(userId, payload);
    logger.info({
      msg: `push: delivered ios=${summary.delivered.ios} android=${summary.delivered.android} web=${summary.delivered.web}`,
      module: context.module,
      userId,
      cleaned: summary.cleaned,
      errors: summary.errors.length,
    });
  } catch (err) {
    // Не re-throw: side-effect за визначенням non-fatal.
    logger.warn({
      msg: "push.sendToUser failed (swallowed)",
      module: context.module,
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
