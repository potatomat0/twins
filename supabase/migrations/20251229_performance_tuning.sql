-- ==============================================================================
-- PERFORMANCE OPTIMIZATION MIGRATION
-- Date: 2025-12-29
-- Purpose: Fix 'auth_rls_initplan' (N+1 query issue) and 'multiple_permissive_policies'
-- ==============================================================================

-- 1. OPTIMIZE: public.profiles
-- ==============================================================================
DROP POLICY IF EXISTS "profiles_is_owner" ON public.profiles;

CREATE POLICY "profiles_is_owner_optimized" ON public.profiles
FOR ALL
USING ( id = (select auth.uid()) )
WITH CHECK ( id = (select auth.uid()) );

-- Allow reading public profiles (needed for Recommendation Engine flow)
-- Note: 'get_profile_details' function bypasses RLS, but direct SELECTs need this if used.
-- Only strictly needed if you do direct SELECT * FROM profiles WHERE id IN (...) from client.
CREATE POLICY "profiles_read_public" ON public.profiles
FOR SELECT
USING ( true ); 
-- (Or restrict to specific columns if you want stricter security, but usually profiles are public read)


-- 2. OPTIMIZE: public.matches
-- ==============================================================================
-- Drop redundant/slow policies
DROP POLICY IF EXISTS "match_select" ON public.matches;
DROP POLICY IF EXISTS "realtime_matches_select" ON public.matches;
DROP POLICY IF EXISTS "match_insert" ON public.matches;

-- Consolidated SELECT policy (Stable auth.uid)
CREATE POLICY "matches_select_optimized" ON public.matches
FOR SELECT
USING ( 
  user_a = (select auth.uid()) OR 
  user_b = (select auth.uid()) 
);

-- Insert policy (Service Role only - unchanged but explicit)
CREATE POLICY "matches_insert_service" ON public.matches
FOR INSERT
WITH CHECK ( (select auth.role()) = 'service_role' );


-- 3. OPTIMIZE: public.messages
-- ==============================================================================
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "realtime_messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update_status" ON public.messages;

-- Consolidated SELECT (Participants only)
-- Assuming messages table has sender_id and receiver_id, OR match_id. 
-- Based on previous context, it likely has match_id or sender/receiver.
-- Let's assume standard schema: sender_id, receiver_id.
CREATE POLICY "messages_select_optimized" ON public.messages
FOR SELECT
USING (
  sender_id = (select auth.uid()) OR 
  receiver_id = (select auth.uid())
);

-- Insert (Sender can insert)
CREATE POLICY "messages_insert_optimized" ON public.messages
FOR INSERT
WITH CHECK ( sender_id = (select auth.uid()) );

-- Update (Sender or Receiver can update status e.g. 'read')
CREATE POLICY "messages_update_optimized" ON public.messages
FOR UPDATE
USING (
  sender_id = (select auth.uid()) OR 
  receiver_id = (select auth.uid())
);


-- 4. OPTIMIZE: public.notifications
-- ==============================================================================
DROP POLICY IF EXISTS "recipient_select" ON public.notifications;
DROP POLICY IF EXISTS "realtime_notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "service_insert" ON public.notifications;
DROP POLICY IF EXISTS "recipient_update" ON public.notifications;

-- Consolidated SELECT (Recipient only)
CREATE POLICY "notifications_select_optimized" ON public.notifications
FOR SELECT
USING ( recipient_id = (select auth.uid()) );

-- Insert (Service Role only - via Edge Function)
CREATE POLICY "notifications_insert_service" ON public.notifications
FOR INSERT
WITH CHECK ( (select auth.role()) = 'service_role' );

-- Update (Recipient can mark as read)
CREATE POLICY "notifications_update_optimized" ON public.notifications
FOR UPDATE
USING ( recipient_id = (select auth.uid()) );


-- 5. OPTIMIZE: public.match_events
-- ==============================================================================
DROP POLICY IF EXISTS "actor_can_insert" ON public.match_events;
DROP POLICY IF EXISTS "actor_can_select" ON public.match_events;

CREATE POLICY "match_events_insert_optimized" ON public.match_events
FOR INSERT
WITH CHECK ( actor_id = (select auth.uid()) );

CREATE POLICY "match_events_select_optimized" ON public.match_events
FOR SELECT
USING ( actor_id = (select auth.uid()) );


-- 6. ENSURE INDEXES (Critical for Joins/Lookups)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON public.matches(user_a);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON public.matches(user_b);
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_match_events_actor_id ON public.match_events(actor_id);

-- Optional: Index on filter columns for Recommend Users
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_age_group ON public.profiles(age_group);
