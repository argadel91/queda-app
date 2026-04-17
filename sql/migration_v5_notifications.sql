-- ============================================================
-- Queda v5: In-app notifications + push subscription storage
-- ============================================================
-- Run after migration_v4b_reject.sql.

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id) WHERE read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User reads own notifications" ON notifications;
CREATE POLICY "User reads own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "User updates own notifications" ON notifications;
CREATE POLICY "User updates own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- 2. Push subscription on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- 3. Trigger: someone joins/requests → notify organizer
CREATE OR REPLACE FUNCTION notify_on_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_username TEXT;
  v_type TEXT;
  v_title TEXT;
BEGIN
  SELECT * INTO v_plan FROM plans WHERE id = NEW.plan_id;
  IF NOT FOUND OR v_plan.user_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT username INTO v_username FROM profiles WHERE id = NEW.user_id;

  IF NEW.status = 'joined' THEN
    v_type := 'join'; v_title := COALESCE(v_username, 'Someone') || ' joined your plan';
  ELSIF NEW.status = 'pending' THEN
    v_type := 'request'; v_title := COALESCE(v_username, 'Someone') || ' wants to join your plan';
  ELSE RETURN NEW;
  END IF;

  INSERT INTO notifications(user_id, type, title, body, plan_id)
  VALUES (v_plan.user_id, v_type, v_title, v_plan.title, NEW.plan_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_join ON plan_participants;
CREATE TRIGGER trg_notify_on_join
AFTER INSERT ON plan_participants
FOR EACH ROW EXECUTE FUNCTION notify_on_join();

-- 4. Trigger: participant approved/rejected → notify participant
CREATE OR REPLACE FUNCTION notify_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_type TEXT;
  v_title TEXT;
BEGIN
  IF OLD.status <> 'pending' THEN RETURN NEW; END IF;
  SELECT * INTO v_plan FROM plans WHERE id = NEW.plan_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NEW.status = 'joined' THEN
    v_type := 'approved'; v_title := 'You''re in! Your request was accepted';
  ELSIF NEW.status = 'rejected' THEN
    v_type := 'rejected'; v_title := 'Your request was declined';
  ELSE RETURN NEW;
  END IF;

  INSERT INTO notifications(user_id, type, title, body, plan_id)
  VALUES (NEW.user_id, v_type, v_title, v_plan.title, NEW.plan_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_approval ON plan_participants;
CREATE TRIGGER trg_notify_on_approval
AFTER UPDATE ON plan_participants
FOR EACH ROW EXECUTE FUNCTION notify_on_approval();

-- 5. Trigger: plan cancelled → notify all joined participants
CREATE OR REPLACE FUNCTION notify_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_part RECORD;
BEGIN
  IF OLD.status = 'cancelled' OR NEW.status <> 'cancelled' THEN RETURN NEW; END IF;

  FOR v_part IN
    SELECT user_id FROM plan_participants WHERE plan_id = NEW.id AND status = 'joined'
  LOOP
    IF v_part.user_id <> NEW.user_id THEN
      INSERT INTO notifications(user_id, type, title, body, plan_id)
      VALUES (v_part.user_id, 'cancelled', 'A plan you joined was cancelled', NEW.title, NEW.id);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_cancel ON plans;
CREATE TRIGGER trg_notify_on_cancel
AFTER UPDATE ON plans
FOR EACH ROW EXECUTE FUNCTION notify_on_cancel();

-- 6. Cron function: "your plan is tomorrow" (run daily)
CREATE OR REPLACE FUNCTION notify_plans_tomorrow()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_part RECORD;
  v_count INT := 0;
BEGIN
  FOR v_plan IN
    SELECT * FROM plans
     WHERE status IN ('active','full')
       AND date = (CURRENT_DATE + INTERVAL '1 day')::DATE
  LOOP
    -- Notify organizer
    INSERT INTO notifications(user_id, type, title, body, plan_id)
    VALUES (v_plan.user_id, 'reminder', 'Your plan is tomorrow', v_plan.title, v_plan.id);
    -- Notify attendees
    FOR v_part IN
      SELECT user_id FROM plan_participants WHERE plan_id = v_plan.id AND status = 'joined'
    LOOP
      IF v_part.user_id <> v_plan.user_id THEN
        INSERT INTO notifications(user_id, type, title, body, plan_id)
        VALUES (v_part.user_id, 'reminder', 'A plan you joined is tomorrow', v_plan.title, v_plan.id);
      END IF;
    END LOOP;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 7. Cron function: checkout reminder (2h after plan, no checkout yet)
CREATE OR REPLACE FUNCTION notify_checkout_reminder()
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
       AND ((date + time) AT TIME ZONE 'UTC') < now() - INTERVAL '2 hours'
       AND ((date + time) AT TIME ZONE 'UTC') > now() - INTERVAL '4 hours'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM notifications
       WHERE user_id = v_plan.user_id AND plan_id = v_plan.id AND type = 'checkout_reminder'
    ) THEN
      INSERT INTO notifications(user_id, type, title, body, plan_id)
      VALUES (v_plan.user_id, 'checkout_reminder', 'Time to check out your plan', v_plan.title, v_plan.id);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Schedule:
--   SELECT notify_plans_tomorrow();    → daily at 20:00 UTC (evening before)
--   SELECT notify_checkout_reminder(); → hourly (same schedule as process_auto_checkouts)
