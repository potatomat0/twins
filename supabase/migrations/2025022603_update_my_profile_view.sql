-- Update my_profile view to include email verification status
create or replace view public.my_profile as
select
  p.id,
  p.username,
  p.age_group,
  p.gender,
  p.personality_fingerprint,
  p.character_group,
  u.email,
  u.email_confirmed_at
from public.profiles p
join auth.users u on u.id = p.id
where p.id = auth.uid();

-- Ensure permissions are correct (re-granting is safe)
grant select on public.my_profile to authenticated;
