# User Seeding (Mock Data for Cold-Start Testing)

## What was seeded
- 41 mock users (emails `mockuser{N}@seed.twins.dev`, usernames `mock_{N}`) created via Supabase Admin API.
- Each user has:
  - Raw Big Five scores (generated in-script), encrypted via edge function `score-crypto` into `b5_cipher` / `b5_iv`.
  - PCA-4 fingerprint (`pca_dim1..4`) computed with the same weights as the app (`services/pcaEvaluator.ts`).
  - Metadata: `age_group`, `gender`, `character_group` (determined from Big Five).

## Scripts
- `scripts/seedMockProfiles.js` (plain Node)  
  - Uses publishable/anon key for Edge Function calls and service role key for auth/profile inserts.  
  - Generates scores → encrypts via `score-crypto` → `auth.admin.createUser` → upserts `public.profiles`.
- `scripts/seedMockProfiles.ts` (TS version) kept for reference.

## How to run
```bash
SUPABASE_URL=https://gkbcdqpkjxdjjgolvgeg.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
SUPABASE_ANON_KEY=<anon_or_publishable_key> \
node scripts/seedMockProfiles.js
```
Notes:
- If rerun, existing emails will be skipped with `email_exists`.
- Adjust `usersToCreate` in the script if you need fewer/more users.

## Reporting view
- Created in Postgres:
```sql
create or replace view public.mock_profiles_report as
select p.id, u.email, p.username, p.age_group, p.gender, p.character_group,
       p.pca_dim1, p.pca_dim2, p.pca_dim3, p.pca_dim4, p.created_at
from public.profiles p
left join auth.users u on u.id = p.id
where p.username ilike 'mock_%';
```
- Use this view to inspect seeded PCA vectors and metadata for cold-start experiments.

## Next steps
- Hook `recommend-users` edge function to consume these profiles for similarity-based recommendations.
- Optionally add a script to decrypt a sample set (via `score-crypto`) to validate distribution.
