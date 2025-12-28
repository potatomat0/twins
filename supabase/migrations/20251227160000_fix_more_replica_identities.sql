-- Fix Realtime for match_events if used in frontend (though currently not subscribed)
ALTER TABLE public.match_events REPLICA IDENTITY FULL;

-- Ensure profiles is FULL so we can listen to updates if needed, though mostly we listen to matches/notifications
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
