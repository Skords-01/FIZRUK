# Hub — Replit Setup

## Overview
A personal hub app with React + Vite frontend and an Express API backend, running as a single unified process on Replit.

## Architecture
- **Frontend**: React 18 + Vite, built to `dist/`
- **Backend**: Express.js serving API routes under `/api/*`
- **Unified server**: `server/replit.mjs` serves both the built frontend and the API on port 5000

## Running the App
The workflow `Start application` runs `npm run start:replit` which executes `server/replit.mjs`.

For production build the frontend first:
```
npm run build
npm run start:replit
```

For local Vite dev server (with proxy to Express):
```
npm run start         # Express API on port 3000 (railway.mjs)
npm run dev           # Vite dev server on port 5173 (proxies /api to 3000)
```

## Key Files
- `server/replit.mjs` — Unified server for Replit (frontend + API, port 5000)
- `server/railway.mjs` — API-only server for Railway deployment (port 3000)
- `server/api/` — API route handlers
- `server/api/lib/cors.js` — CORS config (includes Replit domains via REPLIT_DOMAINS env var)
- `vite.config.js` — Frontend build config with /api proxy

## Environment Variables / Secrets
| Key | Required | Description |
|-----|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude AI API key for chat features |
| `NUTRITION_API_TOKEN` | No | Nutritionix API token |
| `ALLOWED_ORIGINS` | No | Extra CORS origins (comma-separated) |
| `VITE_API_BASE_URL` | No | Frontend API base URL (leave empty for relative paths) |
| `VITE_NUTRITION_API_TOKEN` | No | Nutritionix token for direct frontend requests |

## Modules
- **Finyk** — Finance tracker with Monobank integration
- **Fizruk** — Workout / exercise tracker  
- **Routine** — Routine/habit tracker
- **Nutrition** — Nutrition tracking with AI photo analysis
- **Hub Chat** — AI chat interface (Claude)
