// scripts/ci/__tests__/validate-pr-body.test.mjs
//
// Unit tests for the PR-body validator.
// Run with: node --test scripts/ci/__tests__/validate-pr-body.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  splitSections,
  countCheckboxes,
  validate,
  REQUIRED_SECTIONS,
} from "../validate-pr-body.mjs";

// A minimal body that satisfies the validator.
const VALID_BODY = `
## What changed

Added foo to bar. See \`apps/server/src/foo.ts\`.

## Why

Fixes #123 — users saw 500s on /api/foo.

## How to test

\`\`\`
pnpm test --filter foo
\`\`\`

## Pre-flight (Hard Rule #13)

- [x] Read AGENTS.md Hard Rules for the touched paths.
- [ ] Checked freshness headers.

## Docs updated alongside code? (Hard Rule #13)

- [x] N/A — no docs invalidated by this change.
`;

describe("splitSections", () => {
  it("splits a body into H2 sections", () => {
    const sections = splitSections(
      "prelude\n## A\naaa\n## B\nbbb\n## C\nccc\n",
    );
    const headings = sections.map((s) => s.heading);
    assert.deepEqual(headings, [null, "A", "B", "C"]);
  });
});

describe("countCheckboxes", () => {
  it("counts ticked and unticked separately", () => {
    const body = [
      "- [x] done one",
      "- [X] done two",
      "- [ ] not done",
      "* [ ] starred unticked",
      "plain text - [x] not a checkbox (no leading bullet)",
    ].join("\n");
    const { ticked, unticked } = countCheckboxes(body);
    assert.equal(ticked, 2);
    assert.equal(unticked, 2);
  });
});

describe("validate", () => {
  it("accepts a well-formed body", () => {
    const r = validate(VALID_BODY);
    assert.equal(r.ok, true, JSON.stringify(r.errors));
  });

  it("rejects an empty body", () => {
    const r = validate("");
    assert.equal(r.ok, false);
    assert.match(r.errors.join("\n"), /empty or suspiciously short/);
  });

  it("rejects a body missing every section", () => {
    const r = validate(
      "just a one-line summary without headings — lorem ipsum dolor sit amet consectetur adipiscing elit",
    );
    assert.equal(r.ok, false);
    for (const required of REQUIRED_SECTIONS) {
      assert.match(
        r.errors.join("\n"),
        new RegExp(required.replace(/[.()#?]/g, ".")),
      );
    }
  });

  it("rejects a body where Pre-flight has no ticked box", () => {
    const body = VALID_BODY.replace(
      "- [x] Read AGENTS.md",
      "- [ ] Read AGENTS.md",
    );
    const r = validate(body);
    assert.equal(r.ok, false);
    assert.match(r.errors.join("\n"), /Pre-flight/);
  });

  it("rejects a body where Docs section has no ticked box", () => {
    const body = VALID_BODY.replace(
      "- [x] N/A — no docs invalidated",
      "- [ ] N/A — no docs invalidated",
    );
    const r = validate(body);
    assert.equal(r.ok, false);
    assert.match(r.errors.join("\n"), /Docs updated alongside code/);
  });

  it("rejects a body where What changed is only HTML comments", () => {
    const body = VALID_BODY.replace(
      "Added foo to bar. See `apps/server/src/foo.ts`.",
      "<!-- TODO -->",
    );
    const r = validate(body);
    assert.equal(r.ok, false);
    assert.match(r.errors.join("\n"), /What changed/);
  });
});
