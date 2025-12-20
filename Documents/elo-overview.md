# ELO + PCA Matching Overview

## What it is
- We blend personality similarity (PCA cosine) with an ELO-like score that adjusts as users are liked/skipped.
- Default weights: PCA 80%, ELO proximity 20% (ELO only reorders within similar PCA matches).
- Users can opt out via the `Use skill-based matching (ELO)` toggle in Settings (`match_allow_elo`).

## How it works
- `recommend-users` edge function:
  - Computes PCA cosine between the viewer and candidates.
  - If ELO is allowed (`match_allow_elo` and `useElo` flag), adds an ELO proximity term (closer ratings rank higher).
  - Sorts by the blended score; PCA remains primary.
- `match-update` edge function:
  - Called on each like/skip.
  - Updates both users’ `elo_rating` using a classic ELO formula (K=24) and logs `match_events` (actor/target/outcome, RLS-protected).

## Schema / Data
- `public.profiles`: `elo_rating numeric default 1200`, `match_allow_elo boolean default true`.
- `public.match_events`: actor-only insert/select via RLS; stores like/skip events.

## Privacy & Access
- ELO is stored server-side; not exposed to other users.
- RLS on `match_events` allows only the actor to insert/read their events.
- Profiles are already RLS-protected per auth.uid(); dev/DBA visibility depends on direct DB access (service key). Do not expose ELO in client responses beyond what the functions return internally.

## Manual testing
1) Ensure migration applied and functions deployed:
   - `supabase db push`
   - `supabase functions deploy recommend-users`
   - `supabase functions deploy match-update`
2) In app Settings, toggle ELO on/off.
3) Swipe in Explore: confirm the edge logs show `match-update` calls; ELO should drift slowly from 1200 on repeated likes/skips.
4) Verify in DB (service role) for test users:
   ```sql
   select username, elo_rating, match_allow_elo from public.profiles where username in ('similar_a','similar_b');
   select * from public.match_events order by created_at desc limit 10;
   ```

### CLI sanity check (service key)
Using the service key you can directly invoke `match-update` and observe rating changes:
```
node - <<'NODE'
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gkbcdqpkjxdjjgolvgeg.supabase.co', '<SERVICE_ROLE_KEY>', { auth: { autoRefreshToken:false, persistSession:false } });
const actor = 'b589e368-d4a2-4b31-b9b5-6ce78e682724'; // similar_a
const target = 'ef48b40e-6cb8-4a38-9f2c-8954fa080a09'; // similar_b
(async () => {
  console.log('before', (await supabase.from('profiles').select('username, elo_rating').in('id',[actor,target])).data);
  console.log('like', (await supabase.functions.invoke('match-update', { body:{ actorId: actor, targetId: target, outcome:'like' } })).data);
  console.log('after like', (await supabase.from('profiles').select('username, elo_rating').in('id',[actor,target])).data);
})();
NODE
```
You should see ELO move away from 1200 after each call (K=24).

## Real-world behavior
- Scenario: High PCA (e.g., 80%) vs low PCA (30%) but higher ELO.
  - PCA remains dominant; ELO only tweaks ordering among similarly good PCA matches.
  - If ELO is off, pure PCA is used.

## Toggle behavior
- Client passes `useElo` to `recommend-users`.
- `match_allow_elo` stored on profile; both must allow ELO to apply rating updates.
