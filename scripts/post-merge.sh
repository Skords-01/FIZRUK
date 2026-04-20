#!/usr/bin/env bash
set -e
echo "[post-merge] Installing dependencies..."
pnpm install --frozen-lockfile=false < /dev/null
echo "[post-merge] Building frontend..."
pnpm --filter @sergeant/web build < /dev/null
echo "[post-merge] Done."
