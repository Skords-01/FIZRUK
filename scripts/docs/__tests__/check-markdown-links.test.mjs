// scripts/docs/__tests__/check-markdown-links.test.mjs
//
// Unit tests for the markdown-link checker's pure extraction and classification.
// Run with: node --test scripts/docs/__tests__/check-markdown-links.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  extractLinks,
  classifyTarget,
  resolveInternal,
  shouldSkipFile,
  walkMarkdown,
  loadCache,
  saveCache,
} from "../check-markdown-links.mjs";

describe("extractLinks", () => {
  it("extracts plain [text](target) links", () => {
    const c = "See [docs](./README.md) and [home](https://example.com).";
    const links = extractLinks(c);
    assert.equal(links.length, 2);
    assert.equal(links[0].target, "./README.md");
    assert.equal(links[1].target, "https://example.com");
  });

  it("ignores links inside fenced code blocks", () => {
    const c = [
      "Outside: [a](./a.md)",
      "```",
      "Inside: [b](./b.md)",
      "```",
      "Outside again: [c](./c.md)",
    ].join("\n");
    const links = extractLinks(c);
    assert.deepEqual(
      links.map((l) => l.target),
      ["./a.md", "./c.md"],
    );
  });

  it("ignores links inside inline backticks", () => {
    const c = "See `[foo](./bar.md)` and [real](./real.md).";
    const links = extractLinks(c);
    assert.deepEqual(
      links.map((l) => l.target),
      ["./real.md"],
    );
  });

  it("captures 1-based line numbers", () => {
    const c = ["line 1", "line 2 [x](./x.md)", "line 3"].join("\n");
    const links = extractLinks(c);
    assert.equal(links[0].line, 2);
  });
});

describe("classifyTarget", () => {
  it("classifies http(s) as external", () => {
    assert.equal(classifyTarget("https://example.com"), "external");
    assert.equal(classifyTarget("http://example.com"), "external");
  });

  it("classifies relative paths as internal", () => {
    assert.equal(classifyTarget("./foo.md"), "internal");
    assert.equal(classifyTarget("../foo.md"), "internal");
    assert.equal(classifyTarget("foo.md"), "internal");
  });

  it("skips pure anchors", () => {
    assert.equal(classifyTarget("#section-a"), "skip");
  });

  it("skips mailto/tel/javascript/data", () => {
    assert.equal(classifyTarget("mailto:x@y.z"), "skip");
    assert.equal(classifyTarget("tel:+1234"), "skip");
    assert.equal(classifyTarget("javascript:void(0)"), "skip");
    assert.equal(classifyTarget("data:image/png;base64,xxx"), "skip");
  });

  it("skips the placeholder patterns", () => {
    assert.equal(classifyTarget("undefined"), "skip");
    assert.equal(classifyTarget("<placeholder>.md"), "skip");
    assert.equal(classifyTarget("./{{var}}.md"), "skip");
  });
});

describe("shouldSkipFile", () => {
  it("skips THIRD_PARTY_LICENSES.md", () => {
    assert.equal(shouldSkipFile("THIRD_PARTY_LICENSES.md"), true);
  });

  it("skips .agents/skills/**", () => {
    assert.equal(shouldSkipFile(".agents/skills/foo/AGENTS.md"), true);
  });

  it("skips _TEMPLATE-*.md files", () => {
    assert.equal(
      shouldSkipFile("docs/playbooks/_TEMPLATE-decision-tree.md"),
      true,
    );
  });

  it("does not skip regular docs", () => {
    assert.equal(shouldSkipFile("docs/adr/0001-foo.md"), false);
    assert.equal(shouldSkipFile("README.md"), false);
  });
});

describe("resolveInternal", () => {
  it("resolves relative target from the source file's directory", () => {
    const abs = resolveInternal(
      "/repo/docs/playbooks/add-foo.md",
      "./bar.md",
      "/repo",
    );
    assert.equal(abs, "/repo/docs/playbooks/bar.md");
  });

  it("strips the anchor before resolving", () => {
    const abs = resolveInternal("/repo/docs/a.md", "./b.md#section", "/repo");
    assert.equal(abs, "/repo/docs/b.md");
  });

  it("resolves absolute-style paths against the repo root", () => {
    const abs = resolveInternal("/repo/docs/deep/a.md", "/README.md", "/repo");
    assert.equal(abs, "/repo/README.md");
  });
});

describe("walkMarkdown", () => {
  it("finds markdown files, skipping node_modules", () => {
    const dir = mkdtempSync(join(tmpdir(), "mdlinks-"));
    try {
      mkdirSync(join(dir, "sub"), { recursive: true });
      mkdirSync(join(dir, "node_modules/foo"), { recursive: true });
      writeFileSync(join(dir, "a.md"), "# a");
      writeFileSync(join(dir, "sub/b.md"), "# b");
      writeFileSync(join(dir, "node_modules/foo/ignored.md"), "# ignored");
      writeFileSync(join(dir, "not-md.txt"), "nope");
      const files = walkMarkdown(dir);
      const rels = files.map((f) => f.replace(dir + "/", "")).sort();
      assert.deepEqual(rels, ["a.md", "sub/b.md"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadCache / saveCache", () => {
  it("round-trips entries and drops expired ones", () => {
    const dir = mkdtempSync(join(tmpdir(), "mdlinks-cache-"));
    try {
      const file = join(dir, "links.json");
      const now = Date.now();
      saveCache(
        {
          "https://fresh.example": { ok: true, status: 200, at: now },
          "https://stale.example": {
            ok: true,
            status: 200,
            at: now - 100 * 24 * 60 * 60 * 1000,
          },
        },
        file,
      );
      const loaded = loadCache(file, { now, ttl: 7 * 24 * 60 * 60 * 1000 });
      assert.ok(loaded["https://fresh.example"]);
      assert.equal(loaded["https://stale.example"], undefined);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns {} when cache file is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "mdlinks-cache-"));
    try {
      const out = loadCache(join(dir, "nope.json"));
      assert.deepEqual(out, {});
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
