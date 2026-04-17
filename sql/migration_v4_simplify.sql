-- ============================================================
-- Queda v4 Migration: Simplified token system
-- ============================================================
-- Replaces the v3 token mechanics. Idempotent — safe to re-run.
-- Run in Supabase SQL Editor AFTER migration_v3_tokens.sql.
--
-- New rules:
--   Signup: +6 tokens (cap 12)
--   Join plan: -1 token deposit
--   Attend (checkout confirmed): +1 refund
--   No-show: lose the 1 token
--   Create plan: free (0 tokens)
--   Plan executes (≥1 attendee): +1 to organizer
--   No regen, no thumbs, no invite bonus, no tiers
-- ============================================================


-- ============================================================
-- 1. Adjust profile defaults + cap
-- ============================================================

ALTER TABLE profiles ALTER COLUMN token_balance SET DEFAULT 6;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_token_balance_bounds;
ALTER TABLE profiles ADD CONSTRAINT profiles_token_balance_bounds
  CHECK (token_balance >= 0 AND token_balance <= 12);

-- Clamp any existing rows above 12
UPDATE profiles SET token_balance = 12 WHERE token_balance > 12;


-- ============================================================
-- 2. Drop columns no longer needed on plan_participants
-- ============================================================

-- thumbs_up is no longer used; attended + deposit_resolved stay.
ALTER TABLE plan_participants ALTER COLUMN thumbs_up DROP NOT NULL;
ALTER TABLE plan_participants ALTER COLUMN thumbs_up SET DEFAULT NULL;


-- ============================================================
-- 3. Core helper: _apply_token_delta (cap 12 instead of 21)
-- ============================================================

CREATE OR REPLACE FUNCTION _apply_token_delta(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_related_plan_id TEXT DEFAULT NULL,
  p_related_user_id UUID DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INT;
BEGIN
  UPDATE profiles
     SET token_balance = LEAST(12, GREATEST(0, token_balance + p_amount))
   WHERE id = p_user_id
   RETURNING token_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  INSERT INTO tokens_ledger(user_id, amount, reason, related_plan_id, related_user_id, balance_after)
  VALUES (p_user_id, p_amount, p_reason, p_related_plan_id, p_related_user_id, v_new_balance);

  RETURN v_new_balance;
END;
$$;


-- ============================================================
-- 4. Simplified public wrappers
-- ============================================================

CREATE OR REPLACE FUNCTION deduct_tokens(p_user_id UUID, p_amount INT, p_reason TEXT, p_related_plan_id TEXT DEFAULT NULL)
RETURNS INT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT _apply_token_delta(p_user_id, -ABS(p_amount), p_reason, p_related_plan_id, NULL);
$$;

CREATE OR REPLACE FUNCTION add_tokens(p_user_id UUID, p_amount INT, p_reason TEXT, p_related_plan_id TEXT DEFAULT NULL)
RETURNS INT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT _apply_token_delta(p_user_id, ABS(p_amount), p_reason, p_related_plan_id, NULL);
$$;


-- ============================================================
-- 5. Join plan: 1 token deposit (was 2)
-- ============================================================

CREATE OR REPLACE FUNCTION join_plan_with_deposit(p_plan_id TEXT, p_user_id UUID)
RETURNS TABLE (participant_id UUID, new_status TEXT, new_balance INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_balance INT;
  v_count INT;
  v_status TEXT;
  v_participant_id UUID;
BEGIN
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
  IF v_plan.status <> 'active' THEN RAISE EXCEPTION 'Plan is not active'; END IF;
  IF v_plan.user_id = p_user_id THEN RAISE EXCEPTION 'Organizer cannot join own plan'; END IF;

  SELECT token_balance INTO v_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < 1 THEN
    RAISE EXCEPTION 'Insufficient tokens (need 1, have %)', COALESCE(v_balance, 0);
  END IF;

  SELECT COUNT(*) INTO v_count FROM plan_participants
   WHERE plan_id = p_plan_id AND status = 'joined';
  IF v_count >= v_plan.capacity THEN RAISE EXCEPTION 'Plan is full'; END IF;

  v_status := CASE WHEN v_plan.join_mode = 'approval' THEN 'pending' ELSE 'joined' END;

  INSERT INTO plan_participants(plan_id, user_id, status)
  VALUES (p_plan_id, p_user_id, v_status)
  RETURNING id INTO v_participant_id;

  PERFORM _apply_token_delta(p_user_id, -1, 'join_plan_deposit', p_plan_id, NULL);
  SELECT token_balance INTO v_balance FROM profiles WHERE id = p_user_id;

  IF v_count + 1 >= v_plan.capacity AND v_status = 'joined' THEN
    UPDATE plans SET status = 'full' WHERE id = p_plan_id;
  END IF;

  RETURN QUERY SELECT v_participant_id, v_status, v_balance;
END;
$$;


-- ============================================================
-- 6. Create plan: free (no deposit)
-- ============================================================

CREATE OR REPLACE FUNCTION organizer_create_deposit(p_user_id UUID, p_plan_id TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Creating a plan is free. Log it for auditability but no balance change.
  INSERT INTO tokens_ledger(user_id, amount, reason, related_plan_id, balance_after)
  SELECT p_user_id, 0, 'create_plan_free', p_plan_id, token_balance
    FROM profiles WHERE id = p_user_id;
  RETURN (SELECT token_balance FROM profiles WHERE id = p_user_id);
END;
$$;


-- ============================================================
-- 7. Cancel plan (organizer): refund all attendees 1 token each
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_plan(p_plan_id TEXT, p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_part RECORD;
BEGIN
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
  IF v_plan.user_id <> p_user_id THEN RAISE EXCEPTION 'Only organizer can cancel'; END IF;
  IF v_plan.status IN ('cancelled','past') THEN RAISE EXCEPTION 'Plan already closed'; END IF;

  FOR v_part IN
    SELECT user_id FROM plan_participants WHERE plan_id = p_plan_id AND status = 'joined'
  LOOP
    PERFORM _apply_token_delta(v_part.user_id, 1, 'cancel_refund', p_plan_id, NULL);
    UPDATE plan_participants SET deposit_resolved = TRUE
      WHERE plan_id = p_plan_id AND user_id = v_part.user_id;
  END LOOP;

  UPDATE plans SET status = 'cancelled' WHERE id = p_plan_id;
END;
$$;


-- ============================================================
-- 8. Leave plan (attendee): refund 1 if before deadline
-- ============================================================

CREATE OR REPLACE FUNCTION leave_plan(p_plan_id TEXT, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_plan_ts TIMESTAMPTZ;
  v_hours_until NUMERIC;
BEGIN
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM plan_participants
     WHERE plan_id = p_plan_id AND user_id = p_user_id AND status IN ('joined','pending')
  ) THEN RAISE EXCEPTION 'Not a participant'; END IF;

  v_plan_ts := (v_plan.date + v_plan.time) AT TIME ZONE 'UTC';
  v_hours_until := EXTRACT(EPOCH FROM (v_plan_ts - now())) / 3600.0;

  IF v_hours_until >= v_plan.cancellation_deadline_hours THEN
    PERFORM _apply_token_delta(p_user_id, 1, 'leave_refund', p_plan_id, NULL);
  ELSE
    INSERT INTO tokens_ledger(user_id, amount, reason, related_plan_id, balance_after)
    SELECT p_user_id, 0, 'leave_late_penalty', p_plan_id, token_balance
      FROM profiles WHERE id = p_user_id;
  END IF;

  UPDATE plan_participants SET status = 'rejected', deposit_resolved = TRUE
    WHERE plan_id = p_plan_id AND user_id = p_user_id;
END;
$$;


-- ============================================================
-- 9. Checkout: simplified (no thumbs, no tiers)
-- ============================================================

CREATE OR REPLACE FUNCTION process_plan_checkout(p_plan_id TEXT, p_organizer_id UUID, p_auto BOOLEAN DEFAULT FALSE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_att RECORD;
  v_total_attended INT := 0;
BEGIN
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
  IF v_plan.checked_out_at IS NOT NULL THEN RAISE EXCEPTION 'Already checked out'; END IF;
  IF NOT p_auto AND v_plan.user_id <> p_organizer_id THEN
    RAISE EXCEPTION 'Only organizer can check out';
  END IF;

  -- Auto = organizer no-show after 48h: refund all attendees, no reward.
  IF p_auto THEN
    FOR v_att IN
      SELECT user_id FROM plan_participants
       WHERE plan_id = p_plan_id AND status = 'joined' AND deposit_resolved = FALSE
    LOOP
      PERFORM _apply_token_delta(v_att.user_id, 1, 'organizer_no_show_refund', p_plan_id, NULL);
      UPDATE plan_participants SET deposit_resolved = TRUE
        WHERE plan_id = p_plan_id AND user_id = v_att.user_id;
    END LOOP;

    UPDATE plans SET status='past', checked_out_at=now(), auto_checked_out=TRUE
      WHERE id = p_plan_id;
    RETURN;
  END IF;

  -- Manual checkout by organizer.
  FOR v_att IN
    SELECT user_id, attended FROM plan_participants
     WHERE plan_id = p_plan_id AND status = 'joined' AND deposit_resolved = FALSE
  LOOP
    IF v_att.attended THEN
      PERFORM _apply_token_delta(v_att.user_id, 1, 'attended_refund', p_plan_id, NULL);
      v_total_attended := v_total_attended + 1;
    ELSE
      INSERT INTO tokens_ledger(user_id, amount, reason, related_plan_id, balance_after)
      SELECT v_att.user_id, 0, 'no_show_penalty', p_plan_id, token_balance
        FROM profiles WHERE id = v_att.user_id;
    END IF;
    UPDATE plan_participants SET deposit_resolved = TRUE
      WHERE plan_id = p_plan_id AND user_id = v_att.user_id;
  END LOOP;

  -- Organizer gets +1 if at least 1 person attended.
  IF v_total_attended >= 1 THEN
    PERFORM _apply_token_delta(v_plan.user_id, 1, 'organizer_plan_executed', p_plan_id, NULL);
  END IF;

  UPDATE plans SET status='past', checked_out_at=now() WHERE id = p_plan_id;
END;
$$;


-- ============================================================
-- 10. Auto-checkout cron (same logic, simplified internals)
-- ============================================================

CREATE OR REPLACE FUNCTION process_auto_checkouts()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_count INT := 0;
BEGIN
  FOR v_plan IN
    SELECT * FROM plans
     WHERE checked_out_at IS NULL
       AND status IN ('active','full')
       AND ((date + time) AT TIME ZONE 'UTC') < now() - INTERVAL '48 hours'
  LOOP
    PERFORM process_plan_checkout(v_plan.id, v_plan.user_id, TRUE);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;


-- ============================================================
-- 11. Drop functions that no longer exist
-- ============================================================

DROP FUNCTION IF EXISTS process_weekly_regen();
DROP FUNCTION IF EXISTS credit_invite_bonus(UUID, UUID);


-- ============================================================
-- 12. Signup trigger stays the same (log_signup_balance)
--     Already created in v3 — no change needed.
-- ============================================================


-- ============================================================
-- End of migration_v4_simplify.sql
-- ============================================================
