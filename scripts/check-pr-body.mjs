#!/usr/bin/env node
// scripts/check-pr-body.mjs
//
// CI script that validates PR description follows the template.
// Checks:
// 1. Required sections present: "What changed", "Why", "How to test"
// 2. Pre-flight (Hard Rule #13): at least one checkbox checked
// 3. Docs updated alongside code: at least one checkbox checked or "N/A"
//
// Usage:
//   PR_BODY="..." node scripts/check-pr-body.mjs
//   # PR_BODY is set by GitHub Actions from ${{ github.event.pull_request.body }}
//
// Exit code 1 on validation failure.

const body = process.env.PR_BODY || "";

if (!body.trim()) {
  console.error("❌ PR description is empty. Please fill in the template.");
  process.exit(1);
}

let errors = 0;

function error(msg) {
  console.error(`❌ ${msg}`);
  errors++;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

// ── Check 1: Required sections ───────────────────────────────────────────────

const requiredSections = [
  { heading: "What changed", re: /##\s*What changed/i },
  { heading: "Why", re: /##\s*Why/i },
  { heading: "How to test", re: /##\s*How to test/i },
];

for (const section of requiredSections) {
  if (section.re.test(body)) {
    // Check that section has content (not just the heading + HTML comment)
    const idx = body.search(section.re);
    const afterHeading = body
      .slice(idx)
      .split("\n")
      .slice(1, 6)
      .join("\n")
      .trim();
    const stripped = afterHeading.replace(/<!--[\s\S]*?-->/g, "").trim();
    if (!stripped || stripped === "---") {
      error(
        `Section "${section.heading}" is present but empty. Please fill it in.`,
      );
    } else {
      ok(`Section "${section.heading}" present and filled.`);
    }
  } else {
    error(
      `Required section "${section.heading}" is missing from the PR description.`,
    );
  }
}

// ── Check 2: Pre-flight (Hard Rule #13) ──────────────────────────────────────

const preflightSection = /##\s*Pre-flight.*Rule #13/i.test(body);
if (preflightSection) {
  const preflightChecked = /- \[x\]/i.test(
    body
      .slice(body.search(/##\s*Pre-flight.*Rule #13/i))
      .split(/##(?!\s*Pre-flight)/)[0],
  );
  if (preflightChecked) {
    ok("Pre-flight (Hard Rule #13): at least one checkbox checked.");
  } else {
    error(
      "Pre-flight (Hard Rule #13): no checkboxes checked. Read the governance and tick what applies.",
    );
  }
} else {
  error('Section "Pre-flight (Hard Rule #13)" is missing.');
}

// ── Check 3: Docs updated alongside code ─────────────────────────────────────

const docsSection = /##\s*Docs updated alongside code/i.test(body);
if (docsSection) {
  const docsSlice = body
    .slice(body.search(/##\s*Docs updated alongside code/i))
    .split(/##(?!\s*Docs updated)/)[0];
  const docsChecked = /- \[x\]/i.test(docsSlice);
  if (docsChecked) {
    ok("Docs updated alongside code: at least one checkbox checked.");
  } else {
    error(
      'Docs updated alongside code (Hard Rule #13): no checkboxes checked. Tick "N/A" if no docs were invalidated.',
    );
  }
} else {
  error('Section "Docs updated alongside code? (Hard Rule #13)" is missing.');
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(
  `\n── PR body validation: ${errors === 0 ? "PASSED" : "FAILED"} (${errors} error(s)) ──\n`,
);

if (errors > 0) {
  process.exit(1);
}
