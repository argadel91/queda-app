# queda.

Group plans, zero chaos. One date, one time, one place — everyone votes.

## What is this?

**queda.** is a web app for organizing group plans. The organizer creates a plan with a date, time, and place. Invitees vote on whether they can make it, propose alternative times, and confirm their attendance — all from a single shareable link.

### Key features

- **One plan = one decision.** No endless polls. One date, one time, one place.
- **Inline voting.** Invitees vote directly from the plan view — no separate forms.
- **Smart availability.** If someone can't make the time, they share their availability range. The app finds the best overlap.
- **Meeting points.** Set a meeting point before the venue with calculated arrival times.
- **Tolerance.** Organizer sets how late people can arrive. Invitees indicate if they'll be late.
- **Deadline.** Set a deadline for responses with live countdown.
- **6 languages.** Spanish, English, Portuguese, French, German, Italian.
- **Dark/light mode.** System-aware with manual toggle.
- **PWA.** Installable on mobile, works offline for viewing.
- **Screenshot export.** Download the final plan as an image.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + React Router 7 |
| Build | Vite 5 |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Maps | Google Maps + Places API |
| Deploy | Vercel |
| Testing | Playwright |
| Screenshots | html2canvas |

## Setup from scratch

### Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project
- A [Google Cloud](https://console.cloud.google.com) project with Maps JavaScript API + Places API enabled
- (Optional) [Vercel](https://vercel.com) account for deployment

### 1. Clone and install

```bash
git clone https://github.com/argadel91/queda-app.git
cd queda-app
npm install
```

### 2. Environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

| Variable | Where to get it |
|----------|----------------|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_KEY` | Supabase → Settings → API → anon public key |
| `VITE_GOOGLE_MAPS_KEY` | Google Cloud Console → Credentials → API key |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string |
| `VERCEL_TOKEN` | Vercel → Settings → Tokens |

### 3. Database setup

In the Supabase SQL editor, create the required tables:

```sql
-- Plans
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Responses
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  username TEXT UNIQUE,
  email TEXT,
  lang TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User-plan membership
CREATE TABLE user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'invited',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, plan_id)
);

-- Indexes
CREATE INDEX idx_responses_plan_id ON responses(plan_id);
CREATE INDEX idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX idx_user_plans_plan_id ON user_plans(plan_id);
```

Then enable Row Level Security (RLS) on all tables and add appropriate policies. See `sql/security_indexes_cascades.sql` for cascade constraints.

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:5173

### 5. Build for production

```bash
npm run build
npm run preview  # preview the build locally
```

### 6. Deploy to Vercel

```bash
npx vercel deploy --prod
```

Or connect the GitHub repo to Vercel for automatic deploys on push.

## Project structure

```
queda-app/
├── src/
│   ├── pages/                    # Route pages
│   │   ├── Home.jsx              # Dashboard + join by code
│   │   ├── Landing.jsx           # Hero page for unauthenticated users
│   │   ├── AuthScreen.jsx        # Login / signup / password reset
│   │   ├── Create.jsx            # Plan creation wizard (4 steps)
│   │   ├── Results.jsx           # Plan view — layout, header, modals
│   │   ├── MyPlans.jsx           # User's plan list
│   │   ├── Profile.jsx           # User settings
│   │   └── ResetPasswordScreen.jsx
│   │
│   ├── components/               # Reusable UI
│   │   ├── tabs/                 # Tab sub-components for Results
│   │   │   ├── PlanTab.jsx       # Plan view + inline voting
│   │   │   ├── VoteTab.jsx       # Vote aggregation + availability bars
│   │   │   ├── ResultTab.jsx     # Final summary + screenshot
│   │   │   └── MoreTab.jsx       # Share, comments, transport, history
│   │   ├── ResultsContext.jsx    # Shared state for Results + tabs
│   │   ├── Countdown.jsx         # Isolated deadline countdown timer
│   │   ├── CalendarPicker.jsx    # Multi-date calendar selector
│   │   ├── ClockPicker.jsx       # Circular time picker
│   │   ├── RouteMap.jsx          # Google Maps with markers + route
│   │   ├── MapModal.jsx          # Place search modal
│   │   ├── VenueInfo.jsx         # Venue details card
│   │   ├── CityInput.jsx         # City autocomplete
│   │   ├── PostPlanSurvey.jsx    # Post-event feedback
│   │   ├── ErrorBoundary.jsx     # Error fallback UI
│   │   └── ui.jsx                # Btn, Inp, Txa, Card, Back, etc.
│   │
│   ├── lib/                      # Business logic
│   │   ├── supabase.js           # DB client + CRUD operations
│   │   ├── auth.js               # Auth functions
│   │   ├── storage.js            # LocalStorage + sync
│   │   ├── utils.js              # Date formatting, ID generation
│   │   └── ics.js                # Calendar export (.ics)
│   │
│   ├── constants/                # Config
│   │   ├── translations.js       # i18n (6 languages)
│   │   ├── theme.js              # Dark/light color schemes
│   │   └── weather.js            # City timezone mapping
│   │
│   ├── App.jsx                   # Router + auth + layout
│   ├── main.jsx                  # Entry point + Google Maps loader
│   └── index.css                 # Global styles + animations
│
├── public/                       # Static assets
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker
│   ├── icon-192.svg / icon-512.svg
│   └── og.png                    # Social preview image
│
├── sql/                          # Database migrations
│   └── security_indexes_cascades.sql
│
├── tests/                        # E2E tests
│   └── app.spec.js
│
├── vercel.json                   # Deploy config + CSP headers
├── vite.config.js                # Build config
└── package.json
```

## Routes

| URL | Page | Description |
|-----|------|-------------|
| `/` | Home | Dashboard, join by code |
| `/create` | Create | Plan wizard (date → time → place → confirm) |
| `/create/:step` | Create | Direct step access (date, time, place, confirm) |
| `/plans` | MyPlans | User's plan list |
| `/plan/:code` | Results | View/vote/manage a plan |
| `/profile` | Profile | User settings |

## Data model

The plan object is stored as JSONB. Key fields:

```
dates[]         — source of truth for scheduling
startTimes[]    — source of truth for time options
dateTimes{}     — independent hours per date
stops[]         — all point details (venue, meeting point, tolerance, capacity)
date, time      — shortcuts for dates[0], startTimes[0]
place           — shortcut for stops[0].options[0]
```

## License

Private. All rights reserved.
