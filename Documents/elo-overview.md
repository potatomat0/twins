# ELO + PCA Matching Overview

## What it is
- We blend personality similarity (PCA cosine) with an ELO-like score that adjusts as users are liked/skipped.
- Default weights: PCA 80%, ELO proximity 20% (PCA stays primary; ELO only nudges ordering among close PCA matches).
- Users can toggle ELO in the Explore filters modal. Both sides must allow ELO (`match_allow_elo`) for updates to apply.

## How it works
- `recommend-users` edge:
  - Computes PCA cosine between the viewer and candidates.
  - If ELO is allowed (`match_allow_elo` + `useElo` flag), adds an ELO proximity term (`exp(-|Δelo|/σ)`, σ≈400). We can cap proximity floor if needed.
  - Final sort by score = 0.8 * PCA + 0.2 * proximity (fallback to PCA-only if ELO disabled).
- `match-update` edge (cooperative update, K=12, clamped 800–2000):
  - On like: both actor and target gain `K * (1 - expected)`; no one loses.
  - On skip: only actor loses `K * expected`; target unchanged.
  - Updates `elo_rating` on `profiles` (if both allow ELO) and logs `match_events` (actor/target/outcome, RLS-protected).

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

## Ranking behavior
- PCA remains dominant (80%). ELO proximity only nudges ordering when PCA is already close.
- Large ELO gaps reduce proximity; identical PCA favors similar ELO. To avoid harsh penalties for a 200–300 gap, keep the proximity term gentle (exp decay) and consider a floor if desired.

## Update behavior (cooperative)
- Like: both gain slightly (no one loses).
- Skip: only actor loses slightly.
- This avoids “punishing” the liked user and discourages mass skipping for rating gain.

## Real-world behavior
- Scenario: High PCA (e.g., 80%) vs low PCA (30%) but higher ELO.
  - PCA remains dominant; ELO only tweaks ordering among similarly good PCA matches.
  - If ELO is off, pure PCA is used.

## Toggle behavior
- Client passes `useElo` to `recommend-users`.
- `match_allow_elo` stored on profile; both must allow ELO to apply rating updates.
