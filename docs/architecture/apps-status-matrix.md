# Apps & Packages Status Matrix

> **Last revalidated: 2026-04-27.** Наступна ревалідація — 2026-07-27 (квартал).
> Закриває audit PR-1.B. Перегляд при кожному додаванні / видаленні apps або
> packages, і мінімум раз у квартал.

Одна сторінка — хто живий, хто стабілізується, хто в міграції, хто legacy.
Для кожного пакета: `status`, чим займається, куди копати глибше. Ніяких
приватних деталей реалізації — для цього є per-module docs.

## Легенда статусів

| Status      | Що означає                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `active`    | Активно розвивається, часті зміни, PR-и йдуть щотижня.                                                |
| `stabilize` | Контракт більш-менш заморожений, правки лише bugfix-и і maintenance. Breaking зміни — через ADR.      |
| `migration` | У процесі переносу з / на іншу форму (наприклад web → RN, JS → TS). Очікується завершення зі строком. |
| `legacy`    | Не видаляємо (ще є залежності), але нових фіч не додаємо. План виведення зафіксовано або TBD.         |

---

## Apps

| Package                  | Path                | Status      | Опис                                                                                                                                          | Глибше                                                                                                                                                      |
| ------------------------ | ------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@sergeant/web`          | `apps/web`          | `active`    | React 18 + Vite PWA — канонічна продакшн-апка (Vercel статика + Railway `/api`).                                                              | [`docs/platforms.md` §1](../platforms.md), [`docs/frontend-overview.md`](../frontend-overview.md), [`docs/frontend-tech-debt.md`](../frontend-tech-debt.md) |
| `@sergeant/server`       | `apps/server`       | `active`    | Node 20 / TypeScript / Express `/api/v1/*`, Better Auth, Postgres, Anthropic tool-use.                                                        | [`docs/api-v1.md`](../api-v1.md), [`docs/backend-tech-debt.md`](../backend-tech-debt.md), [`AGENTS.md`](../../AGENTS.md)                                    |
| `@sergeant/mobile`       | `apps/mobile`       | `active`    | Expo SDK 52 + Expo Router. Usе 4 модулі, native push (APNs/FCM), MMKV-офлайн. Internal dev-client.                                            | [`docs/mobile.md`](../mobile.md), [`docs/react-native-migration.md`](../react-native-migration.md), [`docs/platforms.md` §2](../platforms.md)               |
| `@sergeant/mobile-shell` | `apps/mobile-shell` | `stabilize` | Capacitor 7 wrapper навколо `@sergeant/web` для Android / iOS. MVP-release флоу. Далі — лише maintenance, нові фічі уже в `@sergeant/mobile`. | [`docs/mobile-shell.md`](../mobile-shell.md), [`docs/capacitor-deep-links.md`](../capacitor-deep-links.md), [`docs/platforms.md` §3](../platforms.md)       |

## Domain packages

Бізнес-логіка модулів, pure TS без React. Імпортуються і web, і mobile.

| Package                      | Path                        | Status   | Опис                                                                            | Глибше                                                                                                                         |
| ---------------------------- | --------------------------- | -------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `@sergeant/finyk-domain`     | `packages/finyk-domain`     | `active` | Фінансова логіка (Monobank sync normalizers, бюджети, cashflow, активи, борги). | [`docs/frontend-overview.md` (Finyk)](../frontend-overview.md), [`packages/finyk-domain/src`](../../packages/finyk-domain/src) |
| `@sergeant/fizruk-domain`    | `packages/fizruk-domain`    | `active` | Тренування, програми, прогрес, вимірювання.                                     | [`docs/frontend-overview.md` (Fizruk)](../frontend-overview.md)                                                                |
| `@sergeant/routine-domain`   | `packages/routine-domain`   | `active` | Календар, звички, стріки, хітмеп.                                               | [`docs/frontend-overview.md` (Routine)](../frontend-overview.md)                                                               |
| `@sergeant/nutrition-domain` | `packages/nutrition-domain` | `active` | Фото AI-аналіз нутрієнтів, лог їжі, штрихкоди, плани/покупки/комора/рецепти.    | [`docs/frontend-overview.md` (Nutrition)](../frontend-overview.md)                                                             |

## Shared infra

Пакети, які тримають контракт між поверхнями і підлогу під ногами.

| Package                         | Path                                     | Status      | Опис                                                                                                       | Глибше                                                                                                                       |
| ------------------------------- | ---------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `@sergeant/shared`              | `packages/shared`                        | `active`    | Спільні Zod-схеми API (`ChatRequestSchema`, `MeResponseSchema` та ін.), типи, утиліти.                     | [`packages/shared/src/schemas`](../../packages/shared/src/schemas)                                                           |
| `@sergeant/api-client`          | `packages/api-client`                    | `stabilize` | Типізована обгортка над `/api/v1/*` для web + mobile. Контракт рівно відповідає `@sergeant/shared` схемам. | [`docs/api-v1.md`](../api-v1.md), [AGENTS.md rule #3](../../AGENTS.md)                                                       |
| `@sergeant/design-tokens`       | `packages/design-tokens`                 | `stabilize` | Tailwind preset, кольори, типографія. Єдине джерело брендових токенів для web/mobile.                      | [`docs/BRANDBOOK.md`](../BRANDBOOK.md), [`docs/design-system.md`](../design-system.md)                                       |
| `@sergeant/insights`            | `packages/insights`                      | `active`    | Pure-TS движок для weekly-digest / coach-insight (однаковий на сервері і клієнті).                         | [`packages/insights/src`](../../packages/insights/src)                                                                       |
| `@sergeant/config`              | `packages/config`                        | `stabilize` | Спільний tsconfig/eslint-base. Апи інгерять через `extends`.                                               | [AGENTS.md rule #5](../../AGENTS.md), [PR-1.A](../audits/2026-04-26-sergeant-audit-devin.md) (pending)                       |
| `eslint-plugin-sergeant-design` | `packages/eslint-plugin-sergeant-design` | `active`    | Custom ESLint rules (`no-raw-local-storage`, `rq-keys-only-from-factory`, `no-bigint-string`).             | [AGENTS.md rules](../../AGENTS.md), [`packages/eslint-plugin-sergeant-design`](../../packages/eslint-plugin-sergeant-design) |

---

## Чому ця сторінка існує

Без central-matrix-у новий інженер мусить шукати по 10+ docs-файлах, що в репо
`active` vs `stabilize`. Ця сторінка — короткий вхід у тему. Реальні деталі
завжди живуть у per-module docs (посилання в колонці «Глибше»), а тут — лише
«хто куди зараз рухається».

Ревалідація — раз у квартал (наступна в заголовку). Якщо статус пакета
змінюється у процесі PR — update цього файла в тому ж PR, не окремо.
