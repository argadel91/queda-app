# Architecture

## Stack

| Layer | Technology | Version |
|---|---|---|
| Bundler | Vite | 5.x |
| UI framework | React | 18.2 |
| Routing | React Router | v7 |
| Backend / database | Supabase (Postgres + Auth + Realtime) | ^2.39 |
| Error tracking | Sentry (`@sentry/react`) | ^10 |
| Maps / places | Google Maps JS API (Places library) | weekly |
| Deployment | Vercel | — |
| Testing | Playwright | ^1.58 |

Styling is **100% inline styles** using a shared `src/theme.js` token object — no Tailwind, no CSS modules, no Sass. A single `src/index.css` resets box-sizing and applies font imports.

---

## Folder structure

```
queda-app/
├── public/                    # Static assets served as-is
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker (cache-first for static assets)
│   ├── icon-192.svg / icon-512.svg
│   └── og.png
├── sql/                       # Postgres migrations (run manually in Supabase SQL Editor)
│   ├── migration_v2.sql       # Plans, participants, profiles, messages tables
│   ├── migration_v3_tokens.sql# Token ledger + atomic credit/debit functions
│   ├── migration_v4_simplify.sql # Simplified 1-token deposit model
│   ├── migration_v4b_reject.sql  # reject_join_request RPC
│   ├── migration_v5_notifications.sql # Notifications table + triggers
│   ├── migration_v6_private.sql  # Private plans always require approval
│   └── migration_v7_trust.sql    # Trust score system; tokens deprecated
├── docs/                      # This folder
├── tests/                     # Playwright E2E tests
│   ├── helpers/mock-supabase.js
│   ├── auth.spec.js
│   ├── feed.spec.js
│   ├── plans.spec.js
│   └── notifications.spec.js
└── src/
    ├── main.jsx               # Entry: Sentry init, service worker registration, Google Maps loader
    ├── App.jsx                # Router: lazy routes + ErrorBoundary + Suspense skeletons
    ├── theme.js               # Design tokens (colors, radii, fonts)
    ├── index.css              # Global reset + font-face
    ├── constants/
    │   └── categories.js      # Plan category list with icon + label
    ├── lib/
    │   ├── supabase.js        # createClient singleton; toast helpers
    │   ├── trust.js           # getTrustScore / getActivityScore / getSocialScore / getRecentPlans
    │   ├── tokens.js          # getTokenBalance / getTokenHistory / subscribeToBalance (legacy)
    │   ├── dates.js           # Date formatting + locale helpers
    │   └── ids.js             # genId() — random 10-char alphanumeric ID for plan rows
    ├── hooks/
    │   ├── useAuth.js         # Session + profile (single source of truth)
    │   ├── useNotifications.js# Realtime notification feed + unread count
    │   ├── usePlanDetail.js   # Load + all action handlers for a single plan
    │   ├── useTokens.js       # Token balance + history (legacy, pre-trust)
    │   └── useTrust.js        # Local trust score hook
    ├── components/
    │   ├── Layout.jsx         # Sticky header + bottom tab nav (3 tabs)
    │   ├── ProtectedRoute.jsx # Auth guard; redirects to /login or /onboarding
    │   ├── ErrorBoundary.jsx  # Class component; reports to Sentry; "Try again" reset
    │   ├── PlanCard.jsx       # Compact plan card for lists (MyPlans, Feed list rows)
    │   ├── Icons.jsx          # SVG icons + AVATAR_COLORS palette
    │   ├── PlaceInput.jsx     # Google Places autocomplete (lazy-loads Maps SDK)
    │   ├── DatePicker.jsx     # Custom calendar date picker
    │   ├── TimePicker.jsx     # Custom clock time picker
    │   ├── TokenHistory.jsx   # Token ledger display (Wallet page)
    │   ├── plan/              # PlanDetail sub-components
    │   │   ├── PlanHeader.jsx     # Title, category, organizer, info grid
    │   │   ├── PlanActions.jsx    # Join/leave/cancel/checkout/copy-link
    │   │   ├── PlanAttendees.jsx  # Pending requests + Going list
    │   │   └── PlanComments.jsx   # Stub (messages table exists; UI not built yet)
    │   └── skeletons/
    │       ├── Skeleton.jsx           # SkeletonBlock + SkeletonText primitives
    │       ├── FeedSkeleton.jsx
    │       ├── PlanDetailSkeleton.jsx
    │       ├── ProfileSkeleton.jsx
    │       └── NotificationsSkeleton.jsx
    └── pages/
        ├── Feed.jsx           # Landing (unauthed) + plan discovery (authed)
        ├── Login.jsx          # Email/password sign in
        ├── Signup.jsx         # Email/password sign up + shared AuthShell
        ├── Verify.jsx         # Post-signup email verification notice
        ├── Onboarding.jsx     # First-run profile setup (username, age, gender)
        ├── Welcome.jsx        # Welcome screen after onboarding
        ├── CreatePlan.jsx     # Plan creation form
        ├── PlanDetail.jsx     # Plan detail page (thin orchestrator)
        ├── MyPlans.jsx        # Created + joined plans tabs
        ├── Profile.jsx        # Trust score, stats, edit profile, sign out
        ├── Notifications.jsx  # Notification feed
        └── Wallet.jsx         # Token balance + history (legacy)
```

---

## Auth flow

```
User lands on any page
        │
        ▼
useAuth() → db.auth.getSession()
        │
   no session ──→ ProtectedRoute redirects to /login
        │
   has session
        │
        ▼
loadProfile(user.id) → db.from('profiles').select('*')
        │
   profile missing ──→ needsOnboarding = true
        │                 ProtectedRoute redirects to /onboarding
   profile exists
        │
        ▼
   App renders normally
```

**Key implementation details:**

- `useAuth` (`src/hooks/useAuth.js`) is the single source of truth. It calls `db.auth.getSession()` once on mount, then subscribes to `db.auth.onAuthStateChange()` to stay in sync across tabs.
- `ProtectedRoute` (`src/components/ProtectedRoute.jsx`) wraps all routes that require authentication. It shows a centred ellipsis while `loading === true`, then redirects to `/login` (no user) or `/onboarding` (user exists but profile missing), passing the original `location` as state so the user returns after auth.
- The `requireProfile={false}` prop is used on `/onboarding` itself so the redirect doesn't loop.
- Supabase is configured with **PKCE flow** (`flowType: 'pkce'`), `autoRefreshToken: true`, and `persistSession: true` — sessions survive page reloads via localStorage.
- Sign-out is a single call to `db.auth.signOut()`, which clears the local session and triggers `onAuthStateChange` with `null`.

---

## Data flow

### Reading data

Pages and hooks call Supabase directly via the `db` singleton from `src/lib/supabase.js`. There is no Redux, no Zustand, no React Query — state lives in component-level `useState` / custom hooks.

```
Component / hook
  → db.from('plans').select('*').eq(...)
  → Supabase REST API (HTTP)
  → setState(data)
```

### Mutations

All writes go through `db.from(table).insert/update/delete` or `db.rpc(functionName, params)`. Complex operations (join, leave, cancel, checkout, reject) use **PostgreSQL functions with `SECURITY DEFINER`** so the business logic and RLS enforcement live in the database, not the client.

### Realtime

Two features use Supabase Realtime (WebSocket / Postgres Changes):

1. **Notifications** (`useNotifications.js`): subscribes to `INSERT` on the `notifications` table filtered by `user_id`. New notifications appear instantly without polling.
2. **Token balance** (`useTokens.js`): subscribes to `INSERT` on `tokens_ledger` filtered by `user_id` (legacy; still active on the Wallet page).

Channels are named with a timestamp suffix (`notif:{userId}:{Date.now()}`) to avoid stale subscriptions from previous mounts.

### Trust system

Trust is calculated server-side by three PostgreSQL functions (`trust_score`, `activity_score`, `social_score` in migration_v7) and exposed via `db.rpc()`. The `formatTrust(score)` helper in `src/lib/trust.js` converts `-1` → `"New"` and `0–100` → `"XX%"`.

---

## Build and deploy

### Local dev

```bash
npm run dev   # Vite dev server on http://localhost:5173
```

Vite reads `VITE_*` environment variables from `.env.local` (create from `.env.example`).

### Production build

```bash
npm run build   # outputs to dist/
```

Vite tree-shakes, bundles, and code-splits per route (all pages are `React.lazy`). The output is a standard static SPA.

### Vercel deployment

- **Framework**: Static (SPA). `vercel.json` configures a catch-all rewrite (`/(.*) → /index.html`) for client-side routing.
- **CSP**: `vercel.json` also sets a strict `Content-Security-Policy` header allowing only `self`, Google Maps/Fonts, the Supabase project, and Sentry ingest.
- **Additional headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

---

## PWA

The app is installable on mobile:

- **`public/manifest.json`**: declares `name: "queda."`, `short_name: "queda"`, standalone display, portrait orientation, `theme_color: #CDFF6C` (accent green).
- **`public/sw.js`** (service worker, registered in `main.jsx`): cache-first strategy for static assets (icons, manifest, og image). JS bundles, HTML, API calls, and external CDN resources are explicitly excluded — they always go to the network.
- SW cache version is `queda-v7`. Old caches are deleted on `activate`.

---

## Error tracking

Sentry is initialised in `src/main.jsx` **only in production** (`import.meta.env.PROD`) and only if `VITE_SENTRY_DSN` is set. Performance monitoring and session replay are disabled (privacy + bundle size).

A top-level `<Sentry.ErrorBoundary>` in `main.jsx` catches root-level crashes. Each route additionally has its own `<ErrorBoundary>` (the custom class component in `src/components/ErrorBoundary.jsx`) which calls `window.Sentry?.captureException()` and shows a "Try again" reset button scoped to that route.
