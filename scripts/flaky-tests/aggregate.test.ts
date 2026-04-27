import { describe, it, expect } from "vitest";
import {
  parseReport,
  aggregate,
  renderMarkdown,
  aggregateFromDir,
} from "./aggregate.mjs";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), "flaky-agg-"));
}

describe("parseReport", () => {
  it("extracts test outcomes from a valid vitest JSON report", () => {
    const report = {
      success: false,
      numTotalTests: 3,
      testResults: [
        {
          name: "apps/web/src/core/Hub.test.tsx",
          status: "failed",
          assertionResults: [
            { fullName: "Hub renders dashboard", status: "passed" },
            { fullName: "Hub shows error boundary", status: "failed" },
          ],
        },
        {
          name: "apps/web/src/shared/utils.test.ts",
          status: "passed",
          assertionResults: [
            { fullName: "formatDate works", status: "passed" },
          ],
        },
      ],
    };

    const results = parseReport(report, "run-1");
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      file: "apps/web/src/core/Hub.test.tsx",
      test: "Hub renders dashboard",
      status: "passed",
      runId: "run-1",
    });
    expect(results[1]).toEqual({
      file: "apps/web/src/core/Hub.test.tsx",
      test: "Hub shows error boundary",
      status: "failed",
      runId: "run-1",
    });
  });

  it("returns empty array for null/undefined report", () => {
    expect(parseReport(null as never, "r")).toEqual([]);
    expect(parseReport(undefined as never, "r")).toEqual([]);
  });

  it("returns empty array when testResults is missing", () => {
    expect(parseReport({ success: true } as never, "r")).toEqual([]);
  });

  it("returns empty array for empty testResults", () => {
    const report = { success: true, numTotalTests: 0, testResults: [] };
    expect(parseReport(report, "r")).toEqual([]);
  });

  it("skips suites with missing assertionResults", () => {
    const report = {
      success: true,
      numTotalTests: 0,
      testResults: [{ name: "foo.test.ts", status: "passed" }],
    };
    expect(parseReport(report as never, "r")).toEqual([]);
  });

  it("uses title as fallback when fullName is missing", () => {
    const report = {
      success: true,
      numTotalTests: 1,
      testResults: [
        {
          name: "test.ts",
          status: "passed",
          assertionResults: [{ title: "my test", status: "passed" }],
        },
      ],
    };
    const results = parseReport(report as never, "r");
    expect(results[0].test).toBe("my test");
  });
});

describe("aggregate", () => {
  it("groups by file+test and calculates rates", () => {
    const results = [
      { file: "a.test.ts", test: "test1", status: "passed", runId: "run-1" },
      { file: "a.test.ts", test: "test1", status: "failed", runId: "run-2" },
      { file: "a.test.ts", test: "test1", status: "passed", runId: "run-3" },
    ];

    const rows = aggregate(results);
    expect(rows).toHaveLength(1);
    expect(rows[0].runs).toBe(3);
    expect(rows[0].failures).toBe(1);
    expect(rows[0].failureRate).toBe("33.3");
    expect(rows[0].flakyRate).toBe("33.3");
  });

  it("marks non-flaky tests with 0% flaky rate", () => {
    const results = [
      {
        file: "a.test.ts",
        test: "always-fails",
        status: "failed",
        runId: "run-1",
      },
      {
        file: "a.test.ts",
        test: "always-fails",
        status: "failed",
        runId: "run-2",
      },
    ];

    const rows = aggregate(results);
    expect(rows[0].failureRate).toBe("100.0");
    expect(rows[0].flakyRate).toBe("0.0");
  });

  it("skips pending and skipped statuses", () => {
    const results = [
      {
        file: "a.test.ts",
        test: "skipped-test",
        status: "skipped",
        runId: "run-1",
      },
      {
        file: "a.test.ts",
        test: "pending-test",
        status: "pending",
        runId: "run-1",
      },
    ];

    const rows = aggregate(results);
    expect(rows).toHaveLength(0);
  });

  it("handles empty input", () => {
    expect(aggregate([])).toEqual([]);
  });

  it("sorts by failure rate descending", () => {
    const results = [
      { file: "a.test.ts", test: "low", status: "failed", runId: "r1" },
      { file: "a.test.ts", test: "low", status: "passed", runId: "r2" },
      { file: "a.test.ts", test: "low", status: "passed", runId: "r3" },
      { file: "b.test.ts", test: "high", status: "failed", runId: "r1" },
      { file: "b.test.ts", test: "high", status: "failed", runId: "r2" },
      { file: "b.test.ts", test: "high", status: "passed", runId: "r3" },
    ];

    const rows = aggregate(results);
    expect(rows[0].test).toBe("high");
    expect(rows[1].test).toBe("low");
  });
});

describe("renderMarkdown", () => {
  it("renders a table for non-empty rows", () => {
    const rows = [
      {
        file: "apps/web/src/core/Hub.test.tsx",
        test: "renders",
        runs: 5,
        failures: 2,
        failureRate: "40.0",
        flakyRate: "40.0",
      },
    ];

    const md = renderMarkdown(rows, { title: "Test Report" });
    expect(md).toContain("# Test Report");
    expect(md).toContain("| 1 |");
    expect(md).toContain("40.0%");
    expect(md).toContain("renders");
  });

  it("handles empty rows gracefully", () => {
    const md = renderMarkdown([]);
    expect(md).toContain("No test failures detected");
  });

  it("respects topN limit", () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      file: `f${i}.test.ts`,
      test: `test-${i}`,
      runs: 1,
      failures: 1,
      failureRate: "100.0",
      flakyRate: "0.0",
    }));

    const md = renderMarkdown(rows, { topN: 5 });
    expect(md).toContain("| 5 |");
    expect(md).not.toContain("| 6 |");
  });

  it("shortens file paths by stripping prefix before apps/ or packages/", () => {
    const rows = [
      {
        file: "/home/runner/work/Sergeant/apps/web/src/test.ts",
        test: "t",
        runs: 1,
        failures: 1,
        failureRate: "100.0",
        flakyRate: "0.0",
      },
    ];

    const md = renderMarkdown(rows);
    expect(md).toContain("apps/web/src/test.ts");
    expect(md).not.toContain("/home/runner");
  });
});

describe("aggregateFromDir", () => {
  it("aggregates multiple JSON files from a directory", () => {
    const dir = makeTempDir();
    const report1 = {
      success: true,
      numTotalTests: 1,
      testResults: [
        {
          name: "apps/web/src/test.ts",
          status: "passed",
          assertionResults: [{ fullName: "works", status: "passed" }],
        },
      ],
    };
    const report2 = {
      success: false,
      numTotalTests: 1,
      testResults: [
        {
          name: "apps/web/src/test.ts",
          status: "failed",
          assertionResults: [{ fullName: "works", status: "failed" }],
        },
      ],
    };

    writeFileSync(join(dir, "run-1.json"), JSON.stringify(report1));
    writeFileSync(join(dir, "run-2.json"), JSON.stringify(report2));

    const md = aggregateFromDir(dir);
    expect(md).toContain("works");
    expect(md).toContain("50.0%");
  });

  it("handles non-existent directory", () => {
    const md = aggregateFromDir("/tmp/nonexistent-flaky-dir-xyz");
    expect(md).toContain("No test failures detected");
  });

  it("handles empty directory", () => {
    const dir = makeTempDir();
    const md = aggregateFromDir(dir);
    expect(md).toContain("No test failures detected");
  });

  it("skips malformed JSON files", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "bad.json"), "not json{{{");
    writeFileSync(
      join(dir, "good.json"),
      JSON.stringify({
        success: true,
        numTotalTests: 1,
        testResults: [
          {
            name: "t.ts",
            status: "passed",
            assertionResults: [{ fullName: "ok", status: "passed" }],
          },
        ],
      }),
    );

    const md = aggregateFromDir(dir);
    expect(md).toContain("ok");
  });

  it("handles JSON with no test results (edge case)", () => {
    const dir = makeTempDir();
    writeFileSync(
      join(dir, "empty.json"),
      JSON.stringify({ success: true, numTotalTests: 0, testResults: [] }),
    );

    const md = aggregateFromDir(dir);
    expect(md).toContain("No test failures detected");
  });
});
