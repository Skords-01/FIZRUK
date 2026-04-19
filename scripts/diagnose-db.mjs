#!/usr/bin/env node
/**
 * Standalone Railway/Postgres connectivity diagnostic.
 *
 * Мета: за одну команду зрозуміти, чому прод віддає `ai_quota_store_unavailable`
 * з `getaddrinfo ENOTFOUND`. Перевіряє весь шлях:
 *
 *   1. Наявність `DATABASE_URL` / `MIGRATE_DATABASE_URL`
 *   2. Парсинг URL-а (схема, host, port, db)
 *   3. DNS-резолв хоста
 *   4. TCP-connect на порт
 *   5. Postgres handshake + `SELECT 1`
 *   6. Наявність ключових таблиць: `ai_usage_daily`, `user`, `session`, `module_data`
 *
 * Як запустити:
 *   # локально з `.env`:
 *   npm run db:diagnose
 *
 *   # на Railway проти прод-БД (pre-deploy shell):
 *   DATABASE_URL='<runtime-url>' node scripts/diagnose-db.mjs
 *
 * Виходить 0 при повному успіху, 1 при будь-якій помилці. JSON-вивід
 * безпечний для pipe-а в jq.
 */

import { promises as dns } from "node:dns";
import net from "node:net";

const STEP_TIMEOUT_MS = Number(process.env.DIAGNOSE_STEP_TIMEOUT_MS) || 7_000;

/** @param {string} msg @param {Record<string, unknown>=} extra */
function logInfo(msg, extra) {
  console.log(JSON.stringify({ level: "info", msg, ...(extra || {}) }));
}
/** @param {string} msg @param {Record<string, unknown>=} extra */
function logErr(msg, extra) {
  console.error(JSON.stringify({ level: "error", msg, ...(extra || {}) }));
}

/**
 * Маскує пароль у connection string для безпечного логу.
 * postgres://user:pass@host:5432/db → postgres://user:***@host:5432/db
 * @param {string} url
 */
function redactUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "<invalid-url>";
  }
}

/** @template T @param {Promise<T>} p @param {number} ms @param {string} label @returns {Promise<T>} */
function withTimeout(p, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** @param {string} host @param {number} port */
function tcpProbe(host, port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.once("connect", () => {
      socket.end();
      resolve(undefined);
    });
    socket.once("error", (err) => {
      socket.destroy();
      reject(err);
    });
  });
}

async function main() {
  const source = process.env.MIGRATE_DATABASE_URL
    ? "MIGRATE_DATABASE_URL"
    : "DATABASE_URL";
  const url =
    process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL || "";

  if (!url) {
    logErr("database_url_missing", {
      hint: "Set DATABASE_URL (або MIGRATE_DATABASE_URL для Railway pre-deploy). Railway runtime зазвичай має ${{ Postgres.DATABASE_URL }}.",
    });
    process.exit(1);
  }

  logInfo("diagnose_start", { source, url: redactUrl(url) });

  /** @type {URL} */
  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    logErr("url_parse_failed", {
      err: { message: /** @type {Error} */ (err).message },
    });
    process.exit(1);
  }

  const host = parsed.hostname;
  const port = Number(parsed.port || 5432);
  const db = parsed.pathname.replace(/^\//, "") || "<none>";
  logInfo("url_parsed", {
    scheme: parsed.protocol.replace(/:$/, ""),
    host,
    port,
    db,
    user: parsed.username || "<none>",
    sslmode: parsed.searchParams.get("sslmode") || "<default>",
  });

  // ── 1. DNS ──────────────────────────────────────────────────────────
  let failures = 0;
  try {
    const addrs = await withTimeout(
      dns.lookup(host, { all: true }),
      STEP_TIMEOUT_MS,
      "dns.lookup",
    );
    logInfo("dns_ok", { host, addresses: addrs });
  } catch (err) {
    failures++;
    const e = /** @type {Error & {code?: string}} */ (err);
    const isRailwayInternal = host.endsWith(".railway.internal");
    logErr("dns_failed", {
      host,
      err: { message: e.message, code: e.code },
      ...(isRailwayInternal
        ? {
            hint: "*.railway.internal резолвиться ТІЛЬКИ з Railway runtime-мережі. З локальної машини це нормально. Перевіряй зі shell самого API-сервісу.",
          }
        : {
            hint: "Публічний хост не резолвиться. Перевір, чи Postgres-сервіс не видалено і DATABASE_URL актуальний.",
          }),
    });
    // Без DNS далі нема сенсу.
    await finalize(failures);
    return;
  }

  // ── 2. TCP ──────────────────────────────────────────────────────────
  try {
    await withTimeout(tcpProbe(host, port), STEP_TIMEOUT_MS, "tcp.connect");
    logInfo("tcp_ok", { host, port });
  } catch (err) {
    failures++;
    const e = /** @type {Error & {code?: string}} */ (err);
    logErr("tcp_failed", {
      host,
      port,
      err: { message: e.message, code: e.code },
      hint: "DNS резолвнувся, але TCP не встановився. Postgres може бути зупинений, файрвол блокує, або пор неправильний.",
    });
  }

  // ── 3. pg handshake + basic queries ─────────────────────────────────
  let pg;
  try {
    pg = (await import("pg")).default;
  } catch (err) {
    logErr("pg_import_failed", {
      err: { message: /** @type {Error} */ (err).message },
      hint: "Запусти з корня репо після `npm ci`.",
    });
    await finalize(failures + 1);
    return;
  }

  const client = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: STEP_TIMEOUT_MS,
    statement_timeout: STEP_TIMEOUT_MS,
  });

  try {
    await withTimeout(client.connect(), STEP_TIMEOUT_MS, "pg.connect");
    logInfo("pg_connect_ok");
  } catch (err) {
    failures++;
    const e = /** @type {Error & {code?: string}} */ (err);
    logErr("pg_connect_failed", {
      err: { message: e.message, code: e.code },
      hint: "Credentials/SSL-режим не сходяться, або Postgres не приймає з'єднання (pg_hba).",
    });
    await finalize(failures);
    return;
  }

  try {
    const r = await client.query("SELECT 1 AS ok");
    logInfo("pg_select1_ok", { rows: r.rowCount });
  } catch (err) {
    failures++;
    logErr("pg_select1_failed", {
      err: { message: /** @type {Error} */ (err).message },
    });
  }

  for (const table of [
    "ai_usage_daily",
    "user",
    "session",
    "module_data",
    "schema_migrations",
  ]) {
    try {
      const r = await client.query("SELECT to_regclass($1) AS regclass", [
        table,
      ]);
      const regclass = r.rows[0]?.regclass;
      if (regclass) {
        logInfo("table_found", { table });
      } else {
        failures++;
        logErr("table_missing", {
          table,
          hint:
            table === "schema_migrations"
              ? "Міграції ніколи не запускалися — виконай `npm run db:migrate`."
              : `Таблиця відсутня — міграції не застосовані або інша БД. Запусти npm run db:migrate.`,
        });
      }
    } catch (err) {
      failures++;
      logErr("table_check_failed", {
        table,
        err: { message: /** @type {Error} */ (err).message },
      });
    }
  }

  try {
    await client.end();
  } catch {
    /* best-effort */
  }

  await finalize(failures);
}

/** @param {number} failures */
async function finalize(failures) {
  if (failures === 0) {
    logInfo("diagnose_ok");
    process.exit(0);
  }
  logErr("diagnose_failed", { failures });
  process.exit(1);
}

main().catch((err) => {
  logErr("diagnose_unhandled", {
    err: { message: /** @type {Error} */ (err).message },
  });
  process.exit(1);
});
