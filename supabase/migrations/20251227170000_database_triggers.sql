-- Function to handle new message notifications automatically
create or replace function public.handle_new_message_notify()
returns trigger
language plpgsql
security definer
as $$
declare
  sender_prof record;
begin
  -- Fetch sender details
  select id, username, avatar_url, age_group, gender, character_group
  into sender_prof
  from public.profiles
  where id = new.sender_id;

  -- Optional: Deduplicate recent message notifications from same sender?
  -- For now, we delete ANY unread message notification from this sender to this recipient
  -- so the badge count implies "number of conversations with updates" or just "latest alert".
  -- If we want a log of all messages, remove this delete.
  -- Let's keep the delete to match previous Edge Function logic (cleaner list).
  delete from public.notifications
  where recipient_id = new.receiver_id
    and actor_id = new.sender_id
    and type = 'message'
    and read = false;

  -- Insert new notification
  insert into public.notifications (recipient_id, actor_id, type, payload)
  values (
    new.receiver_id,
    new.sender_id,
    'message',
    jsonb_build_object(
      'message', new.body,
      'match_id', new.match_id,
      'actor', jsonb_build_object(
        'id', sender_prof.id,
        'username', coalesce(sender_prof.username, 'Someone'),
        'avatar_url', sender_prof.avatar_url,
        'age_group', sender_prof.age_group,
        'gender', sender_prof.gender,
        'character_group', sender_prof.character_group
      )
    )
  );

  return new;
end;
$$;

-- Trigger for Messages
drop trigger if exists on_new_message_notify on public.messages;
create trigger on_new_message_notify
after insert on public.messages
for each row execute function public.handle_new_message_notify();


-- Function to handle new match notifications automatically
create or replace function public.handle_new_match_notify()
returns trigger
language plpgsql
security definer
as $$
declare
  prof_a record;
  prof_b record;
begin
  select id, username, avatar_url, age_group, gender, character_group into prof_a from public.profiles where id = new.user_a;
  select id, username, avatar_url, age_group, gender, character_group into prof_b from public.profiles where id = new.user_b;

  -- Cleanup: Remove any existing 'like' notifications between these two (User A <-> User B)
  -- This prevents stale "Someone liked you" notifications from cluttering the list after a match.
  delete from public.notifications
  where (recipient_id = new.user_a and actor_id = new.user_b and type = 'like')
     or (recipient_id = new.user_b and actor_id = new.user_a and type = 'like');

  -- Notify User A about B
  insert into public.notifications (recipient_id, actor_id, type, payload)
  values (
    new.user_a,
    new.user_b,
    'mutual',
    jsonb_build_object(
      'message', 'You have a mutual match',
      'actor', jsonb_build_object(
        'id', prof_b.id,
        'username', coalesce(prof_b.username, 'Someone'),
        'avatar_url', prof_b.avatar_url,
        'age_group', prof_b.age_group,
        'gender', prof_b.gender,
        'character_group', prof_b.character_group
      )
    )
  );

  -- Notify User B about A
  insert into public.notifications (recipient_id, actor_id, type, payload)
  values (
    new.user_b,
    new.user_a,
    'mutual',
    jsonb_build_object(
      'message', 'You have a mutual match',
      'actor', jsonb_build_object(
        'id', prof_a.id,
        'username', coalesce(prof_a.username, 'Someone'),
        'avatar_url', prof_a.avatar_url,
        'age_group', prof_a.age_group,
        'gender', prof_a.gender,
        'character_group', prof_a.character_group
      )
    )
  );

  return new;
end;
$$;

-- Trigger for Matches
drop trigger if exists on_new_match_notify on public.matches;
create trigger on_new_match_notify
after insert on public.matches
for each row execute function public.handle_new_match_notify();
