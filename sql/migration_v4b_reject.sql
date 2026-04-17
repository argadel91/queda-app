-- Reject a pending join request: refund 1 token + set status rejected.
-- Run after migration_v4_simplify.sql.

CREATE OR REPLACE FUNCTION reject_join_request(p_plan_id TEXT, p_organizer_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  PERFORM _apply_token_delta(p_user_id, 1, 'reject_refund', p_plan_id, NULL);
  UPDATE plan_participants SET status = 'rejected', deposit_resolved = TRUE
    WHERE plan_id = p_plan_id AND user_id = p_user_id;
END;
$$;
