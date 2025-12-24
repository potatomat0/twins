## Notifications & Messaging (Supabase)

- **Tables**
  - `public.notifications`: like/mutual/message notifications. Message notis are de-duplicated per actor/recipient on insert (edge `notify` deletes older message notis from the same actor/recipient before inserting the latest).
  - `public.matches`: mutual pairs (used to exclude from Explore and to scope messages).
  - `public.messages`: chat messages; columns include `status` (`sending|sent|delivered|seen|error`), `updated_at`. Status is updated by participants (RLS policy allows sender/receiver update).
  - `public.profile_lookup` view: joins `auth.users` with `public.profiles` to expose `id, username, avatar_url, email` for UI lookup (used by Messages/Chat).

- **Functions (edge)**
  - `match-update`: handles like/skip, mutual detection, match insert, mutual notifications, and ELO.
  - `notify`: inserts notifications and de-duplicates message notifications per actor/recipient.
  - (Deprecated RPC) `get_profile_lookup`: not used now; clients query `profile_lookup` view directly.

- **RLS / policies**
  - `messages_update_status` policy: sender or receiver can update message rows (for delivered/seen).

- **Client flows**
  - Messages/Chat fetch peer info from `profile_lookup` (fallback to ID only if missing).
  - Chat optimistic send shows `sending`; statuses update via realtime INSERT/UPDATE and mark inbound as delivered/seen.
  - Messages list shows threads from `matches`, displays peer avatar/name from view, last message preview.

- **Migrations**
  - 20250221_messages_status.sql — adds status, updated_at + trigger
  - 20250222_messages_update_policy.sql — RLS update policy for messages
  - 20250224_profile_lookup.sql — adds view
  - 20250224_profile_lookup_fn.sql — (present) function; client currently uses the view

