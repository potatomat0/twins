Supabase - Now the backend service for Twins

Project URL: https://gkbcdqpkjxdjjgolvgeg.supabase.co
API Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYmNkcXBranhkampnb2x2Z2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTY1OTQsImV4cCI6MjA3MjkzMjU5NH0.1vN3V6uGpmtVdo1GvMPUYOXtT_e96gnOrxJNaebbf98

Javascript connection example (generic): 

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gkbcdqpkjxdjjgolvgeg.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
```

# Current schema (app usage)

- Authentication: `auth.users` (managed by Supabase Auth)
- Profile data (public): `public.profiles` keyed by `auth.users.id`

The app signs up and signs in users via Supabase Auth and stores per-user profile fields in `public.profiles` using the authenticated user’s UUID as the primary key.

Profiles schema used by the app:

```
public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  age_group text,
  gender text,
  personality_fingerprint float4,
  pca_dim1 double precision,
  pca_dim2 double precision,
  pca_dim3 double precision,
  pca_dim4 double precision,
  b5_cipher text,
  b5_iv text,
  created_at timestamptz default now()
  email varchar unique 
  character_group varchar 
)
```

---

# Production notes

The app now relies solely on `auth.users` + `public.profiles`.

1) Ensure `public.profiles` exists and is protected with RLS

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  age_group text,
  gender text,
  personality_fingerprint float4,
  pca_dim1 double precision,
  pca_dim2 double precision,
  pca_dim3 double precision,
  pca_dim4 double precision,
  b5_cipher text,
  b5_iv text,
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "profiles_is_owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
```

2) Avoid storing plaintext passwords in any custom table

- Authentication must be handled by Supabase Auth (email/password or OAuth providers).
- The app should never store or handle plaintext passwords in `public.profiles`.

3) Optional: constrain profile fields

- You may replace `age_group` and `gender` with real Postgres enums or check constraints to mirror your product taxonomy.

4) Client config

- In this repo, the Supabase URL and anon key are read via Expo Constants (see `app.json` extra) or `EXPO_PUBLIC_` env vars and passed to `@supabase/supabase-js`.

5) Dev UX: disable email confirmation for auto‑login

- In Supabase → Auth → Providers → Email, turn OFF "Confirm email". With confirmations disabled, `auth.signUp` returns a session and the app navigates straight to the Dashboard. If you keep confirmations ON, the app attempts a fallback `signIn` but will show a notice when the user is still unconfirmed and cannot sign in yet.

## Edge Function: score-crypto
- Located at `supabase/functions/score-crypto`. Provides AES-256-GCM encrypt/decrypt services for the raw Big Five scores.
- Requires secret `B5_ENCRYPTION_KEY` (Base64-encoded 32-byte key). Set via:
  ```bash
  npx supabase secrets set B5_ENCRYPTION_KEY=$(openssl rand -base64 32)
  ```
- API contract (POST JSON):
  - `{ \"mode\": \"encrypt\", \"scores\": { ... } }` → `{ \"cipher\": \"...\", \"iv\": \"...\" }`
  - `{ \"mode\": \"decrypt\", \"payload\": \"...\", \"iv\": \"...\" }` → `{ \"scores\": { ... } }`
