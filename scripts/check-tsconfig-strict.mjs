/**
 * CI guard: ensures tsconfig strict settings are not accidentally weakened.
 *
 * For each monitored tsconfig the script verifies:
 *   1. compilerOptions.strict is explicitly `true`.
 *   2. allowJs is NOT `true` in apps/web (optional, warn-only).
 *
 * When strict is not yet enabled (e.g. apps/web during migration) the
 * check emits a warning instead of failing so the guard can be merged
 * before the migration PR lands.
 */

import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());

// ── files to check ──────────────────────────────────────────────────
const STRICT_REQUIRED = [
  { file: "apps/server/tsconfig.json", warnOnly: false },
  { file: "apps/web/tsconfig.json", warnOnly: true },
];

const DISALLOW_ALLOWJS = [{ file: "apps/web/tsconfig.json" }];

// ── helpers ─────────────────────────────────────────────────────────

/** Strip JSON5-style comments while preserving string contents intact. */
function stripJsonComments(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    // strings — copy verbatim
    if (text[i] === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') {
        if (text[j] === "\\") j++; // skip escaped char
        j++;
      }
      out += text.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    // single-line comment
    if (text[i] === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    // multi-line comment
    if (text[i] === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += text[i++];
  }
  return out;
}

function readJson(relPath) {
  const abs = path.join(repoRoot, relPath);
  if (!fs.existsSync(abs)) return null;
  const raw = fs.readFileSync(abs, "utf8");
  return JSON.parse(stripJsonComments(raw));
}

// ── checks ──────────────────────────────────────────────────────────

const errors = [];
const warnings = [];

for (const { file, warnOnly } of STRICT_REQUIRED) {
  const json = readJson(file);
  if (!json) {
    errors.push(`${file}: file not found`);
    continue;
  }

  const strict = json.compilerOptions?.strict;

  if (strict !== true) {
    const msg = `${file}: compilerOptions.strict must be \`true\` (got ${JSON.stringify(strict)})`;
    if (warnOnly) {
      warnings.push(`${msg} [warn-only — migration pending]`);
    } else {
      errors.push(msg);
    }
  }
}

for (const { file } of DISALLOW_ALLOWJS) {
  const json = readJson(file);
  if (!json) continue;

  if (json.compilerOptions?.allowJs === true) {
    warnings.push(
      `${file}: compilerOptions.allowJs is \`true\` — remove once JS→TS migration completes`,
    );
  }
}

// ── output ──────────────────────────────────────────────────────────

if (warnings.length) {
  console.warn(
    "⚠️  tsconfig-strict warnings:\n" +
      warnings.map((w) => `  - ${w}`).join("\n"),
  );
}

if (errors.length) {
  console.error(
    "❌ tsconfig-strict check FAILED:\n" +
      errors.map((e) => `  - ${e}`).join("\n") +
      "\n\nDo not remove or override `strict: true` in these files.\n",
  );
  process.exit(1);
} else {
  console.log("✅ tsconfig-strict check passed.");
}
