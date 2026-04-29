#!/usr/bin/env node
// scripts/docs/generate-freshness-dashboard.mjs
//
// Generates an HTML dashboard showing the freshness status of all docs.
// Output: docs-freshness-dashboard.html (uploaded as CI artifact).
//
// Usage:
//   node scripts/docs/generate-freshness-dashboard.mjs
//   # → writes docs-freshness-dashboard.html to repo root

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../..");
const OUTPUT = resolve(ROOT, "docs-freshness-dashboard.html");

const TODAY = new Date().toISOString().slice(0, 10);

// ── Scan docs ────────────────────────────────────────────────────────────────

function findMdFiles(dir) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findMdFiles(fullPath));
      } else if (entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return results;
}

const RE_VALIDATED =
  /\*\*Last validated:\*\*\s*(\d{4}-\d{2}-\d{2})\s+by\s+(@\S+)/;
const RE_NEXT_REVIEW = /\*\*Next review:\*\*\s*(\d{4}-\d{2}-\d{2})/;
const RE_STATUS = />\s*\*\*Status:\*\*\s*(\S+)/;

function parseDoc(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const head = content.split("\n").slice(0, 15).join("\n");

  const validatedMatch = RE_VALIDATED.exec(head);
  const nextMatch = RE_NEXT_REVIEW.exec(head);
  const statusMatch = RE_STATUS.exec(head);

  return {
    path: relative(ROOT, filePath),
    lastValidated: validatedMatch ? validatedMatch[1] : null,
    owner: validatedMatch ? validatedMatch[2] : null,
    nextReview: nextMatch ? nextMatch[1] : null,
    status: statusMatch ? statusMatch[1] : null,
    hasFreshness: !!validatedMatch,
  };
}

function daysDiff(dateA, dateB) {
  const a = new Date(dateA + "T00:00:00Z");
  const b = new Date(dateB + "T00:00:00Z");
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function healthClass(doc) {
  if (!doc.hasFreshness) return "missing";
  if (!doc.status) return "no-badge";
  if (doc.nextReview && doc.nextReview < TODAY) return "overdue";
  if (doc.nextReview) {
    const daysLeft = daysDiff(TODAY, doc.nextReview);
    if (daysLeft <= 14) return "soon";
  }
  return "ok";
}

function healthLabel(cls) {
  const labels = {
    ok: "OK",
    soon: "Due soon",
    overdue: "Overdue",
    "no-badge": "No Status badge",
    missing: "No freshness header",
  };
  return labels[cls] || cls;
}

// ── Collect data ─────────────────────────────────────────────────────────────

const allFiles = findMdFiles(ROOT).filter((f) => {
  const rel = relative(ROOT, f);
  return !(
    rel.startsWith("apps/") ||
    rel.startsWith("packages/") ||
    rel.startsWith("node_modules/") ||
    rel.startsWith("plop-templates/")
  );
});

const docs = allFiles.map(parseDoc);

// Stats
const stats = {
  total: docs.length,
  withFreshness: docs.filter((d) => d.hasFreshness).length,
  withStatus: docs.filter((d) => d.status).length,
  overdue: docs.filter((d) => healthClass(d) === "overdue").length,
  soon: docs.filter((d) => healthClass(d) === "soon").length,
  ok: docs.filter((d) => healthClass(d) === "ok").length,
  noBadge: docs.filter((d) => healthClass(d) === "no-badge").length,
  missing: docs.filter((d) => healthClass(d) === "missing").length,
};

// ── Generate HTML ────────────────────────────────────────────────────────────

const rows = docs
  .sort((a, b) => {
    const order = { overdue: 0, "no-badge": 1, soon: 2, missing: 3, ok: 4 };
    return (order[healthClass(a)] ?? 5) - (order[healthClass(b)] ?? 5);
  })
  .map((d) => {
    const cls = healthClass(d);
    const daysLeft = d.nextReview ? daysDiff(TODAY, d.nextReview) : "—";
    return `<tr class="${cls}">
      <td>${d.path}</td>
      <td>${d.status || "—"}</td>
      <td>${d.lastValidated || "—"}</td>
      <td>${d.nextReview || "—"}</td>
      <td>${typeof daysLeft === "number" ? daysLeft + "d" : daysLeft}</td>
      <td>${d.owner || "—"}</td>
      <td><span class="badge ${cls}">${healthLabel(cls)}</span></td>
    </tr>`;
  })
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Sergeant Docs Freshness Dashboard</title>
<style>
  :root { --bg: #0d1117; --fg: #c9d1d9; --border: #30363d; --card: #161b22; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: var(--bg); color: var(--fg); padding: 2rem; }
  h1 { margin-bottom: 0.5rem; }
  .meta { color: #8b949e; margin-bottom: 1.5rem; }
  .stats { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
  .stat { background: var(--card); border: 1px solid var(--border);
          border-radius: 8px; padding: 1rem 1.5rem; min-width: 120px; }
  .stat .num { font-size: 2rem; font-weight: 700; }
  .stat .label { color: #8b949e; font-size: 0.85rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid var(--border);
       color: #8b949e; font-weight: 600; }
  td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px;
           font-size: 0.75rem; font-weight: 600; }
  .badge.ok { background: #238636; color: #fff; }
  .badge.soon { background: #d29922; color: #000; }
  .badge.overdue { background: #da3633; color: #fff; }
  .badge.no-badge { background: #6e40c9; color: #fff; }
  .badge.missing { background: #484f58; color: #c9d1d9; }
  tr.overdue td:first-child { border-left: 3px solid #da3633; }
  tr.soon td:first-child { border-left: 3px solid #d29922; }
</style>
</head>
<body>
<h1>Sergeant Docs Freshness Dashboard</h1>
<p class="meta">Generated: ${TODAY} | Total docs: ${stats.total}</p>

<div class="stats">
  <div class="stat"><div class="num" style="color:#238636">${stats.ok}</div><div class="label">OK</div></div>
  <div class="stat"><div class="num" style="color:#d29922">${stats.soon}</div><div class="label">Due soon</div></div>
  <div class="stat"><div class="num" style="color:#da3633">${stats.overdue}</div><div class="label">Overdue</div></div>
  <div class="stat"><div class="num" style="color:#6e40c9">${stats.noBadge}</div><div class="label">No badge</div></div>
  <div class="stat"><div class="num" style="color:#484f58">${stats.missing}</div><div class="label">No header</div></div>
</div>

<table>
<thead>
  <tr><th>File</th><th>Status</th><th>Last validated</th><th>Next review</th><th>Days left</th><th>Owner</th><th>Health</th></tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>`;

writeFileSync(OUTPUT, html);
console.log(`✅ Dashboard written to ${relative(ROOT, OUTPUT)}`);
console.log(
  `   ${stats.total} docs | ${stats.ok} OK | ${stats.overdue} overdue | ${stats.noBadge} no badge | ${stats.missing} no header`,
);
