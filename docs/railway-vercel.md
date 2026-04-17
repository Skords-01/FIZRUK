# Railway (API + PostgreSQL) + Vercel (фронт)

## 1. PostgreSQL на Railway

1. У [Railway](https://railway.app) створи **New project** → **Empty project** або **Deploy from GitHub** (спочатку можна лише БД).
2. **Add service** → **Database** → **PostgreSQL**.
3. Після створення відкрий сервіс Postgres → вкладка **Variables** (або **Connect**).
4. Скопіюй **`DATABASE_URL`** (або збери з `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — Railway часто показує готовий connection string).

Цей URL потрібен **тільки бекенду** (Node на Railway), не Vercel.

## 2. API на Railway (той самий репозиторій)

1. **Add service** → **GitHub repo** → обери репозиторій Hub.
2. У налаштуваннях сервісу: **Settings** → якщо не підхопився Dockerfile, вкажи **Dockerfile path**: `Dockerfile.api` (або використай [railway.toml](../railway.toml) у корені — вже налаштований).
3. У **Variables** додай:

| Змінна                           | Значення                                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | **Reference** до змінної Postgres-сервісу: ` ${{ Postgres.DATABASE_URL }}` або встав вручну скопійований рядок                                                                                             |
| `BETTER_AUTH_SECRET`             | Випадковий рядок ≥32 символів                                                                                                                                                                              |
| `BETTER_AUTH_URL`                | Публічний HTTPS URL **цього API** після деплою, напр. `https://hub-api-production.up.railway.app` (без слеша в кінці)                                                                                      |
| `ANTHROPIC_API_KEY`              | Ключ Claude                                                                                                                                                                                                |
| `PORT`                           | Зазвичай Railway підставляє сам; якщо треба — `3000`                                                                                                                                                       |
| `ALLOWED_ORIGINS`                | URL фронту на Vercel, напр. `https://твій-проєкт.vercel.app` (через кому, якщо кілька)                                                                                                                     |
| `BETTER_AUTH_CROSS_SITE_COOKIES` | Опційно: `0` — не форсити `SameSite=None` (рідко: один домен через reverse proxy). Якщо не задано, при `BETTER_AUTH_URL` на **https://** кукі налаштовуються для крос-сайтового фронта (Vercel → Railway). |

4. У **Networking** увімкни **Public networking**, скопіюй домен — це і є база для `BETTER_AUTH_URL`.
5. Задеплой. У логах після старту має бути `[db] Schema verified`.

## 3. Vercel (фронт)

У **Project** → **Settings** → **Environment Variables** (Production / Preview):

| Змінна              | Значення                                                                     |
| ------------------- | ---------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Той самий публічний URL API, що й `BETTER_AUTH_URL` (HTTPS, без `/` в кінці) |

Перезбери фронт після зміни змінних.

## 4. Локальна БД (Docker)

Якщо хочеш PostgreSQL на машині без хмари:

```bash
docker compose up -d
```

У `.env` (локально):

```env
DATABASE_URL=postgresql://hub:hub@localhost:5432/hub
BETTER_AUTH_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:5173
```

Потім `npm run start` (API) і `npm run dev` (Vite).

## 5. Перевірка

- `GET https://<твій-api>.up.railway.app/health` → тіло `ok`, якщо PostgreSQL доступний; інакше **503** і `unhealthy`. У відповідях API є заголовок `X-Request-Id` (або передай свій `X-Request-Id` з клієнта).
- Реєстрація в застосунку з прод-фронту: куки й CORS мають відповідати `ALLOWED_ORIGINS` і домену API. Якщо сесія «не тримається» у Chrome/Safari — перевір **HTTPS** на обох сторонах і що фронтовий URL точно в `ALLOWED_ORIGINS`. Повністю різні домени без спільного батьківського (не піддомени) у Safari можуть блокувати сторонні кукі — тоді варіанти: спільний домен (піддомени + `crossSubDomainCookies` у better-auth) або **проксі** `/api` через Vercel на той самий origin.

## 6. Моніторинг і логи

- **Healthcheck**: зовнішній монітор (UptimeRobot, Better Stack, тощо) — `GET /health` кожні 1–5 хв; алерт при **не 200** або тілі не `ok`.
- **Логи Railway**: шукай за **`X-Request-Id`** з відповіді API або з тіла помилки (`requestId`), щоб зв’язати клієнт і сервер.
- **Структуровані рядки** `{"msg":"http",...}` — фільтруй за `status >= 500` або `path` для регресій.
