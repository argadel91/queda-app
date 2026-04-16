# queda.

Blank canvas. Plumbing ready, product to be built.

## Stack

- **Vite + React 18** — SPA, no framework
- **Supabase** — Auth (PKCE flow, email verification, password reset) + Postgres + Storage + Realtime
- **Google Maps Places API** — lazy loaded via `src/main.jsx` (`window.__loadGoogleMaps()`)
- **Sentry** — error tracking in production
- **PWA** — service worker at `public/sw.js`, manifest at `public/manifest.json`
- **Vercel** — hosting, CSP headers + SPA rewrite in `vercel.json`
- **Porkbun** — DNS for `queda.xyz`

## Getting started

```bash
git clone <repo>
cd queda-app
cp .env.example .env   # fill in the keys
npm install
npm run dev
```

`.env` keys required:

| Var | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_KEY` | Supabase anon key (safe for frontend) |
| `VITE_GOOGLE_MAPS_KEY` | Google Maps JS API key |
| `VITE_SENTRY_DSN` | Sentry DSN (prod only) |

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the build locally
- `npm test` — Playwright e2e (no tests yet)

## Structure

```
src/
  App.jsx          ← placeholder, replace with real UI
  main.jsx         ← React mount + Sentry + Google Maps loader + SW register
  lib/
    supabase.js    ← Supabase client + toast helpers
    googleMaps.js  ← Places/Maps library loaders
    storage.js     ← localStorage wrapper with JSON + TTL
    ids.js         ← genId (URL-safe, profanity-filtered)
    dates.js       ← locale-aware date/time formatters
public/
  sw.js            ← service worker (cache static assets only)
  manifest.json    ← PWA manifest
  icon-*.svg og.png
sql/
  migration_v2.sql ← full DB schema (run manually in Supabase SQL editor)
index.html
vercel.json        ← CSP + SPA rewrite
vite.config.js
```

## Deploying

Pushing to `main` auto-deploys via Vercel. Env vars are configured in the Vercel project dashboard.

## Database

Schema lives in `sql/migration_v2.sql`. Apply it in the Supabase SQL editor or via `psql` against `DATABASE_URL`.
