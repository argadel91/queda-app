# SQL Migration Review

Reviewed: migrations v2 through v7 in `sql/`. Each section covers tables/columns affected,
RLS policy soundness, missing indexes, naming consistency, and anything destructive or risky.
Recommendations are implemented non-destructively in `sql/v8_improvements.sql`.

---

## migration_v2.sql

### Tables / columns affected
- `profiles`: adds `bio`, `photo_url`, `birthdate`, `gender`, `interests`, `lat`, `lng`, `city`, `created_at`
- `plans`: new table (flat schema)
- `plan_participants`: new table
- `messages`: new table (in-plan chat)

### RLS soundness

| Policy | Assessment |
|---|---|
| `profiles` SELECT: "authenticated can read any profile" | **Sound** — public profile data is intentional. |
| `profiles` INSERT: `auth.uid() = id` | **Sound** |
| `profiles` UPDATE: `auth.uid() = id` | **Sound** |
| `plans` SELECT: "authenticated can read active plans" — name says "active" but policy has no status filter | **⚠️ Misleading name** — all authenticated users can read plans of any status (active, cancelled, past). This may be intentional (need to see past plans for history), but the policy name is deceptive. |
| `plan_participants` SELECT: own participation OR organizer | **Sound** |
| `plan_participants` INSERT: `auth.uid() = user_id` | **Sound** — prevents joining as someone else |
| `plan_participants` DELETE: `auth.uid() = user_id` | **Sound** |
| `plan_participants` UPDATE: own OR organizer | **Sound** |
| `messages` SELECT: joined participants OR organizer | **Sound** |
| `messages` INSERT: same check | **Sound** |
| `messages`: no DELETE or UPDATE policy | **⚠️ Gap** — messages are immutable (no edit/delete), which may be intentional but is not documented. |

### Indexes

Existing indexes on `plans` are comprehensive. However:

- **`plan_participants`**: `idx_pp_plan_id` (plan_id), `idx_pp_user_id` (user_id), `idx_pp_status` (status) are present. A composite index on `(plan_id, status)` would accelerate the common query `WHERE plan_id = ? AND status = 'joined'` better than separate indexes. **Flagged for v8.**
- **`messages`**: `(plan_id, created_at)` composite index exists — good.

### Naming

- Consistent snake_case throughout.
- Index names follow `idx_{table_abbrev}_{columns}` pattern — consistent.
- The `join_mode` CHECK constraint allows `'open'` and `'closed'`; v3 adds `'approval'` and `'private'`. The v2 function `join_plan()` is fully superseded by v7's `join_plan_free()` — dead code, but harmless.

### Destructive / risky

- `DROP TABLE IF EXISTS responses_v1, user_plans_v1, plans_v1, responses, user_plans CASCADE` — intentionally drops v1 tables. Risky if v1 data was not backed up, but not relevant to current state.

---

## migration_v3_tokens.sql

### Tables / columns affected
- `profiles`: `token_balance`, `phone_number`, `phone_verified`, `passport_mode_until`, `last_weekly_regen_at`
- `plans`: `gender_filter`, `cancellation_deadline_hours`, `checked_out_at`, `auto_checked_out`
- `plan_participants`: `attended`, `thumbs_up`, `deposit_resolved`
- `tokens_ledger`: new table
- `user_interactions`: new table

### RLS soundness

| Policy | Assessment |
|---|---|
| `tokens_ledger` SELECT: own rows | **Sound** |
| `tokens_ledger`: no INSERT/UPDATE/DELETE | **Sound** — written only by SECURITY DEFINER functions |
| `user_interactions` SELECT/INSERT: own rows | **Sound** |

### Indexes

- `tokens_ledger`: `(user_id, created_at DESC)`, `related_plan_id`, `reason` — adequate.
- `user_interactions`: `(user_id, created_at DESC)`, `(user_id, category)` — adequate.
- **Missing**: `tokens_ledger(related_plan_id)` is created but there's no index on `balance_after` — not needed since no query filters on that column.

### Naming

- Consistent. The internal helper `_apply_token_delta` follows the `_private_function` convention.
- `thumbs_up` is introduced here and immediately de-facto removed in v4 — minor technical debt.

### Destructive / risky

- `ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_join_mode_check` before re-adding it — safe (idempotent).
- The `v3` token deposit amounts (2 tokens) are superseded in v4 — code that still references `join_plan_with_deposit` in the wrong migration sequence would apply the wrong amounts.

---

## migration_v4_simplify.sql

### Tables / columns affected
- `profiles`: CHECK constraint changed from 0–21 to 0–12; `last_weekly_regen_at` column still exists but unused
- `plan_participants`: `thumbs_up` made nullable/default NULL (de-facto removed)

### RLS soundness

No new tables or policies. Existing policies unchanged — still sound.

### Indexes

No new indexes added. No gaps introduced.

### Naming

- Functions rewritten in-place (`OR REPLACE`) — good idempotency.
- `organizer_create_deposit` is kept but now does nothing (free plan creation) — slightly misleading name. Not changed in v7 either.

### Destructive / risky

- `UPDATE profiles SET token_balance = 12 WHERE token_balance > 12` — modifies production data; safe (clamping) but irreversible.
- Drops `process_weekly_regen()` and `credit_invite_bonus()` — **destructive**: if anything calls these functions, it will error after this migration. Not a concern if applied in order, but worth noting.

---

## migration_v4b_reject.sql

### Tables / columns affected

None — function only.

### RLS soundness

The `reject_join_request` function uses `SECURITY DEFINER` and validates `v_plan.user_id = p_organizer_id`. Sound.

### Indexes

None needed.

### Naming

Consistent with the rest of the codebase.

### Destructive / risky

None. Pure `CREATE OR REPLACE FUNCTION`.

---

## migration_v5_notifications.sql

### Tables / columns affected
- `notifications`: new table
- `profiles`: adds `push_subscription JSONB` (unused in current UI)

### RLS soundness

| Policy | Assessment |
|---|---|
| `notifications` SELECT: own rows | **Sound** |
| `notifications` UPDATE: own rows | **Sound** — for marking read |
| No INSERT policy | **Sound** — inserts come only from triggers |
| **No DELETE policy** | **⚠️ Gap** — notifications accumulate forever. Users cannot clear their own notifications, and there is no cleanup cron. Recommend adding a DELETE policy so users can clear their own notifications, or a periodic cron that deletes read notifications older than 30 days. |

### Indexes

- `(user_id, created_at DESC)` — good for the main feed query.
- `(user_id) WHERE read = FALSE` — **excellent** partial index; efficiently powers the unread count badge.
- **Missing**: No index on `plan_id`. The trigger `notify_on_cancel` runs a SELECT on `plan_participants WHERE plan_id = ?` (separate table), but the `ON DELETE CASCADE` on `notifications.plan_id` will do a full table scan to find rows to delete when a plan is deleted. An index on `notifications(plan_id)` would help. **Flagged for v8.**

### Naming

Trigger and function names follow `trg_/notify_` patterns consistently.

### Destructive / risky

- Triggers use `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` — idempotent.

---

## migration_v6_private.sql

### Tables / columns affected

None — function replacement only.

### RLS soundness

The change (private plans → always `pending`) is correctly implemented in the function. RLS unchanged.

### Indexes

None needed.

### Naming

Consistent.

### Destructive / risky

Replaces `join_plan_with_deposit` in-place. If v5 is not applied first, the function being replaced doesn't exist yet — minor ordering risk, but harmless since `CREATE OR REPLACE` creates it if missing.

---

## migration_v7_trust.sql

### Tables / columns affected
- `plans`: adds `min_trust`, `min_attendees`, `cancel_reason`, `trust_penalized`

### RLS soundness

No new tables or policies. Existing policies unchanged — still sound.

New functions use `SECURITY DEFINER` consistently and validate callers where appropriate.

**⚠️ Gap in `trust_score`**: The `org_fail` subquery counts plans where `trust_penalized = true`. This flag is set only by the new `cancel_plan` function (v7). Plans cancelled before v7 was applied will have `trust_penalized = FALSE` regardless of timing — existing organizers who cancelled late get a free pass. Not a bug per se (migration docs should note this), but worth knowing.

### Indexes

- **Missing FK index on `plans.user_id`**: Already exists from v2 (`idx_plans_user_id`). ✓
- **Missing index on `plans(trust_penalized)`**: The `trust_score` function filters `WHERE user_id = ? AND status = 'cancelled' AND trust_penalized = true`. Currently resolved via `idx_plans_user_id` + filter scan. A partial index `WHERE trust_penalized = true` would help as the dataset grows. **Flagged for v8.**
- **Missing composite index on `plan_participants(user_id, plan_id, status)`**: The `join_plan_free` function queries `WHERE plan_id = ? AND user_id = ? AND status IN (...)`. The existing separate indexes on `plan_id`, `user_id`, and `status` will be used via index merge, but a composite `(plan_id, user_id)` would be faster. **Flagged for v8.**

### Naming

- `leave_plan` was previously `SECURITY DEFINER` with token logic; v7 rewrites it to a simple DELETE. Consistent naming retained.
- `join_plan_free` introduced alongside legacy `join_plan_with_deposit` — the latter is now dead code but retained for backward compatibility.

### Destructive / risky

- `ALTER TABLE plans ADD COLUMN IF NOT EXISTS trust_penalized BOOLEAN NOT NULL DEFAULT FALSE` — safe; uses DEFAULT FALSE for existing rows.
- `ALTER TABLE plans ADD COLUMN IF NOT EXISTS min_attendees INT NOT NULL DEFAULT 2` — safe; DEFAULT 2 for existing rows.
- No data is modified or dropped.

---

## Cross-cutting observations

### RLS coverage summary

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|---|---|---|---|---|
| `profiles` | ✓ | ✓ | ✓ | ✗ | No delete (Supabase Auth handles user deletion) |
| `plans` | ✓ | ✓ | ✓ | ✓ | SELECT allows all statuses despite name saying "active" |
| `plan_participants` | ✓ | ✓ | ✓ | ✓ | Sound |
| `messages` | ✓ | ✓ | ✗ | ✗ | Intentionally immutable |
| `tokens_ledger` | ✓ | ✗ (DEFINER only) | ✗ | ✗ | Sound |
| `user_interactions` | ✓ | ✓ | ✗ | ✗ | No delete; not actively used |
| `notifications` | ✓ | ✗ (triggers only) | ✓ | ✗ | **Missing DELETE policy** |

### Missing indexes (consolidated)

| Table | Missing index | Reason |
|---|---|---|
| `plan_participants` | `(plan_id, status)` composite | Common filter pattern in queries and RPCs |
| `notifications` | `plan_id` | Needed for ON DELETE CASCADE efficiency |
| `plans` | `(user_id) WHERE trust_penalized = true` | Used in `trust_score` org_fail subquery |

### Naming consistency

All tables and columns are `snake_case`. All functions are `snake_case`. All indexes follow `idx_{short_table}_{columns}`. Constraint names follow `{table}_{column(s)}_check`. Consistent throughout.

### Dead code

- `join_plan()` from v2 — superseded by `join_plan_free()` in v7
- `join_plan_with_deposit()` from v3/v4/v6 — superseded by `join_plan_free()` in v7
- `organizer_create_deposit()` — still called by CreatePlan.jsx? Actually no — CreatePlan.jsx directly inserts into `plans`. This function is dead.
- `plan_joined_count()` from v2 — not called by any current code

None of these cause harm, but they add noise.
