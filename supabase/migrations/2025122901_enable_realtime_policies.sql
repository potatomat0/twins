-- Ensure authenticated users can receive realtime events on key tables.
-- Idempotent: checks for existing policies.

-- Grant SELECT to authenticated role (Realtime honors RLS but requires privileges).
GRANT SELECT ON public.messages, public.notifications, public.matches TO authenticated;

-- Messages: allow select for sender or receiver.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'realtime_messages_select'
  ) THEN
    CREATE POLICY realtime_messages_select
    ON public.messages
    FOR SELECT
    USING (auth.uid() IN (sender_id, receiver_id));
  END IF;
END$$;

-- Notifications: allow select for recipient.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'realtime_notifications_select'
  ) THEN
    CREATE POLICY realtime_notifications_select
    ON public.notifications
    FOR SELECT
    USING (recipient_id = auth.uid());
  END IF;
END$$;

-- Matches: allow select for participants.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'matches' AND policyname = 'realtime_matches_select'
  ) THEN
    CREATE POLICY realtime_matches_select
    ON public.matches
    FOR SELECT
    USING (user_a = auth.uid() OR user_b = auth.uid());
  END IF;
END$$;
