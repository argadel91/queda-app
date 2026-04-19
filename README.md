# queda.

**Meet new people through spontaneous plans.** Create hangouts, discover events near you, and connect with people who share your interests — all for free.

---

## Features

- **Create plans** — post a spontaneous hangout with location, date, time, and capacity
- **Discover & join** — browse a live feed of nearby plans; request a spot with one tap
- **Approval flow** — open, approval-required, or private plans; organisers control who gets in
- **Trust score** — built-in reliability scoring based on attendance history
- **Real-time** — Supabase Realtime keeps notifications and comments live without polling
- **In-plan chat** — comment thread on every plan, visible to participants
- **PWA** — installable, offline-capable, works like a native app

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + React 18 (SPA, no framework) |
| Auth | Supabase PKCE flow — email verification + password reset |
| Database | Supabase Postgres with Row-Level Security |
| Real-time | Supabase Realtime (Postgres changes) |
| Maps | Google Maps Places API (lazy-loaded) |
| Error tracking | Sentry (production only) |
| PWA | Service worker + Web App Manifest |
| Hosting | Vercel (CSP headers + SPA rewrite) |
| DNS | Porkbun → `queda.xyz` |

## Quick start

```bash
git clone https://github.com/<org>/queda-app.git
cd queda-app
cp .env.example .env   # fill in your keys (see table below)
npm install
npm run dev
```

### Required environment variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_KEY` | Supabase anon key (safe for the frontend) |
| `VITE_GOOGLE_MAPS_KEY` | Google Maps JS API key (Places + Geometry libraries) |
| `VITE_SENTRY_DSN` | Sentry DSN — only needed in production |

### Database setup

Apply the schema to your Supabase project by running the contents of `sql/migration_v8.sql` (or the latest migration) in the **Supabase SQL editor**. The file is safe to re-run — all statements are non-destructive.

## Project structure

```
src/
  App.jsx            ← router + global overlays (tour, install prompt)
  main.jsx           ← React mount, Sentry init, Google Maps loader, SW register
  components/        ← shared UI (Layout, Icons, pickers, plan sub-components…)
  hooks/             ← data hooks (useAuth, usePlanDetail, useNotifications…)
  lib/               ← thin helpers (supabase client, dates, ids, storage…)
  pages/             ← route-level components (Feed, PlanDetail, Profile…)
  constants/         ← app-wide constants (categories)
public/
  sw.js              ← service worker (cache static assets)
  manifest.json      ← PWA manifest
sql/
  migration_v*.sql   ← full DB schema — apply in Supabase SQL editor
docs/
  ARCHITECTURE.md    ← system design and data-flow overview
  CONTRIBUTING.md    ← contribution guide
  supabase-schema.md ← annotated schema reference
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run Playwright e2e tests |

## Deployment

Push to `main` → Vercel auto-deploys. Environment variables are set in the Vercel project dashboard (or via `vercel env add`).

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for branch conventions, commit style, and the PR checklist.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deeper look at the data model, RLS design, and trust-score mechanics.

## License

MIT
