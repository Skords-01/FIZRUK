#!/usr/bin/env node
// scripts/docs/check-links.mjs
//
// CI script that validates all markdown links in docs:
// 1. Internal file references: [text](../path/to/file.md) — checked against filesystem
// 2. Internal anchor refs: [text](#heading) — checked against headings in same file
// 3. External URLs: [text](https://...) — optionally checked with HEAD requests
//
// Usage:
//   node scripts/docs/check-links.mjs              # internal links only (fast)
//   CHECK_EXTERNAL=1 node scripts/docs/check-links.mjs  # also check URLs (slow)
//
// Exit code 1 on broken internal links. External link failures are warnings only.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../..");

const CHECK_EXTERNAL = process.env.CHECK_EXTERNAL === "1";

let errors = 0;
let warnings = 0;
let checkedInternal = 0;
let checkedExternal = 0;

function error(msg) {
  console.error(`❌ ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
  warnings++;
}

// ── Find all markdown files ──────────────────────────────────────────────────

function findMdFiles(dir) {
  const results = [];
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
  return results;
}

// ── Heading slug generator (GitHub-compatible) ───────────────────────────────

function slugify(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

function extractHeadings(content) {
  const slugs = new Set();
  const headingRe = /^#{1,6}\s+(.+)$/gm;
  let match;
  while ((match = headingRe.exec(content)) !== null) {
    slugs.add(slugify(match[1]));
  }
  return slugs;
}

// ── Link extraction ──────────────────────────────────────────────────────────

// Matches [text](url) but not ![img](url)
const LINK_RE = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;

function extractLinks(content) {
  const links = [];
  let match;
  while ((match = LINK_RE.exec(content)) !== null) {
    const href = match[2].trim();
    // Skip mailto, tel, javascript
    if (/^(mailto:|tel:|javascript:)/.test(href)) continue;
    links.push({ text: match[1], href, index: match.index });
  }
  return links;
}

// ── Check internal links ─────────────────────────────────────────────────────

function checkFile(filePath) {
  const relPath = relative(ROOT, filePath);
  const content = readFileSync(filePath, "utf-8");
  const headings = extractHeadings(content);
  const links = extractLinks(content);
  const fileDir = dirname(filePath);

  for (const link of links) {
    const { href } = link;

    // External URL
    if (/^https?:\/\//.test(href)) {
      checkedExternal++;
      continue; // handled separately if CHECK_EXTERNAL
    }

    // Pure anchor
    if (href.startsWith("#")) {
      checkedInternal++;
      const anchor = href.slice(1);
      if (!headings.has(anchor)) {
        // Don't error on anchor links — heading slugs vary
        warn(`${relPath}: anchor ${href} may not match any heading`);
      }
      continue;
    }

    // Internal file link (possibly with anchor)
    checkedInternal++;
    const [pathPart, anchor] = href.split("#");
    if (!pathPart) continue;

    const targetPath = resolve(fileDir, pathPart);
    if (!existsSync(targetPath)) {
      error(
        `${relPath}: broken link → ${href} (file not found: ${relative(ROOT, targetPath)})`,
      );
    } else if (anchor) {
      // Optionally check anchor in target file
      try {
        const targetContent = readFileSync(targetPath, "utf-8");
        const targetHeadings = extractHeadings(targetContent);
        if (!targetHeadings.has(anchor)) {
          warn(
            `${relPath}: link ${href} — file exists but anchor #${anchor} may not match`,
          );
        }
      } catch {
        // Can't read target — skip anchor check
      }
    }
  }
}

// ── External URL check (optional) ────────────────────────────────────────────

async function checkExternalUrls() {
  if (!CHECK_EXTERNAL) return;

  console.log("\n── Checking external URLs (slow) ──\n");

  const mdFiles = findMdFiles(ROOT).filter((f) => {
    const rel = relative(ROOT, f);
    return (
      rel.startsWith("docs/") ||
      [
        "AGENTS.md",
        "CONTRIBUTING.md",
        "CLAUDE.md",
        "DEVIN.md",
        "README.md",
      ].includes(rel)
    );
  });

  const urlSet = new Set();
  for (const file of mdFiles) {
    const content = readFileSync(file, "utf-8");
    const links = extractLinks(content);
    for (const link of links) {
      if (/^https?:\/\//.test(link.href)) {
        urlSet.add(link.href.split("#")[0]); // dedupe by base URL
      }
    }
  }

  let checked = 0;
  let broken = 0;
  for (const url of urlSet) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "Sergeant-Link-Checker/1.0" },
      });
      if (response.status >= 400) {
        warn(`External URL returned ${response.status}: ${url}`);
        broken++;
      }
      checked++;
    } catch {
      warn(`External URL unreachable: ${url}`);
      broken++;
      checked++;
    }
  }

  console.log(`Checked ${checked} unique external URLs, ${broken} issues.`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log("── Markdown link checker ──\n");

const mdFiles = findMdFiles(ROOT).filter((f) => {
  const rel = relative(ROOT, f);
  // Skip apps/ packages/ node_modules/ .agents/ and generated/template files
  return !(
    rel.startsWith("apps/") ||
    rel.startsWith("packages/") ||
    rel.startsWith("node_modules/") ||
    rel.startsWith(".agents/") ||
    rel === "THIRD_PARTY_LICENSES.md" ||
    rel.includes("_TEMPLATE")
  );
});

for (const file of mdFiles) {
  checkFile(file);
}

await checkExternalUrls();

console.log(`\n── Summary ──\n`);
console.log(`Internal links checked: ${checkedInternal}`);
console.log(`External URLs found: ${checkedExternal}`);
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors > 0) {
  console.error("\n💥 Link check FAILED — broken internal links found.\n");
  process.exit(1);
} else if (warnings > 0) {
  console.log("\n⚠️  Link check passed with warnings.\n");
} else {
  console.log("\n✅ All links OK.\n");
}
