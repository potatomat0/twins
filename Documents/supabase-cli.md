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
- Run ad-hoc SQL from a file (against production):
  ```bash
  npx supabase sql --file path/to/query.sql
  ```
- Open a psql-like session via the dashboard shell:
  ```bash
  npx supabase db remote commit -o shell
  ```
- Apply a SQL migration to the remote database:
  ```bash
  npx supabase db remote commit --file supabase/migrations/YYYYMMDD_name.sql
  ```
  Use with caution; review migration files before running.
- Diff local schema against remote (useful when preparing migrations):
  ```bash
  npx supabase db diff --use-provisioned-db > supabase/migrations/YYYYMMDD_name.sql
  ```
  (Requires a local Postgres if you want diff generation; otherwise generate directly from a dev environment.)

## Safety checklist
- Never run `npx supabase db remote reset` unless explicitly intended to wipe production data.
- Prefer read-only `sql` queries when investigating issues; double-check commands before executing.
- Store credentials in environment variables or a secure secrets manager; avoid hard-coding passwords in scripts.

Update this file whenever the CLI workflow evolves or new best practices are adopted.
