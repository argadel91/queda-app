-- ============================================================
-- Queda v8: Non-destructive improvements
-- ============================================================
-- Run after migration_v7_trust.sql.
-- All changes are additive and safe to apply on a live database:
--   - CREATE INDEX IF NOT EXISTS  (non-blocking for small tables; for large
--     tables consider CREATE INDEX CONCURRENTLY instead)
--   - CREATE POLICY IF NOT EXISTS
--   - Comments only (no data changes, no drops, no renames)
--
-- Review docs/migration-review.md for the full analysis behind each change.
-- ============================================================


-- ============================================================
-- 1. Missing composite index on plan_participants(plan_id, status)
-- ============================================================
-- Rationale: the most common query pattern across RPCs and page loads is
--   WHERE plan_id = ? AND status IN ('joined', 'pending')
-- The existing separate btree indexes on plan_id and status require an index
-- merge. A composite index is faster and avoids the merge step.
--
-- Covers:
--   - join_plan_free()  — duplicate-check query
--   - process_plan_checkout() — iterate joined participants
--   - cancel_plan() — iterate joined participants for notifications
--   - PlanDetail page — plan_participants.select(...).eq(plan_id).in(status)

CREATE INDEX IF NOT EXISTS idx_pp_plan_status
  ON plan_participants(plan_id, status);


-- ============================================================
-- 2. Missing index on notifications(plan_id)
-- ============================================================
-- Rationale: ON DELETE CASCADE on notifications.plan_id requires Postgres to
-- find all notification rows when a plan is deleted. Without an index this is a
-- full-table scan. The partial index on (user_id) WHERE read = FALSE does not
-- help here. A standard btree index on plan_id solves both the cascade lookup
-- and any future "fetch notifications for plan X" queries.

CREATE INDEX IF NOT EXISTS idx_notif_plan_id
  ON notifications(plan_id);


-- ============================================================
-- 3. Partial index on plans(user_id) WHERE trust_penalized = true
-- ============================================================
-- Rationale: trust_score() includes a subquery:
--   SELECT COUNT(*) FROM plans
--   WHERE user_id = ? AND status = 'cancelled' AND trust_penalized = true
-- The existing idx_plans_user_id covers the user_id filter, but Postgres still
-- needs to scan all cancelled plans for that user to check trust_penalized.
-- A partial index pre-filters to only penalized cancellations, which will be a
-- very small fraction of the plans table.

CREATE INDEX IF NOT EXISTS idx_plans_trust_penalized
  ON plans(user_id)
  WHERE trust_penalized = true;


-- ============================================================
-- 4. Missing RLS DELETE policy on notifications
-- ============================================================
-- Rationale: users can currently never delete their own notifications. They
-- accumulate forever with no cleanup path. This policy allows users to delete
-- their own notification rows (e.g., a "Clear all" UI action).
--
-- If you prefer server-side cleanup only (e.g., a cron that deletes read
-- notifications older than 30 days), skip this policy and implement the cron.

CREATE POLICY IF NOT EXISTS "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- 5. Clarify the misleading plan SELECT policy name
-- ============================================================
-- Rationale: the v2 policy is named "Authenticated can read active plans" but
-- the USING clause has no status filter — all statuses are readable. This is
-- likely intentional (users need to see past/cancelled plans for history), but
-- the name is misleading for anyone reading the schema.
--
-- We cannot rename a policy in place. Instead, we drop the old one and recreate
-- it with a clearer name. This is the one operation here that touches existing
-- policy rows — it is still non-destructive to data.
--
-- NOTE: This does cause a brief (millisecond) window where the policy doesn't
-- exist. In practice this is safe, but if you are running on a system with
-- very high concurrency you may prefer to rename via a transaction.

BEGIN;
  DROP POLICY IF EXISTS "Authenticated can read active plans" ON plans;
  CREATE POLICY "Authenticated can read all plans" ON plans
    FOR SELECT USING (auth.role() = 'authenticated');
COMMIT;


-- ============================================================
-- 6. Clarifying comments on key columns
-- ============================================================
-- These are documentation-only; they do not change any behavior.

COMMENT ON COLUMN plans.trust_penalized IS
  'True if the organizer cancelled with >= min_attendees joined and after the cancellation deadline. Feeds into trust_score().';

COMMENT ON COLUMN plans.min_attendees IS
  'Minimum number of joined participants for the plan to count as executed. Below this, cancellation is not trust-penalized.';

COMMENT ON COLUMN plan_participants.deposit_resolved IS
  'True once all token or trust accounting for this participant has been processed at checkout. Prevents double-processing.';

COMMENT ON COLUMN notifications.plan_id IS
  'References the plan this notification is about. ON DELETE CASCADE — notifications are cleaned up when the plan is deleted.';

COMMENT ON TABLE user_interactions IS
  'Silent event log for future ML/recommendation features. Not used by any current UI. INSERT-only from client; no UI reads this table.';

COMMENT ON FUNCTION join_plan_free(TEXT, UUID) IS
  'Current join function (v7). Free — no token deposit. Validates trust score if min_trust > 0. Supersedes join_plan_with_deposit from v3/v4/v6.';

COMMENT ON FUNCTION join_plan_with_deposit(TEXT, UUID) IS
  'LEGACY: superseded by join_plan_free() in v7. Retained to avoid breaking any external callers but should not be used.';

COMMENT ON FUNCTION organizer_create_deposit(UUID, TEXT) IS
  'LEGACY: plan creation is free since v4. This function writes a 0-amount ledger entry for auditability. Not called by any current frontend code.';

COMMENT ON FUNCTION plan_joined_count(TEXT) IS
  'LEGACY: not called by any current code. Use a direct COUNT query with the plan_participants table instead.';


-- ============================================================
-- End of v8_improvements.sql
-- ============================================================
--
-- Suggested follow-up (out of scope for this migration):
--
-- A. Notifications cleanup cron (delete read notifications > 30 days old):
--
--   CREATE OR REPLACE FUNCTION cleanup_old_notifications()
--   RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
--   DECLARE v_count INT;
--   BEGIN
--     DELETE FROM notifications
--      WHERE read = TRUE AND created_at < now() - INTERVAL '30 days';
--     GET DIAGNOSTICS v_count = ROW_COUNT;
--     RETURN v_count;
--   END; $$;
--   -- Schedule: SELECT cron.schedule('cleanup-notifications', '0 3 * * *',
--   --           $$SELECT cleanup_old_notifications()$$);
--
-- B. Drop dead-code functions (only after verifying nothing calls them):
--   DROP FUNCTION IF EXISTS join_plan(TEXT, UUID, TEXT);
--   DROP FUNCTION IF EXISTS join_plan_with_deposit(TEXT, UUID);
--   DROP FUNCTION IF EXISTS organizer_create_deposit(UUID, TEXT);
--   DROP FUNCTION IF EXISTS plan_joined_count(TEXT);
--   -- (Do NOT drop tokens_ledger or _apply_token_delta — audit history matters)
