-- ============================================================
-- Queda v3 Migration: Tokens, check-out, interactions, gender filter
-- ============================================================
-- Additive over migration_v2.sql. Idempotent — safe to re-run.
-- Run this in Supabase SQL Editor.
--
-- After running:
--   - Schedule `process_weekly_regen()` as a Supabase cron (every 7 days).
--   - Schedule `process_auto_checkouts()` as a Supabase cron (hourly).
--   - Realtime stays on messages + plan_participants (no change).
-- ============================================================


-- ============================================================
-- 1. Profiles: token balance, phone, passport
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS token_balance INT NOT NULL DEFAULT 6;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS passport_mode_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_weekly_regen_at TIMESTAMPTZ;

-- Hard cap enforced at function level, but also as CHECK for defence in depth.
-- Drop-and-recreate to handle idempotent re-runs without naming constraints.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_token_balance_bounds') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_token_balance_bounds CHECK (token_balance >= 0 AND token_balance <= 21);
  END IF;
END $$;


-- ============================================================
-- 2. Plans: gender filter, cancellation deadline, check-out
-- ============================================================

ALTER TABLE plans ADD COLUMN IF NOT EXISTS gender_filter TEXT NOT NULL DEFAULT 'mixed';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS cancellation_deadline_hours INT NOT NULL DEFAULT 24;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS auto_checked_out BOOLEAN NOT NULL DEFAULT FALSE;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_gender_filter_check') THEN
    ALTER TABLE plans ADD CONSTRAINT plans_gender_filter_check CHECK (gender_filter IN ('male','female','mixed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_cancel_hours_check') THEN
    ALTER TABLE plans ADD CONSTRAINT plans_cancel_hours_check CHECK (cancellation_deadline_hours >= 1 AND cancellation_deadline_hours <= 168);
  END IF;
END $$;

-- Extend join_mode: open (anyone) / approval (organizer reviews) / private (link-only).
-- v2 had 'open','closed'. Expand the CHECK constraint.
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_join_mode_check;
ALTER TABLE plans ADD CONSTRAINT plans_join_mode_check CHECK (join_mode IN ('open','approval','private'));

CREATE INDEX IF NOT EXISTS idx_plans_gender_filter ON plans(gender_filter);
CREATE INDEX IF NOT EXISTS idx_plans_status_date ON plans(status, date);


-- ============================================================
-- 3. Plan participants: attendance + thumbs
-- ============================================================

ALTER TABLE plan_participants ADD COLUMN IF NOT EXISTS attended BOOLEAN;
ALTER TABLE plan_participants ADD COLUMN IF NOT EXISTS thumbs_up BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE plan_participants ADD COLUMN IF NOT EXISTS deposit_resolved BOOLEAN NOT NULL DEFAULT FALSE;


-- ============================================================
-- 4. Tokens ledger
-- ============================================================

CREATE TABLE IF NOT EXISTS tokens_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL, -- positive = credit, negative = debit
  reason TEXT NOT NULL,
  related_plan_id TEXT REFERENCES plans(id) ON DELETE SET NULL,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- e.g. invited friend
  balance_after INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON tokens_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_plan ON tokens_ledger(related_plan_id);
CREATE INDEX IF NOT EXISTS idx_ledger_reason ON tokens_ledger(reason);

ALTER TABLE tokens_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User reads own ledger" ON tokens_ledger;
CREATE POLICY "User reads own ledger" ON tokens_ledger
  FOR SELECT USING (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policies: only SECURITY DEFINER functions write.


-- ============================================================
-- 5. User interactions (silent tracking for future inference)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('view','apply','join','attend')),
  category TEXT, -- denormalised copy of plan.category at interaction time
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_category ON user_interactions(user_id, category);

ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User reads own interactions" ON user_interactions;
CREATE POLICY "User reads own interactions" ON user_interactions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "User writes own interactions" ON user_interactions;
CREATE POLICY "User writes own interactions" ON user_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 6. Token atomic functions
-- ============================================================

-- Internal helper: adjust balance, insert ledger row, respect [0,21] cap.
-- Returns the final balance.
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
  -- Atomic: row-level lock on profile via UPDATE ... RETURNING
  UPDATE profiles
     SET token_balance = LEAST(21, GREATEST(0, token_balance + p_amount))
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

-- Public wrappers (for clarity + possible future policy differences).
CREATE OR REPLACE FUNCTION deduct_tokens(p_user_id UUID, p_amount INT, p_reason TEXT, p_related_plan_id TEXT DEFAULT NULL)
RETURNS INT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT _apply_token_delta(p_user_id, -ABS(p_amount), p_reason, p_related_plan_id, NULL);
$$;

CREATE OR REPLACE FUNCTION add_tokens(p_user_id UUID, p_amount INT, p_reason TEXT, p_related_plan_id TEXT DEFAULT NULL)
RETURNS INT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT _apply_token_delta(p_user_id, ABS(p_amount), p_reason, p_related_plan_id, NULL);
$$;


-- ============================================================
-- 7. Join plan with deposit (replaces v2's plain join if present)
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
  IF v_balance IS NULL OR v_balance < 2 THEN
    RAISE EXCEPTION 'Insufficient tokens (need 2, have %)', COALESCE(v_balance, 0);
  END IF;

  SELECT COUNT(*) INTO v_count FROM plan_participants
   WHERE plan_id = p_plan_id AND status = 'joined';
  IF v_count >= v_plan.capacity THEN RAISE EXCEPTION 'Plan is full'; END IF;

  v_status := CASE WHEN v_plan.join_mode = 'approval' THEN 'pending' ELSE 'joined' END;

  INSERT INTO plan_participants(plan_id, user_id, status)
  VALUES (p_plan_id, p_user_id, v_status)
  RETURNING id INTO v_participant_id;

  PERFORM _apply_token_delta(p_user_id, -2, 'join_plan_deposit', p_plan_id, NULL);
  SELECT token_balance INTO v_balance FROM profiles WHERE id = p_user_id;

  IF v_count + 1 >= v_plan.capacity AND v_status = 'joined' THEN
    UPDATE plans SET status = 'full' WHERE id = p_plan_id;
  END IF;

  RETURN QUERY SELECT v_participant_id, v_status, v_balance;
END;
$$;


-- ============================================================
-- 8. Create plan with pending bonus
-- ============================================================

-- Helper: record that the organizer committed 2 tokens (deposit) + 1 pending reward.
-- The pending +1 is implicit: materialised in process_plan_checkout if ≥1 attended.
-- For simplicity we deduct 2 now and credit 3 later on success (net +1 vs initial).
CREATE OR REPLACE FUNCTION organizer_create_deposit(p_user_id UUID, p_plan_id TEXT)
RETURNS INT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT _apply_token_delta(p_user_id, -2, 'create_plan_deposit', p_plan_id, NULL);
$$;


-- ============================================================
-- 9. Cancel plan (organizer) — refund or penalty by timing
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_plan(p_plan_id TEXT, p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_plan_ts TIMESTAMPTZ;
  v_hours_until NUMERIC;
  v_part RECORD;
BEGIN
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
  IF v_plan.user_id <> p_user_id THEN RAISE EXCEPTION 'Only organizer can cancel'; END IF;
  IF v_plan.status IN ('cancelled','past') THEN RAISE EXCEPTION 'Plan already closed'; END IF;

  v_plan_ts := (v_plan.date + v_plan.time) AT TIME ZONE 'UTC';
  v_hours_until := EXTRACT(EPOCH FROM (v_plan_ts - now())) / 3600.0;

  -- Refund every joined participant in full.
  FOR v_part IN
    SELECT user_id FROM plan_participants WHERE plan_id = p_plan_id AND status = 'joined'
  LOOP
    PERFORM _apply_token_delta(v_part.user_id, 2, 'cancel_refund_attendee', p_plan_id, NULL);
    UPDATE plan_participants SET deposit_resolved = TRUE
      WHERE plan_id = p_plan_id AND user_id = v_part.user_id;
  END LOOP;

  -- Organizer outcome:
  --   >= cancellation_deadline hours before plan → full refund (neto 0, no bonus)
  --   < deadline → lose deposit (neto -2)
  IF v_hours_until >= v_plan.cancellation_deadline_hours THEN
    PERFORM _apply_token_delta(p_user_id, 2, 'cancel_refund_organizer_ontime', p_plan_id, NULL);
  ELSE
    -- keep the 2 deducted at creation → effectively "loses 2"
    INSERT INTO tokens_ledger(user_id, amount, reason, related_plan_id, balance_after)
    SELECT p_user_id, 0, 'cancel_penalty_organizer_late', p_plan_id, token_balance
      FROM profiles WHERE id = p_user_id;
  END IF;

  UPDATE plans SET status = 'cancelled' WHERE id = p_plan_id;
END;
$$;


-- ============================================================
-- 10. Attendee leaves (not cancel by organizer)
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
  v_existed BOOLEAN;
BEGIN
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;

  SELECT TRUE INTO v_existed FROM plan_participants
   WHERE plan_id = p_plan_id AND user_id = p_user_id AND status IN ('joined','pending')
   LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not a participant'; END IF;

  v_plan_ts := (v_plan.date + v_plan.time) AT TIME ZONE 'UTC';
  v_hours_until := EXTRACT(EPOCH FROM (v_plan_ts - now())) / 3600.0;

  -- Refund only if within the plan's cancellation window.
  IF v_hours_until >= v_plan.cancellation_deadline_hours THEN
    PERFORM _apply_token_delta(p_user_id, 2, 'leave_refund_ontime', p_plan_id, NULL);
  ELSE
    INSERT INTO tokens_ledger(user_id, amount, reason, related_plan_id, balance_after)
    SELECT p_user_id, 0, 'leave_penalty_late', p_plan_id, token_balance
      FROM profiles WHERE id = p_user_id;
  END IF;

  UPDATE plan_participants SET status = 'rejected', deposit_resolved = TRUE
    WHERE plan_id = p_plan_id AND user_id = p_user_id;
END;
$$;


-- ============================================================
-- 11. Check-out (organizer finalises the plan)
-- ============================================================

CREATE OR REPLACE FUNCTION process_plan_checkout(p_plan_id TEXT, p_organizer_id UUID, p_auto BOOLEAN DEFAULT FALSE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_attendee RECORD;
  v_total_attended INT := 0;
  v_thumbs_up INT := 0;
  v_ratio NUMERIC;
  v_bonus INT := 0;
BEGIN
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
  IF v_plan.checked_out_at IS NOT NULL THEN RAISE EXCEPTION 'Already checked out'; END IF;
  IF NOT p_auto AND v_plan.user_id <> p_organizer_id THEN
    RAISE EXCEPTION 'Only organizer can check out';
  END IF;

  -- Auto checkout = organizer didn't show up: everyone who was 'joined' is refunded in full,
  -- organizer is penalised (-2 net, the deposit is already gone).
  IF p_auto THEN
    FOR v_attendee IN
      SELECT user_id FROM plan_participants
       WHERE plan_id = p_plan_id AND status = 'joined' AND deposit_resolved = FALSE
    LOOP
      PERFORM _apply_token_delta(v_attendee.user_id, 2, 'organizer_no_show_refund', p_plan_id, NULL);
      UPDATE plan_participants SET deposit_resolved = TRUE
        WHERE plan_id = p_plan_id AND user_id = v_attendee.user_id;
    END LOOP;

    INSERT INTO tokens_ledger(user_id, amount, reason, related_plan_id, balance_after)
    SELECT v_plan.user_id, 0, 'organizer_no_show_penalty', p_plan_id, token_balance
      FROM profiles WHERE id = v_plan.user_id;

    UPDATE plans SET status='past', checked_out_at=now(), auto_checked_out=TRUE
      WHERE id = p_plan_id;
    RETURN;
  END IF;

  -- Manual check-out by organizer:
  FOR v_attendee IN
    SELECT user_id, attended, thumbs_up FROM plan_participants
     WHERE plan_id = p_plan_id AND status = 'joined' AND deposit_resolved = FALSE
  LOOP
    IF v_attendee.attended THEN
      -- Attendee showed up: refund deposit (+2), plus +1 if thumbs_up (auto-True unless organizer toggled off)
      IF v_attendee.thumbs_up THEN
        PERFORM _apply_token_delta(v_attendee.user_id, 2, 'attended_refund', p_plan_id, NULL);
        PERFORM _apply_token_delta(v_attendee.user_id, 1, 'attended_thumbs_up_bonus', p_plan_id, NULL);
        v_thumbs_up := v_thumbs_up + 1;
      ELSE
        PERFORM _apply_token_delta(v_attendee.user_id, 2, 'attended_no_thumbs', p_plan_id, NULL);
      END IF;
      v_total_attended := v_total_attended + 1;
    ELSE
      -- No-show: keep the 2 deducted → net -2 for attendee
      INSERT INTO tokens_ledger(user_id, amount, reason, related_plan_id, balance_after)
      SELECT v_attendee.user_id, 0, 'no_show_penalty', p_plan_id, token_balance
        FROM profiles WHERE id = v_attendee.user_id;
    END IF;
    UPDATE plan_participants SET deposit_resolved = TRUE
      WHERE plan_id = p_plan_id AND user_id = v_attendee.user_id;
  END LOOP;

  -- Organizer payout: refund deposit + pending reward if ≥1 attended
  IF v_total_attended >= 1 THEN
    PERFORM _apply_token_delta(v_plan.user_id, 2, 'organizer_refund_executed', p_plan_id, NULL);
    PERFORM _apply_token_delta(v_plan.user_id, 1, 'organizer_pending_reward', p_plan_id, NULL);

    -- Thumbs-up bonus tiers (exclusive)
    v_ratio := v_thumbs_up::NUMERIC / v_total_attended::NUMERIC;
    IF v_ratio = 1.0 THEN v_bonus := 3;
    ELSIF v_ratio >= 0.5 THEN v_bonus := 2;
    ELSIF v_thumbs_up >= 1 THEN v_bonus := 1;
    END IF;

    IF v_bonus > 0 THEN
      PERFORM _apply_token_delta(v_plan.user_id, v_bonus,
        CASE v_bonus WHEN 3 THEN 'thumbs_bonus_tier_3'
                     WHEN 2 THEN 'thumbs_bonus_tier_2'
                     ELSE 'thumbs_bonus_tier_1' END,
        p_plan_id, NULL);
    END IF;
  ELSE
    -- No attendees: refund deposit only, no pending reward materialised
    PERFORM _apply_token_delta(v_plan.user_id, 2, 'organizer_refund_no_attendees', p_plan_id, NULL);
  END IF;

  UPDATE plans SET status='past', checked_out_at=now() WHERE id = p_plan_id;
END;
$$;


-- ============================================================
-- 12. Cron: auto check-out plans 48h past their start
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
-- 13. Cron: weekly regen for users with balance <= 1
-- ============================================================

CREATE OR REPLACE FUNCTION process_weekly_regen()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_count INT := 0;
BEGIN
  FOR v_profile IN
    SELECT id FROM profiles
     WHERE token_balance <= 1
       AND (last_weekly_regen_at IS NULL OR last_weekly_regen_at < now() - INTERVAL '7 days')
  LOOP
    PERFORM _apply_token_delta(v_profile.id, 1, 'weekly_regen', NULL, NULL);
    UPDATE profiles SET last_weekly_regen_at = now() WHERE id = v_profile.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;


-- ============================================================
-- 14. Invite bonus
-- ============================================================

CREATE OR REPLACE FUNCTION credit_invite_bonus(p_inviter_id UUID, p_invitee_id UUID)
RETURNS INT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT _apply_token_delta(p_inviter_id, 2, 'invite_friend_completed', NULL, p_invitee_id);
$$;


-- ============================================================
-- 15. Ensure new profile rows start with the signup ledger entry
-- ============================================================

CREATE OR REPLACE FUNCTION log_signup_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO tokens_ledger(user_id, amount, reason, balance_after)
  VALUES (NEW.id, NEW.token_balance, 'signup', NEW.token_balance);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_signup_balance ON profiles;
CREATE TRIGGER trg_log_signup_balance
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION log_signup_balance();


-- ============================================================
-- End of migration_v3_tokens.sql
-- ============================================================
