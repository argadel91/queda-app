# Supabase Schema

Auto-generated from the SQL migrations in `sql/`. Each migration builds on the previous one — read them in order. Migrations are idempotent (use `IF NOT EXISTS`, `DROP … IF EXISTS`, and `OR REPLACE`).

The current live schema is the **cumulative result of all migrations v2 through v7**.

---

## migration_v2.sql — Baseline schema

**Purpose:** Establishes the core tables after discarding the v1 prototype (messages, plans_v1, responses). Introduces a flat-schema `plans` table, social profile fields, in-plan chat, and a capacity-safe join function.

### Tables added / modified

#### `profiles` (modified from v1)

New columns added via `ALTER TABLE … ADD COLUMN IF NOT EXISTS`:

| Column | Type | Notes |
|---|---|---|
| `bio` | TEXT | Optional user bio |
| `photo_url` | TEXT | Avatar URL (not currently used in frontend) |
| `birthdate` | DATE | Used to calculate display age |
| `gender` | TEXT CHECK | `male`, `female`, `non-binary`, `other`, `prefer_not_to_say` |
| `interests` | TEXT[] | Array of interest tags (not used in current UI) |
| `lat` / `lng` | DOUBLE PRECISION | User's last known location (not exposed in UI) |
| `city` | TEXT | City name shown in Feed header |
| `created_at` | TIMESTAMPTZ | Default: `now()` |

**Indexes:**
- `idx_profiles_username` — btree on `username`
- `idx_profiles_interests` — GIN on `interests` array

**RLS:**
- SELECT: any `authenticated` user can read any profile
- INSERT / UPDATE: own row only (`auth.uid() = id`)

#### `plans`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | App-generated 10-char alphanumeric (via `genId()`) |
| `user_id` | UUID FK → `auth.users` | Organizer |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | Optional |
| `category` | TEXT NOT NULL | One of the CATEGORIES constants |
| `place_name` | TEXT NOT NULL | Display name of the venue |
| `place_address` | TEXT | Full address |
| `lat` / `lng` | DOUBLE PRECISION NOT NULL | Used for map features (future) |
| `date` | DATE NOT NULL | |
| `time` | TIME NOT NULL | |
| `capacity` | INT NOT NULL | CHECK: 2–20 |
| `join_mode` | TEXT NOT NULL | `open`, `closed` (v2); extended to `approval`, `private` in v3 |
| `status` | TEXT NOT NULL | `active`, `full`, `cancelled`, `past` |
| `created_at` | TIMESTAMPTZ | Default: `now()` |

**Indexes:** `date`, `status`, `category`, `user_id`, `(lat, lng)`, `created_at DESC`

**RLS:**
- SELECT: any `authenticated` user
- INSERT: `auth.uid() = user_id`
- UPDATE / DELETE: `auth.uid() = user_id`

⚠️ **RLS note**: The SELECT policy allows any authenticated user to read any plan, including cancelled and past ones. If plans ever contain sensitive organizer info that should be hidden from non-participants, this needs tightening.

#### `plan_participants`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `plan_id` | TEXT FK → `plans` | |
| `user_id` | UUID FK → `auth.users` | |
| `status` | TEXT NOT NULL | `joined`, `pending`, `rejected` |
| `created_at` | TIMESTAMPTZ | |

Unique constraint on `(plan_id, user_id)`.

**Indexes:** `plan_id`, `user_id`, `status`

**RLS:**
- SELECT: own participation OR organizer of the plan
- INSERT: `auth.uid() = user_id` (anyone can request to join)
- DELETE: `auth.uid() = user_id` (leave)
- UPDATE: own row OR organizer of the plan (for approve/reject)

#### `messages` (in-plan chat)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `plan_id` | TEXT FK → `plans` | |
| `user_id` | UUID FK → `auth.users` | |
| `content` | TEXT NOT NULL | Max 2000 chars |
| `created_at` | TIMESTAMPTZ | |

**Index:** `(plan_id, created_at)`

**RLS:** Only joined participants + organizer can SELECT or INSERT. No UPDATE/DELETE policy — messages are immutable.

⚠️ **Note**: The messages table exists but the UI has no chat feature. `PlanComments.jsx` is a stub.

### Functions added

| Function | Description |
|---|---|
| `delete_plan(p_plan_id TEXT)` | Deletes a plan if the caller is the organizer |
| `plan_joined_count(p_plan_id TEXT)` | Returns count of `joined` participants |
| `join_plan(p_plan_id, p_user_id, p_status)` | Safe join with row-level lock and capacity check |

---

## migration_v3_tokens.sql — Token economy

**Purpose:** Adds a token-based participation economy. Users earn/spend tokens for creating plans, joining, attending, and inviting friends. The complex multi-tier system was later simplified in v4.

### Tables added / modified

#### `profiles` (modified)

| Column | Type | Notes |
|---|---|---|
| `token_balance` | INT NOT NULL DEFAULT 6 | Cap: 0–21 (v3); changed to 0–12 in v4 |
| `phone_number` | TEXT UNIQUE | Not used in current UI |
| `phone_verified` | BOOLEAN DEFAULT FALSE | Not used in current UI |
| `passport_mode_until` | TIMESTAMPTZ | Not used in current UI |
| `last_weekly_regen_at` | TIMESTAMPTZ | For the (now-removed) weekly regen cron |

#### `plans` (modified)

| Column | Type | Notes |
|---|---|---|
| `gender_filter` | TEXT DEFAULT `'mixed'` | `male`, `female`, `mixed` |
| `cancellation_deadline_hours` | INT DEFAULT 24 | Hours before plan when late-cancel penalty kicks in |
| `checked_out_at` | TIMESTAMPTZ | Set by `process_plan_checkout` |
| `auto_checked_out` | BOOLEAN DEFAULT FALSE | Set when 48h auto-checkout fires |

Also extends `join_mode` CHECK: adds `approval` and `private` (was just `open`/`closed`).

#### `plan_participants` (modified)

| Column | Type | Notes |
|---|---|---|
| `attended` | BOOLEAN | Set during checkout |
| `thumbs_up` | BOOLEAN DEFAULT TRUE | Removed in v4 (not used in v7) |
| `deposit_resolved` | BOOLEAN DEFAULT FALSE | True once token logic has run for this participant |

#### `tokens_ledger` (new)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `auth.users` | |
| `amount` | INT NOT NULL | Positive = credit, negative = debit |
| `reason` | TEXT NOT NULL | Audit label (e.g., `join_plan_deposit`, `attended_refund`) |
| `related_plan_id` | TEXT FK → `plans` ON DELETE SET NULL | |
| `related_user_id` | UUID FK → `auth.users` | For invite bonuses |
| `balance_after` | INT NOT NULL | Snapshot after the transaction |
| `created_at` | TIMESTAMPTZ NOT NULL | |

**Indexes:** `(user_id, created_at DESC)`, `related_plan_id`, `reason`

**RLS:** Users can SELECT their own rows only. No INSERT/UPDATE/DELETE — only `SECURITY DEFINER` functions write to this table.

#### `user_interactions` (new)

Silent tracking table for future ML/recommendation use. Records `view`, `apply`, `join`, `attend` events. **Not currently used by any frontend feature.**

**Indexes:** `(user_id, created_at DESC)`, `(user_id, category)`

**RLS:** Own rows for SELECT; own rows for INSERT.

### Functions added

| Function | Description |
|---|---|
| `_apply_token_delta(...)` | Internal atomic balance change + ledger insert |
| `deduct_tokens(...)` | Public wrapper for debit |
| `add_tokens(...)` | Public wrapper for credit |
| `join_plan_with_deposit(...)` | Join with 2-token deposit (v3), changed to 1 token in v4 |
| `organizer_create_deposit(...)` | 2-token deposit to create (later changed to free in v4) |
| `cancel_plan(...)` | Refund attendees; late cancellation costs organizer deposit |
| `leave_plan(...)` | Refund if before deadline; lose deposit if late |
| `process_plan_checkout(...)` | Distribute tokens after plan execution |
| `process_auto_checkouts()` | Cron: auto-checkout plans 48h past start |
| `process_weekly_regen()` | Cron: give 1 token/week to users at ≤1 (removed in v4) |
| `credit_invite_bonus(...)` | +2 tokens for successful invite (removed in v4) |
| `log_signup_balance()` trigger | Records signup ledger entry on profile INSERT |

---

## migration_v4_simplify.sql — Simplified token model

**Purpose:** Replaces the v3 complex token economy with a simpler 1-token model. Cap reduced from 21 to 12. Create plan is free. No thumbs, no tiers, no weekly regen.

**New rules (v4):**
- Signup: 6 tokens (unchanged)
- Join plan: −1 deposit
- Attend: +1 refund
- No-show: lose the 1 token
- Create plan: free (0 tokens)
- Plan executes (≥1 attendee): +1 to organizer

### Changes

- `profiles.token_balance` CHECK updated to 0–12
- `plan_participants.thumbs_up` made nullable (de-facto removed)
- `_apply_token_delta` rewritten with cap of 12
- `join_plan_with_deposit`: now deducts 1 token (was 2)
- `organizer_create_deposit`: now logs a 0-amount entry (free to create)
- `cancel_plan`: refunds 1 token per joined participant (no timing penalty)
- `leave_plan`: refunds 1 token if before deadline
- `process_plan_checkout`: simplified (no thumbs, no tiers)
- `process_weekly_regen` and `credit_invite_bonus` dropped

---

## migration_v4b_reject.sql — Reject join request

**Purpose:** Adds the `reject_join_request` function, which was missing from v4.

### Function added

```
reject_join_request(p_plan_id TEXT, p_organizer_id UUID, p_user_id UUID)
```

Validates the organizer, checks for a pending request, refunds 1 token to the rejected user, and sets their status to `rejected`.

⚠️ **Note**: This version refunds a token on rejection. In v7 (trust system), this function is rewritten with **no token refund** since tokens are deprecated.

---

## migration_v5_notifications.sql — In-app notifications

**Purpose:** Adds an in-app notification system with database triggers that fire automatically on plan events.

### Tables added

#### `notifications`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `auth.users` | Recipient |
| `type` | TEXT NOT NULL | `join`, `request`, `approved`, `rejected`, `cancelled`, `reminder`, `checkout_reminder` |
| `title` | TEXT NOT NULL | Short notification text |
| `body` | TEXT | Optional plan title for context |
| `plan_id` | TEXT FK → `plans` ON DELETE CASCADE | |
| `read` | BOOLEAN DEFAULT FALSE | |
| `created_at` | TIMESTAMPTZ NOT NULL | |

**Indexes:**
- `(user_id, created_at DESC)`
- `(user_id) WHERE read = FALSE` — partial index for fast unread count queries

**RLS:**
- SELECT: own rows
- UPDATE: own rows (mark as read)
- No INSERT policy: only triggers write notifications

⚠️ **RLS note**: There is no DELETE policy. Old notifications accumulate indefinitely. A cleanup cron or a user "clear all" delete policy would be useful.

### Triggers added

| Trigger | On table | Event | Fires |
|---|---|---|---|
| `trg_notify_on_join` | `plan_participants` | AFTER INSERT | Notifies organizer when someone joins or requests |
| `trg_notify_on_approval` | `plan_participants` | AFTER UPDATE | Notifies participant when approved/rejected |
| `trg_notify_on_cancel` | `plans` | AFTER UPDATE | Notifies all joined participants when plan is cancelled |

### Functions added (cron targets)

| Function | Schedule | Description |
|---|---|---|
| `notify_plans_tomorrow()` | Daily at 20:00 UTC | Sends "your plan is tomorrow" reminders |
| `notify_checkout_reminder()` | Hourly (same as auto-checkout) | Reminds organizer to check out 2–4h after plan start |

### Profiles modified

Added `push_subscription JSONB` column for future Web Push support (not currently wired up in the frontend).

---

## migration_v6_private.sql — Private plans always require approval

**Purpose:** Single-function patch. Rewrites `join_plan_with_deposit` so that private plans (`join_mode = 'private'`) always set status to `pending`, regardless of other join_mode settings.

No schema changes — only `join_plan_with_deposit` is replaced.

---

## migration_v7_trust.sql — Trust system (current)

**Purpose:** Replaces the token economy with a trust score system. Tokens are **deprecated** (tables and functions left intact but unused). Plans are now free to join. Trust is calculated from attendance history.

### Tables modified

#### `plans` (new columns)

| Column | Type | Notes |
|---|---|---|
| `min_trust` | INT DEFAULT 0 | CHECK: must be one of `0, 70, 80, 90` |
| `min_attendees` | INT DEFAULT 2 | Minimum attendees for the plan to be considered executed |
| `cancel_reason` | TEXT | Optional organizer-provided reason on cancel |
| `trust_penalized` | BOOLEAN DEFAULT FALSE | True if cancel was late enough + enough attendees to count against trust |

### Functions added / replaced

#### `trust_score(p_user_id UUID) → INT`

Returns 0–100 representing the user's reliability percentage, or **-1** if the user has fewer than 3 tracked commitments ("New" user — not penalised by trust requirements).

Formula:
```
(attended_plans + organizer_plans_executed) /
(total_attended + total_organized + cancelled_with_penalty) × 100
```

Rounds to nearest integer. Clamped to 0–100.

#### `activity_score(p_user_id UUID) → INT`

Total count of plans the user has attended **as participant** + plans they **organised and executed** (not auto-checked-out).

#### `social_score(p_user_id UUID) → INT`

Count of invites the user sent that led to completed signups. Gracefully returns 0 if the `invitations` table doesn't exist (the table is not created by any migration — future feature).

#### `join_plan_free(p_plan_id TEXT, p_user_id UUID)`

Replaces `join_plan_with_deposit`. Free join (no tokens). Checks:
1. Plan exists and is `active`
2. User is not the organizer
3. User doesn't already have a `joined` or `pending` row
4. Plan is not full
5. If `min_trust > 0`: user's trust score must meet the threshold (new users with score = -1 are **always allowed**)

Sets status to `joined` or `pending` depending on `join_mode`.

#### `process_plan_checkout(...)` (simplified)

No token movements. Auto-checkout sets `attended = true` for all joined participants (benefit of doubt). Manual checkout marks `deposit_resolved = true` after the organizer records attendance.

#### `cancel_plan(...)` (trust-aware)

Sets `trust_penalized = true` if: the plan had enough joined participants (`>= min_attendees`) AND the organizer cancelled after the deadline. This flag feeds into `trust_score`.

#### `leave_plan(...)` (simplified)

Simply **deletes** the participant row. No token handling.

#### `reject_join_request(...)` (simplified)

Updates status to `rejected`. **No token refund** (tokens deprecated).

---

## Summary of current schema (v7 cumulative)

### Tables

| Table | Purpose |
|---|---|
| `profiles` | User accounts with trust/token/location data |
| `plans` | Plan events with status, capacity, join mode, trust threshold |
| `plan_participants` | Many-to-many join between users and plans; tracks attendance |
| `messages` | In-plan chat (DB ready; UI not built) |
| `tokens_ledger` | Token transaction history (legacy; tokens deprecated in v7) |
| `user_interactions` | Implicit event tracking (not used in current UI) |
| `notifications` | In-app notification feed with trigger-generated rows |

### Active RPC functions (called from the frontend)

| Function | Called from |
|---|---|
| `join_plan_free` | PlanDetail → join button |
| `leave_plan` | PlanDetail → leave / withdraw button |
| `cancel_plan` | PlanDetail → cancel button (organizer) |
| `reject_join_request` | PlanDetail → reject pending request (organizer) |
| `process_plan_checkout` | PlanDetail → finalise button (organizer) |
| `trust_score` | PlanDetail (organizer trust display), Profile |
| `activity_score` | Profile |
| `social_score` | Profile |

### Scheduled cron functions (run manually or via pg_cron)

| Function | Suggested schedule |
|---|---|
| `process_auto_checkouts()` | Hourly |
| `notify_plans_tomorrow()` | Daily at 20:00 UTC |
| `notify_checkout_reminder()` | Hourly |

The `mark-past-plans` cron from v2 (`UPDATE plans SET status = 'past' WHERE date < CURRENT_DATE`) should also be scheduled.
