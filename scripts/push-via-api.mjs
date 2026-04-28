#!/usr/bin/env node
// Push commit to GitHub via API when git push doesn't work due to network/auth issues.
// Uses GITHUB_PAT environment variable.

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const TOKEN = process.env.GITHUB_PAT;
const OWNER = "Skords-01";
const REPO = "Sergeant";
const TARGET_BRANCH = process.env.TARGET_BRANCH || "v0-ui-improvements";
const BASE_BRANCH = "main";

if (!TOKEN) {
  console.error("[push] GITHUB_PAT is not set");
  process.exit(1);
}

const API = "https://api.github.com";
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function gh(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    console.error(`[push] ${init.method || "GET"} ${path} -> ${res.status}`);
    console.error(body);
    throw new Error(`GitHub API error ${res.status}`);
  }
  return body;
}

function git(cmd) {
  return execSync(`git ${cmd}`, {
    cwd: "/vercel/share/v0-project",
    encoding: "utf8",
  }).trim();
}

console.log("[push] Reading commit info…");
const commitMsg = git("log -1 --pretty=%B");
const author = {
  name: git("log -1 --pretty=%an"),
  email: git("log -1 --pretty=%ae"),
};
console.log(`[push] Author: ${author.name} <${author.email}>`);
console.log(`[push] Message: ${commitMsg.split("\n")[0]}`);

console.log(`[push] Getting base ref ${BASE_BRANCH}…`);
const baseRef = await gh(
  `/repos/${OWNER}/${REPO}/git/refs/heads/${BASE_BRANCH}`,
);
const baseSha = baseRef.object.sha;
console.log(`[push] Base SHA: ${baseSha}`);

const baseCommit = await gh(`/repos/${OWNER}/${REPO}/git/commits/${baseSha}`);
const baseTreeSha = baseCommit.tree.sha;
console.log(`[push] Base tree: ${baseTreeSha}`);

// Get changed files
const status = git("show --name-status --pretty=format: HEAD")
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [status, ...pathParts] = line.split("\t");
    return { status: status.trim(), path: pathParts.join("\t") };
  });

console.log(`[push] ${status.length} changed files`);

const treeItems = [];
for (const { status: s, path } of status) {
  if (s === "D") {
    treeItems.push({ path, mode: "100644", type: "blob", sha: null });
    console.log(`[push]   D ${path}`);
    continue;
  }
  const fullPath = `/vercel/share/v0-project/${path}`;
  if (!existsSync(fullPath)) {
    console.log(`[push]   ! missing ${path}`);
    continue;
  }
  const content = readFileSync(fullPath, "utf8");
  const blob = await gh(`/repos/${OWNER}/${REPO}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content, encoding: "utf-8" }),
  });
  treeItems.push({ path, mode: "100644", type: "blob", sha: blob.sha });
  console.log(`[push]   ${s} ${path} -> ${blob.sha.slice(0, 7)}`);
}

console.log("[push] Creating tree…");
const tree = await gh(`/repos/${OWNER}/${REPO}/git/trees`, {
  method: "POST",
  body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
});
console.log(`[push] Tree: ${tree.sha}`);

console.log("[push] Creating commit…");
const commit = await gh(`/repos/${OWNER}/${REPO}/git/commits`, {
  method: "POST",
  body: JSON.stringify({
    message: commitMsg,
    tree: tree.sha,
    parents: [baseSha],
    author,
    committer: author,
  }),
});
console.log(`[push] Commit: ${commit.sha}`);

console.log(`[push] Updating ref refs/heads/${TARGET_BRANCH}…`);
try {
  await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/${TARGET_BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: true }),
  });
  console.log(`[push] Updated existing branch ${TARGET_BRANCH}`);
} catch {
  await gh(`/repos/${OWNER}/${REPO}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${TARGET_BRANCH}`,
      sha: commit.sha,
    }),
  });
  console.log(`[push] Created new branch ${TARGET_BRANCH}`);
}

console.log(
  `[push] Done! https://github.com/${OWNER}/${REPO}/tree/${TARGET_BRANCH}`,
);
console.log(
  `[push] PR: https://github.com/${OWNER}/${REPO}/compare/${BASE_BRANCH}…${TARGET_BRANCH}`,
);
