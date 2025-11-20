# Remote Database Access

These credentials allow trusted agents to inspect the production Postgres instance when needed (e.g., to seed mock users or run quick diagnostics). Handle with care and rotate passwords regularly.

```
Host:     db.gkbcdqpkjxdjjgolvgeg.supabase.co
Port:     5432
Database: postgres
User:     postgres
Password: Matkhautwins1!
SSL:      required
```

Quick test command (requires `psql`):

```bash
PGPASSWORD="Matkhautwins1!" \
psql "host=db.gkbcdqpkjxdjjgolvgeg.supabase.co port=5432 dbname=postgres user=postgres sslmode=require" \
  -c "select id,email,email_confirmed_at from auth.users limit 3;"
```

## Mock account seeding
To bypass email confirmation for testing, run:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'mock@test.com') THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at, last_sign_in_at,
      raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'mock@test.com',
      crypt('MockPassword1!', gen_salt('bf')),
      now(), now(), now(), '{}'::jsonb, now(), now()
    );
  END IF;
END
$$;
```

This seeds `mock@test.com` with a confirmed password (`MockPassword1!`).

## PCA columns
`public.profiles` now includes four PCA dimensions (`pca_dim1` … `pca_dim4`, all double precision) that store the 4‑D fingerprint derived from the Big Five quiz. When inserting/updating profiles, set these columns alongside other metadata so matching queries can operate directly in SQL.

## Notes
- These credentials are stored locally in `.env.local` (gitignored). Do not commit them.
- Commands above were validated via `psql` as of 2025‑11‑20.
- If you rotate the database password, update both `.env.local` and this document.
