-- ============================================================
-- Database indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_responses_plan_id ON responses(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_plan_id ON user_plans(plan_id);

-- ============================================================
-- Cascade deletes: when a plan is deleted, remove its responses
-- ============================================================

-- First check existing constraints, then add CASCADE versions.
-- Drop existing FK on responses(plan_id) if it exists, then re-add with CASCADE.
DO $$
BEGIN
  -- responses.plan_id -> plans.id CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'responses_plan_id_fkey'
      AND table_name = 'responses'
  ) THEN
    ALTER TABLE responses DROP CONSTRAINT responses_plan_id_fkey;
  END IF;

  ALTER TABLE responses
    ADD CONSTRAINT responses_plan_id_fkey
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE;

  -- user_plans.plan_id -> plans.id CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_plans_plan_id_fkey'
      AND table_name = 'user_plans'
  ) THEN
    ALTER TABLE user_plans DROP CONSTRAINT user_plans_plan_id_fkey;
  END IF;

  ALTER TABLE user_plans
    ADD CONSTRAINT user_plans_plan_id_fkey
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE;

  -- user_plans.user_id -> auth.users(id) CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_plans_user_id_fkey'
      AND table_name = 'user_plans'
  ) THEN
    ALTER TABLE user_plans DROP CONSTRAINT user_plans_user_id_fkey;
  END IF;

  ALTER TABLE user_plans
    ADD CONSTRAINT user_plans_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END
$$;
