// scripts/docs/__tests__/generate-playbook-index.test.mjs
//
// Unit tests for the playbook-index auto-generator.
// Run with: node --test scripts/docs/__tests__/generate-playbook-index.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extractPlaybookMeta,
  escapeTableCell,
  renderIndex,
  addDays,
} from "../generate-playbook-index.mjs";

describe("extractPlaybookMeta", () => {
  it("extracts title and trigger from a canonical playbook", () => {
    const content = [
      "# Playbook: Add API Endpoint",
      "",
      "> **Last validated:** 2026-04-27 by @Skords-01.",
      "",
      '**Trigger:** "Додати новий endpoint" / нова API-функціональність.',
      "",
      "Content",
    ].join("\n");
    const meta = extractPlaybookMeta(content);
    assert.equal(meta.title, "Add API Endpoint");
    assert.equal(
      meta.trigger,
      '"Додати новий endpoint" / нова API-функціональність.',
    );
    assert.equal(meta.isDecisionTree, false);
  });

  it("detects decision-tree marker 🌳", () => {
    const content = [
      "# 🌳 Hotfix Production",
      "",
      "**Trigger:** Прод впав.",
    ].join("\n");
    const meta = extractPlaybookMeta(content);
    assert.equal(meta.isDecisionTree, true);
  });

  it("returns null when Trigger line is missing", () => {
    const content = "# Some Doc\n\nNo trigger here.\n";
    assert.equal(extractPlaybookMeta(content), null);
  });

  it("collapses multi-line / whitespace inside trigger", () => {
    const content = "# Foo\n\n**Trigger:**   multiple   spaces    ok.\n";
    const meta = extractPlaybookMeta(content);
    assert.equal(meta.trigger, "multiple spaces ok.");
  });
});

describe("escapeTableCell", () => {
  it("escapes pipe characters", () => {
    assert.equal(escapeTableCell("a | b"), "a \\| b");
  });

  it("collapses newlines to spaces", () => {
    assert.equal(escapeTableCell("line1\nline2"), "line1 line2");
  });

  it("leaves plain text unchanged", () => {
    assert.equal(escapeTableCell("hello world"), "hello world");
  });
});

describe("renderIndex", () => {
  it("produces a deterministic, stable table", () => {
    const entries = [
      {
        file: "b.md",
        title: "Bravo",
        trigger: "when B",
        isDecisionTree: false,
      },
      {
        file: "a.md",
        title: "Alpha",
        trigger: "when A",
        isDecisionTree: true,
      },
    ];
    const out = renderIndex(entries, { today: "2026-04-29" });
    // Sorted alphabetically by filename.
    const aIdx = out.indexOf("[`a.md`]");
    const bIdx = out.indexOf("[`b.md`]");
    assert.ok(aIdx < bIdx, "a.md should come before b.md");
    assert.match(out, /🌳 Alpha/);
    assert.match(out, /Last validated:\*\* 2026-04-29/);
    assert.match(out, /Auto-generated/);
  });

  it("falls back to filename when title is missing", () => {
    const entries = [
      {
        file: "no-title.md",
        title: null,
        trigger: "foo",
        isDecisionTree: false,
      },
    ];
    const out = renderIndex(entries, { today: "2026-04-29" });
    assert.match(out, /no-title\|/.source ? /\| no-title \|/ : /no-title/);
  });
});

describe("addDays", () => {
  it("adds 90 days correctly across month boundaries", () => {
    assert.equal(addDays("2026-04-29", 90), "2026-07-28");
  });
});
