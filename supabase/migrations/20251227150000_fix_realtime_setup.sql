-- Fix duplicate publication membership by dropping and re-adding (safe idempotent way)
-- Or just altering replica identity which is the missing piece

ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- We ignore the publication add error since they are already added, but we need to ensure REPLICA IDENTITY.