-- ============================================================
-- RLS Policies for user_interactions
-- ============================================================
-- Safe to paste into Supabase SQL Editor and run multiple times.
-- Uses DROP POLICY IF EXISTS before CREATE POLICY so there are
-- no "already exists" errors on re-runs.
--
-- This file does NOT touch any data and does NOT create the table.
-- It only enables Row Level Security and adds two policies:
--   1. INSERT  — authenticated user may insert their own rows
--   2. SELECT  — authenticated user may read their own rows
-- ============================================================

-- 1. Enable Row Level Security on the table.
--    If RLS is already enabled this is a no-op.
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICY 1: INSERT own rows
-- ============================================================
-- Allows an authenticated user to insert a row only when
-- user_id matches their Supabase auth UID.
DROP POLICY IF EXISTS "users_insert_own_interactions" ON public.user_interactions;

CREATE POLICY "users_insert_own_interactions"
  ON public.user_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- POLICY 2: SELECT own rows
-- ============================================================
-- Allows an authenticated user to read only their own rows.
-- Useful for future analytics dashboards or history views.
DROP POLICY IF EXISTS "users_select_own_interactions" ON public.user_interactions;

CREATE POLICY "users_select_own_interactions"
  ON public.user_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- Verification (optional — run separately to confirm)
-- ============================================================
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM   pg_policies
-- WHERE  tablename = 'user_interactions';
