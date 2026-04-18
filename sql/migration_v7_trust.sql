-- ============================================================
-- Queda v7: Trust system replaces tokens
-- ============================================================
-- Tokens are deprecated (tables/functions left intact but unused).
-- New: trust_score, activity_score, social_score, simplified join/checkout/cancel.

-- 1. New columns on plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS min_trust INT NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS min_attendees INT NOT NULL DEFAULT 2;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS trust_penalized BOOLEAN NOT NULL DEFAULT FALSE;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_min_trust_check') THEN
    ALTER TABLE plans ADD CONSTRAINT plans_min_trust_check CHECK (min_trust IN (0, 70, 80, 90));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_min_attendees_check') THEN
    ALTER TABLE plans ADD CONSTRAINT plans_min_attendees_check CHECK (min_attendees >= 2);
  END IF;
END $$;


-- 2. Trust score function
-- Returns 0-100, or -1 if < 3 commitments ("New" user).
CREATE OR REPLACE FUNCTION trust_score(p_user_id UUID)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH att AS (
    SELECT
      COUNT(*) FILTER (WHERE pp.attended = true) AS success,
      COUNT(*) AS total
    FROM plan_participants pp
    JOIN plans p ON p.id = pp.plan_id
    WHERE pp.user_id = p_user_id
      AND p.status = 'past'
      AND pp.deposit_resolved = true
  ),
  org_done AS (
    SELECT
      COUNT(*) FILTER (WHERE NOT auto_checked_out) AS success,
      COUNT(*) AS total
    FROM plans
    WHERE user_id = p_user_id
      AND status = 'past'
      AND checked_out_at IS NOT NULL
  ),
  org_fail AS (
    SELECT COUNT(*) AS total
    FROM plans
    WHERE user_id = p_user_id
      AND status = 'cancelled'
      AND trust_penalized = true
  )
  SELECT CASE
    WHEN (att.total + org_done.total + org_fail.total) < 3 THEN -1
    ELSE GREATEST(0, LEAST(100,
      ROUND((att.success + org_done.success)::numeric /
        NULLIF(att.total + org_done.total + org_fail.total, 0) * 100)::INT
    ))
  END
  FROM att, org_done, org_fail;
$$;


-- 3. Activity score (total plans completed)
CREATE OR REPLACE FUNCTION activity_score(p_user_id UUID)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    (SELECT COUNT(*) FROM plan_participants pp
     JOIN plans p ON p.id = pp.plan_id
     WHERE pp.user_id = p_user_id AND pp.attended = true AND p.status = 'past')
    +
    (SELECT COUNT(*) FROM plans
     WHERE user_id = p_user_id AND checked_out_at IS NOT NULL AND NOT auto_checked_out)
  )::INT;
$$;


-- 4. Social score (friends invited who completed signup)
-- Depends on invitations table; returns 0 if table doesn't exist.
CREATE OR REPLACE FUNCTION social_score(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
    RETURN (SELECT COUNT(*) FROM invitations WHERE inviter_user_id = p_user_id AND used_at IS NOT NULL)::INT;
  END IF;
  RETURN 0;
END;
$$;


-- 5. Join plan (free, no tokens)
CREATE OR REPLACE FUNCTION join_plan_free(p_plan_id TEXT, p_user_id UUID)
RETURNS TABLE (participant_id UUID, new_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_count INT;
  v_trust INT;
  v_status TEXT;
  v_pid UUID;
BEGIN
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
  IF v_plan.status <> 'active' THEN RAISE EXCEPTION 'Plan is not active'; END IF;
  IF v_plan.user_id = p_user_id THEN RAISE EXCEPTION 'Organizer cannot join own plan'; END IF;

  IF EXISTS (SELECT 1 FROM plan_participants WHERE plan_id = p_plan_id AND user_id = p_user_id AND status IN ('joined','pending')) THEN
    RAISE EXCEPTION 'Already joined or pending';
  END IF;

  SELECT COUNT(*) INTO v_count FROM plan_participants
   WHERE plan_id = p_plan_id AND status = 'joined';
  IF v_count >= v_plan.capacity THEN RAISE EXCEPTION 'Plan is full'; END IF;

  -- Trust check (new users = -1, always allowed)
  IF v_plan.min_trust > 0 THEN
    v_trust := trust_score(p_user_id);
    IF v_trust >= 0 AND v_trust < v_plan.min_trust THEN
      RAISE EXCEPTION 'Trust too low (need %%, have %%)', v_plan.min_trust, v_trust;
    END IF;
  END IF;

  v_status := CASE WHEN v_plan.join_mode IN ('approval', 'private') THEN 'pending' ELSE 'joined' END;

  INSERT INTO plan_participants(plan_id, user_id, status)
  VALUES (p_plan_id, p_user_id, v_status)
  RETURNING id INTO v_pid;

  IF v_count + 1 >= v_plan.capacity AND v_status = 'joined' THEN
    UPDATE plans SET status = 'full' WHERE id = p_plan_id;
  END IF;

  RETURN QUERY SELECT v_pid, v_status;
END;
$$;


-- 6. Checkout — simplified (no tokens, just mark attended)
CREATE OR REPLACE FUNCTION process_plan_checkout(p_plan_id TEXT, p_organizer_id UUID, p_auto BOOLEAN DEFAULT FALSE)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_att RECORD;
BEGIN
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
  IF v_plan.checked_out_at IS NOT NULL THEN RAISE EXCEPTION 'Already checked out'; END IF;
  IF NOT p_auto AND v_plan.user_id <> p_organizer_id THEN
    RAISE EXCEPTION 'Only organizer can check out';
  END IF;

  -- Auto = 48h passed, organizer no-show: mark all as attended (benefit of doubt for attendees)
  IF p_auto THEN
    UPDATE plan_participants SET attended = true, deposit_resolved = true
      WHERE plan_id = p_plan_id AND status = 'joined' AND deposit_resolved = false;
    UPDATE plans SET status = 'past', checked_out_at = now(), auto_checked_out = true
      WHERE id = p_plan_id;
    RETURN;
  END IF;

  -- Manual: just mark deposit_resolved, attended is already set by the frontend
  UPDATE plan_participants SET deposit_resolved = true
    WHERE plan_id = p_plan_id AND status = 'joined';

  UPDATE plans SET status = 'past', checked_out_at = now() WHERE id = p_plan_id;
END;
$$;


-- 7. Cancel plan — trust-aware
CREATE OR REPLACE FUNCTION cancel_plan(p_plan_id TEXT, p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_plan_ts TIMESTAMPTZ;
  v_hours_until NUMERIC;
  v_joined_count INT;
  v_penalize BOOLEAN := false;
BEGIN
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
  IF v_plan.user_id <> p_user_id THEN RAISE EXCEPTION 'Only organizer can cancel'; END IF;
  IF v_plan.status IN ('cancelled', 'past') THEN RAISE EXCEPTION 'Plan already closed'; END IF;

  v_plan_ts := (v_plan.date + v_plan.time) AT TIME ZONE 'UTC';
  v_hours_until := EXTRACT(EPOCH FROM (v_plan_ts - now())) / 3600.0;

  SELECT COUNT(*) INTO v_joined_count FROM plan_participants
    WHERE plan_id = p_plan_id AND status = 'joined';

  -- Penalize if: enough attendees AND cancelling after deadline
  IF v_joined_count >= v_plan.min_attendees AND v_hours_until < v_plan.cancellation_deadline_hours THEN
    v_penalize := true;
  END IF;

  UPDATE plans SET
    status = 'cancelled',
    cancel_reason = p_reason,
    trust_penalized = v_penalize
  WHERE id = p_plan_id;

  -- Mark all participants as resolved (no token movements)
  UPDATE plan_participants SET deposit_resolved = true
    WHERE plan_id = p_plan_id AND status IN ('joined', 'pending');
END;
$$;


-- 8. Leave plan — simplified (no tokens)
CREATE OR REPLACE FUNCTION leave_plan(p_plan_id TEXT, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM plan_participants
     WHERE plan_id = p_plan_id AND user_id = p_user_id AND status IN ('joined', 'pending')
  ) THEN RAISE EXCEPTION 'Not a participant'; END IF;

  DELETE FROM plan_participants WHERE plan_id = p_plan_id AND user_id = p_user_id;
END;
$$;


-- 9. Reject join request — simplified (no token refund)
CREATE OR REPLACE FUNCTION reject_join_request(p_plan_id TEXT, p_organizer_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
BEGIN
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found'; END IF;
  IF v_plan.user_id <> p_organizer_id THEN RAISE EXCEPTION 'Only organizer can reject'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM plan_participants
     WHERE plan_id = p_plan_id AND user_id = p_user_id AND status = 'pending'
  ) THEN RAISE EXCEPTION 'No pending request from this user'; END IF;

  UPDATE plan_participants SET status = 'rejected', deposit_resolved = true
    WHERE plan_id = p_plan_id AND user_id = p_user_id;
END;
$$;
