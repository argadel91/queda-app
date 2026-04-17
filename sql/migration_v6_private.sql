-- ============================================================
-- Queda v6: Private plans always require approval
-- ============================================================
-- Private plans: status='pending' regardless of join_mode setting.
-- This ensures the organizer always controls who sees full details.

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

  -- Private plans ALWAYS require approval, regardless of join_mode
  v_status := CASE WHEN v_plan.join_mode IN ('approval', 'private') THEN 'pending' ELSE 'joined' END;

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
