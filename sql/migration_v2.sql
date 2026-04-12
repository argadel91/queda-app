-- ============================================================
-- Queda v2 Migration: Social Discovery Pivot
-- ============================================================
-- Run this in Supabase SQL Editor.
-- After running, enable Realtime on: messages, plan_participants

-- ============================================================
-- 1. Rename old tables (preserve data, don't delete)
-- ============================================================

ALTER TABLE IF EXISTS plans RENAME TO plans_v1;
ALTER TABLE IF EXISTS responses RENAME TO responses_v1;
ALTER TABLE IF EXISTS user_plans RENAME TO user_plans_v1;

-- ============================================================
-- 2. Expand profiles table
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male','female','non-binary','other','prefer_not_to_say'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON profiles USING gin(interests);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read any profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated can read profiles" ON profiles;
CREATE POLICY "Authenticated can read profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 3. New plans table (flat schema, no JSONB)
-- ============================================================

CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  place_name TEXT NOT NULL,
  place_address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  capacity INT NOT NULL CHECK (capacity >= 2 AND capacity <= 20),
  join_mode TEXT NOT NULL DEFAULT 'open' CHECK (join_mode IN ('open','closed')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','full','cancelled','past')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plans_date ON plans(date);
CREATE INDEX idx_plans_status ON plans(status);
CREATE INDEX idx_plans_category ON plans(category);
CREATE INDEX idx_plans_user_id ON plans(user_id);
CREATE INDEX idx_plans_location ON plans(lat, lng);
CREATE INDEX idx_plans_created_at ON plans(created_at DESC);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read active plans" ON plans
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert own plans" ON plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON plans
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON plans
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 4. Plan participants
-- ============================================================

CREATE TABLE plan_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('joined','pending','rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, user_id)
);

CREATE INDEX idx_pp_plan_id ON plan_participants(plan_id);
CREATE INDEX idx_pp_user_id ON plan_participants(user_id);
CREATE INDEX idx_pp_status ON plan_participants(status);

ALTER TABLE plan_participants ENABLE ROW LEVEL SECURITY;

-- Participants and organizers can see participants
CREATE POLICY "See own participation or own plan participants" ON plan_participants
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_id AND plans.user_id = auth.uid())
  );

-- Anyone authenticated can join/request
CREATE POLICY "Authenticated users can join" ON plan_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can leave (delete own participation)
CREATE POLICY "Users can leave plans" ON plan_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Users can update own, organizer can update any in their plan
CREATE POLICY "Update own or as organizer" ON plan_participants
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_id AND plans.user_id = auth.uid())
  );

-- ============================================================
-- 5. Messages (in-plan chat)
-- ============================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_plan_created ON messages(plan_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Only joined participants + organizer can read messages
CREATE POLICY "Participants can read messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plan_participants
      WHERE plan_participants.plan_id = messages.plan_id
      AND plan_participants.user_id = auth.uid()
      AND plan_participants.status = 'joined'
    )
    OR EXISTS (SELECT 1 FROM plans WHERE plans.id = messages.plan_id AND plans.user_id = auth.uid())
  );

-- Only joined participants + organizer can send messages
CREATE POLICY "Participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM plan_participants
        WHERE plan_participants.plan_id = messages.plan_id
        AND plan_participants.user_id = auth.uid()
        AND plan_participants.status = 'joined'
      )
      OR EXISTS (SELECT 1 FROM plans WHERE plans.id = messages.plan_id AND plans.user_id = auth.uid())
    )
  );

-- ============================================================
-- 6. Helper function: delete plan (organizer only)
-- ============================================================

CREATE OR REPLACE FUNCTION delete_plan(p_plan_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM plans WHERE id = p_plan_id AND user_id = auth.uid();
END;
$$;

-- ============================================================
-- 7. Helper: count joined participants (for capacity checks)
-- ============================================================

CREATE OR REPLACE FUNCTION plan_joined_count(p_plan_id TEXT)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INT FROM plan_participants
  WHERE plan_id = p_plan_id AND status = 'joined';
$$;

-- ============================================================
-- 8. Safe join with capacity check (prevents race conditions)
-- ============================================================

CREATE OR REPLACE FUNCTION join_plan(p_plan_id TEXT, p_user_id UUID, p_status TEXT DEFAULT 'joined')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_capacity INT;
  v_joined INT;
BEGIN
  -- Lock the plan row to prevent concurrent joins
  SELECT capacity INTO v_capacity
    FROM plans
    WHERE id = p_plan_id AND status IN ('active', 'full')
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- Count current joined participants
  SELECT COUNT(*) INTO v_joined
    FROM plan_participants
    WHERE plan_id = p_plan_id AND status = 'joined';

  -- Block if full and trying to join (not request)
  IF p_status = 'joined' AND v_joined >= v_capacity THEN
    RAISE EXCEPTION 'Plan is full';
  END IF;

  -- Insert participant (ignore if already exists)
  INSERT INTO plan_participants (plan_id, user_id, status)
    VALUES (p_plan_id, p_user_id, p_status)
    ON CONFLICT (plan_id, user_id) DO NOTHING;

  -- If this join filled the plan, update status
  IF p_status = 'joined' AND v_joined + 1 >= v_capacity THEN
    UPDATE plans SET status = 'full' WHERE id = p_plan_id;
  END IF;
END;
$$;

-- ============================================================
-- 9. Cron job: mark past plans (run in Supabase SQL Editor)
-- ============================================================
-- Requires pg_cron extension (enabled by default in Supabase).
-- Run this ONCE to schedule a daily job at 01:00 UTC:
--
-- SELECT cron.schedule(
--   'mark-past-plans',
--   '0 1 * * *',
--   $$UPDATE plans SET status = 'past' WHERE date < CURRENT_DATE AND status IN ('active', 'full')$$
-- );
--
-- To verify: SELECT * FROM cron.job;
-- To remove: SELECT cron.unschedule('mark-past-plans');

-- ============================================================
-- DONE. Now go to Supabase Dashboard:
-- 1. Enable Realtime on tables: messages, plan_participants
-- 2. Create Storage bucket "avatars" (public, 2MB limit, image/* only)
-- 3. Run the cron.schedule command above in SQL Editor
-- ============================================================
