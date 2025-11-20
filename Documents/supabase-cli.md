# Supabase CLI Usage

The Supabase CLI is configured to talk to the production project (`gkbcdqpkjxdjjgolvgeg`). Keep this file updated whenever CLI workflow changes.

**Reference docs consulted**
- `supabase login`: https://supabase.com/docs/reference/cli/login
- `supabase link`: https://supabase.com/docs/reference/cli/link
- `supabase sql`: https://supabase.com/docs/reference/cli/sql
- `db remote` commands: https://supabase.com/docs/reference/cli/db-remote-commit

## Setup steps
1. `npx supabase login`
   - Opens browser to authenticate. Stores a CLI token locally.
2. `npx supabase link`
   - Select the project (`gkbcdqpkjxdjjgolvgeg`). CLI prompts for database password once.
   - Saves project ref to `supabase/.temp/link.toml` and updates `.supabase/config.json`.

These steps have already been completed on this machine. Re-run only if switching accounts/projects.

## Common commands
- Open a psql-like shell against production (requires `psql` installed):
  ```bash
  PGPASSWORD=\"<db-password>\" \\
  psql \"host=db.gkbcdqpkjxdjjgolvgeg.supabase.co port=5432 dbname=postgres user=postgres sslmode=require\"
  ```
- List projects / check linking status:
  ```bash
  npx supabase projects list
  ```
- Manage secrets (non `SUPABASE_` env names):
  ```bash
  npx supabase secrets set DB_PASSWORD=...
  ```
- Diff the remote schema (for migrations):
  ```bash
  npx supabase db diff --use-provisioned-db > supabase/migrations/YYYYMMDD_name.sql
  ```

## Safety checklist
- Never run destructive commands (`db remote reset`, truncate tables, etc.) unless explicitly approved.
- Prefer read-only queries when investigating issues; double-check SQL before executing.
- Store credentials in `.env.local` (gitignored) or a secure secret manager.

Update this file whenever the CLI workflow evolves or new best practices are adopted.
