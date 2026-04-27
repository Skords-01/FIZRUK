/**
 * Aggregates multiple Vitest JSON reports into a flaky-tests markdown trend.
 *
 * Usage:
 *   node scripts/flaky-tests/aggregate.mjs <dir-with-json-reports>
 *
 * Each JSON file must follow the Vitest `--reporter json` schema
 * (top-level `testResults[]` with `assertionResults[]`).
 *
 * Outputs a markdown table to stdout (top-20 by failure rate).
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * @typedef {object} VitestAssertionResult
 * @property {string} fullName
 * @property {"passed"|"failed"|"pending"|"skipped"} status
 * @property {number} [duration]
 * @property {number} [retryReasons - present when vitest retries}
 */

/**
 * @typedef {object} VitestTestResult
 * @property {string} name - file path
 * @property {string} status
 * @property {VitestAssertionResult[]} assertionResults
 */

/**
 * @typedef {object} VitestJsonReport
 * @property {boolean} success
 * @property {number} numTotalTests
 * @property {VitestTestResult[]} testResults
 */

/**
 * Parse a single Vitest JSON report and extract per-test outcomes.
 * @param {VitestJsonReport} report
 * @param {string} runId - identifier for this run (e.g. filename or date)
 * @returns {Array<{file: string, test: string, status: string, runId: string}>}
 */
export function parseReport(report, runId) {
  const results = [];
  if (!report || !Array.isArray(report.testResults)) {
    return results;
  }
  for (const suite of report.testResults) {
    const file = suite.name || "unknown";
    if (!Array.isArray(suite.assertionResults)) continue;
    for (const assertion of suite.assertionResults) {
      results.push({
        file,
        test: assertion.fullName || assertion.title || "unknown",
        status: assertion.status || "unknown",
        runId,
      });
    }
  }
  return results;
}

/**
 * Aggregate parsed results across multiple runs.
 * @param {Array<{file: string, test: string, status: string, runId: string}>} allResults
 * @returns {Array<{file: string, test: string, runs: number, failures: number, failureRate: string, flakyRate: string}>}
 */
export function aggregate(allResults) {
  /** @type {Map<string, {file: string, test: string, runIds: Set<string>, failures: number, passes: number}>} */
  const map = new Map();

  for (const r of allResults) {
    if (r.status === "pending" || r.status === "skipped") continue;

    const key = `${r.file} > ${r.test}`;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        file: r.file,
        test: r.test,
        runIds: new Set(),
        failures: 0,
        passes: 0,
      };
      map.set(key, entry);
    }
    entry.runIds.add(r.runId);
    if (r.status === "failed") {
      entry.failures++;
    } else {
      entry.passes++;
    }
  }

  const rows = [];
  for (const entry of map.values()) {
    const runs = entry.runIds.size;
    const total = entry.failures + entry.passes;
    const failureRate =
      total > 0 ? ((entry.failures / total) * 100).toFixed(1) : "0.0";
    // Flaky = has both passes AND failures across runs
    const isFlaky = entry.failures > 0 && entry.passes > 0;
    const flakyRate = isFlaky ? failureRate : "0.0";

    rows.push({
      file: entry.file,
      test: entry.test,
      runs,
      failures: entry.failures,
      failureRate,
      flakyRate,
    });
  }

  // Sort by failure rate desc, then by failures desc
  rows.sort((a, b) => {
    const diff = parseFloat(b.failureRate) - parseFloat(a.failureRate);
    if (diff !== 0) return diff;
    return b.failures - a.failures;
  });

  return rows;
}

/**
 * Render aggregated rows as a markdown table (top-N).
 * @param {ReturnType<typeof aggregate>} rows
 * @param {{ topN?: number, title?: string }} [opts]
 * @returns {string}
 */
export function renderMarkdown(rows, opts = {}) {
  const topN = opts.topN ?? 20;
  const title = opts.title ?? "Flaky Tests Dashboard";
  const top = rows.slice(0, topN);

  const lines = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`> Generated: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`> Total unique tests analysed: ${rows.length}`);
  lines.push(
    `> Tests with failures: ${rows.filter((r) => r.failures > 0).length}`,
  );
  lines.push("");

  if (top.length === 0) {
    lines.push("No test failures detected across the analysed runs. 🎉");
    return lines.join("\n");
  }

  lines.push(`## Top-${topN} by failure rate`);
  lines.push("");
  lines.push("| # | File | Test | Runs | Failures | Failure % | Flaky % |");
  lines.push("|---|------|------|-----:|---------:|----------:|--------:|");

  for (let i = 0; i < top.length; i++) {
    const r = top[i];
    const shortFile = r.file.replace(/^.*\/(apps|packages)\//, "$1/");
    lines.push(
      `| ${i + 1} | \`${shortFile}\` | ${r.test} | ${r.runs} | ${r.failures} | ${r.failureRate}% | ${r.flakyRate}% |`,
    );
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("**Legend:**");
  lines.push(
    "- **Failure %** — ratio of failed executions to total executions across all runs.",
  );
  lines.push(
    "- **Flaky %** — same as failure rate but only when the test has both passes and failures (intermittent). `0.0%` means the test either always passes or always fails.",
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Load all `*.json` files from a directory and aggregate.
 * @param {string} dir
 * @param {{ topN?: number }} [opts]
 * @returns {string} markdown output
 */
export function aggregateFromDir(dir, opts = {}) {
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return renderMarkdown([], opts);
  }

  if (files.length === 0) {
    return renderMarkdown([], opts);
  }

  const allResults = [];
  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), "utf-8");
      const report = JSON.parse(raw);
      const runId = file.replace(/\.json$/, "");
      allResults.push(...parseReport(report, runId));
    } catch {
      // skip malformed files
    }
  }

  const rows = aggregate(allResults);
  return renderMarkdown(rows, opts);
}

// CLI entry point
const dir = process.argv[2];
if (dir) {
  console.log(aggregateFromDir(dir));
}
