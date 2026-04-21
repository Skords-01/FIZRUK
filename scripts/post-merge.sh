#!/usr/bin/env bash
set -e
echo "[post-merge] Installing dependencies..."
pnpm install --ignore-scripts < /dev/null
echo "[post-merge] Running migrations..."
pnpm db:migrate < /dev/null
echo "[post-merge] Done."
