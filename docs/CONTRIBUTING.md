# Contributing

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18 LTS or later (no `.nvmrc` — just use an LTS release) |
| npm | bundled with Node (no Yarn/pnpm requirement) |
| Git | any recent version |

Supabase and Google Maps are remote services — you need API keys to run the full app. See Environment setup below.

---

## Environment setup

Copy the example file and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_KEY` | Yes | Supabase anon key (public — safe to commit for your own project) |
| `VITE_GOOGLE_MAPS_KEY` | For PlaceInput | Google Maps JS API key (Places + Geometry libraries must be enabled) |
| `VITE_SENTRY_DSN` | Production only | Sentry DSN. Sentry is skipped when this is unset or in dev mode. |
| `DATABASE_URL` | Migration scripts only | Direct Postgres connection string (never used in the frontend) |
| `VERCEL_TOKEN` | Deploy scripts only | Vercel CLI token for `vercel deploy` |

**Vite env rules**: Only variables prefixed `VITE_` are exposed to the browser bundle. Never put secrets in `VITE_*` vars.

---

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Hot module replacement (HMR) is enabled by Vite. Most changes in `src/` apply instantly without a full page reload.

### Without Google Maps

If `VITE_GOOGLE_MAPS_KEY` is not set, the `PlaceInput` component renders but the autocomplete won't suggest places. Plan creation still works if you type a place name directly, but latitude/longitude won't be resolved (plan will fail to insert due to the `NOT NULL` constraint on `lat`/`lng`).

---

## Database migrations

Migrations live in `sql/` and are numbered v2 through v7 (v1 was the initial schema, now replaced). They must be **run manually in the Supabase SQL Editor** in order. They are idempotent — safe to re-run.

```
migration_v2.sql       → baseline schema
migration_v3_tokens.sql
migration_v4_simplify.sql
migration_v4b_reject.sql
migration_v5_notifications.sql
migration_v6_private.sql
migration_v7_trust.sql
```

For a new local Supabase project, run them in this order. For a production project already on v6, just run v7.

---

## Running tests

Tests require the dev server to be running:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm test            # runs all Playwright specs
npm run test:ui     # opens the Playwright UI runner
```

Tests mock all Supabase HTTP traffic via `page.route()` (see `tests/helpers/mock-supabase.js`), so no real data is touched. WebSocket / Realtime connections are not mocked — they'll fail silently, which is fine for smoke tests.

The first run will download Playwright browsers:

```bash
npx playwright install chromium
```

---

## Linting

```bash
npm run lint
```

ESLint is configured in `eslint.config.js` using the flat config format (ESLint 9). The `eslint-plugin-react-hooks` plugin enforces the Rules of Hooks.

There is no Prettier configuration — code style is enforced by ESLint rules only.

---

## Branch and commit conventions

### Branches

```
main                  — production-ready code; deploy from here
claude/<slug>         — automated branches from Claude Code
feature/<slug>        — new features
fix/<slug>            — bug fixes
```

### Commit messages

```
type: short imperative description (≤72 chars)

Optional body for context / rationale. Not the what (readable from the diff)
but the why — constraints, tradeoffs, issue refs.
```

**Types** (from the project git log):

| Type | When |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `chore` | Tooling, config, dependency updates |
| `perf` | Performance improvement |
| `test` | Tests only |
| `docs` | Documentation only |

Examples from this project:

```
feat: error boundaries + per-route loading skeletons
fix: PlanDetail load() in try/catch/finally — setLoading always clears
refactor: extract PlanDetail into hook + 4 sub-components
perf: code-split all page routes with React.lazy + Suspense
chore: add ESLint flat config with react-hooks plugin
```

### PR process

1. Branch off `main`.
2. Keep each PR focused: one feature/fix per PR. If a PR naturally splits into independent pieces, split it.
3. Squash internal "WIP" commits before opening the PR.
4. The PR description should explain the *why*, not repeat the *what* (the diff already shows that).
5. There is no automated CI yet (no GitHub Actions). Tests must be run locally before merging.

---

## Project-specific notes

- **No CSS framework** — all styles are inline using the `theme` object from `src/theme.js`. When adding new UI, import `theme` and use the tokens rather than hardcoding colours or radii.
- **No global state manager** — all state is in hooks. If you need to share state between siblings, lift it up. Don't introduce Redux or Zustand unless the team agrees.
- **Supabase RPCs for writes** — complex mutations should be PostgreSQL functions (`SECURITY DEFINER`), not sequences of client-side requests. This prevents race conditions and keeps business logic in the database where it can be tested independently.
- **Translations** — all user-facing strings that appear in any UI must be translated into all 6 supported languages (es, en, pt, fr, de, it). See `src/lib/dates.js` for the locale list. Never hardcode language checks in components.
- **Date/time pickers** — always use `DatePicker` and `TimePicker` from `src/components/`. Never use native `<input type="date">` or `<input type="time">` elements.
