# Supabase Connection & Schema – Beginner Guide

This guide walks you through setting up Supabase for the Twins app, configuring the client in React Native (Expo), and applying the database schema (with safe, recommended practices). It assumes no prior Supabase experience.

---

## 1) Create a Supabase project

- Go to https://supabase.com → Sign in → New project
- Choose a name, region, and set a strong database password.
- Wait for provisioning (1–2 minutes).

You’ll need two values from your project:
- Project URL: Settings → API → Project URL
- Anon (public) API key: Settings → API → Project API keys → anon key

Important:
- The anon key is safe for client apps (public). Never put the service_role key in a mobile app.

---

## 2) Configure the app to connect to Supabase

The Twins app reads the URL and anon key from Expo config or env vars.

Option A (recommended for this repo): set them in `app.json` → `expo.extra`:

```
{
  "expo": {
    ...,
    "extra": {
      "supabaseUrl": "https://YOUR_PROJECT.supabase.co",
      "supabaseAnonKey": "YOUR_ANON_KEY"
    }
  }
}
```

Option B: environment variables (EAS builds, CI):
- Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in your build environment.

The client code (already in repo): `services/supabase.ts`
- Uses `expo-constants` to read `extra.supabaseUrl` and `extra.supabaseAnonKey`.
- Falls back to `EXPO_PUBLIC_` env vars if not present in `app.json`.

---

## 3) Email provider (for OTP confirmation)

If you keep “Confirm email” enabled (recommended for production):
- Auth → Providers → Email → Confirm email: ON
- Auth → Email templates: Customize confirmation email contents (optional).
- Auth → SMTP settings: If you need a custom sender/domain, configure SMTP. Supabase also provides a default email service for testing.

If you prefer auto-login in dev, turn OFF “Confirm email”. The app already supports both flows.

---

## 4) Database schema (app data) – recommended practice

The app stores profile fields in `public.profiles`. User email remains in `auth.users` (authoritative). We expose a safe read-only view that joins email for the current user.

Run the following SQL in the Supabase SQL Editor:

```
-- Enable RLS and owner-only policy on profiles
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
  created_at timestamptz default now(),
  character_group varchar
);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_is_owner'
  ) then
    create policy profiles_is_owner
      on public.profiles
      for all
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

-- Read-only view for the current user exposing email via join
create or replace view public.my_profile as
select
  p.id,
  p.username,
  p.age_group,
  p.gender,
  p.personality_fingerprint,
  p.character_group,
  u.email
from public.profiles p
join auth.users u on u.id = p.id
where p.id = auth.uid();

revoke all on public.my_profile from public;
grant select on public.my_profile to authenticated;

-- Optional: admin-wide view (for server tools using service_role)
create or replace view public.profiles_with_email_all as
select p.*, u.email
from public.profiles p
join auth.users u on u.id = p.id;

revoke all on public.profiles_with_email_all from public;
grant select on public.profiles_with_email_all to service_role;
```

Why a view? It avoids duplicating email in two tables and keeps auth.users as the single source of truth.

---

## 5) How the app uses the schema

- Authentication (sign up / sign in / sign out): Supabase Auth (`auth.users`).
- Signup preflight checks: the app queries a `public.users` view (exposing `auth.users`) to catch duplicate emails or usernames before attempting `auth.signUp`. Ensure this view grants select access to anonymous/unauthenticated clients if you rely on the same UX.
- Recommended helper view:
  ```
  create or replace view public.users as
  select
    id,
    email,
    raw_user_meta_data
  from auth.users;

  revoke all on public.users from public;
  grant select on public.users to anon;
  ```
- Profile data writes: `public.profiles` via `upsertProfile({ id, username, age_group, gender, character_group })`.
- Profile reads with email (when needed): `select * from public.my_profile` via `fetchMyProfile()`.
- Character group: computed on-device from questionnaire results (not user-editable), saved in `public.profiles.character_group`.
- Email OTP flow (when confirmation ON):
  1) User signs up in Create Account.
  2) If no session is returned (email unconfirmed), app navigates to Verify Email screen.
  3) User enters the 6-digit code → `verifyOtp()`; if session still absent, app signs in with email/password.
  4) App upserts profile under the authenticated session and navigates to Dashboard (auto-login). In other words, `auth.users` receives the initial signup payload, and only after the email is confirmed do we write to `public.profiles`.

Relevant code files:
- `services/supabase.ts` – client creation, auth helpers, `upsertProfile`, `fetchProfile`, `fetchMyProfile`, OTP helpers.
- `components/CreateAccountScreen.tsx` – signup flow and fallback to OTP.
- `components/VerifyEmailScreen.tsx` – OTP entry/verification, auto-login, profile upsert.
- `components/LoginScreen.tsx` – standard login and profile bootstrap.

---

## 6) Testing checklist

- Environment
  - Project URL and anon key configured in `app.json` or env.
  - Device can receive the confirmation email (if confirmation ON).
- Database & Policies
  - `public.profiles` exists, RLS enabled, policy present.
  - `public.my_profile` view exists and is selectable by authenticated users.
- Flows
  - Confirm email OFF: Create Account logs in automatically and reaches Dashboard.
  - Confirm email ON: Create Account → Verify Email → enter OTP → lands on Dashboard (auto-login) and a row in `public.profiles` is created/updated.
- Reads
  - (Optional) If you wire a UI to display email, use `fetchMyProfile()` to read it from the view.

---

## 7) Troubleshooting

- “Invalid login credentials”: Confirm the user is verified (if confirmation ON) and password is correct.
- No confirmation email received:
  - Check Auth → Providers → Email → Confirm email is ON.
  - Check Auth → SMTP / sender setup if using a custom sender.
  - Use “Resend code” in the Verify Email screen.
- “RLS violation” on profiles:
  - Ensure RLS is enabled and the `profiles_is_owner` policy exists as shown.
  - You must be authenticated to upsert/select your own profile.
- “Missing Supabase config” warning in logs:
  - Verify `supabaseUrl` and `supabaseAnonKey` are set in `app.json` or env.

---

## 8) Security reminders

- Never embed the `service_role` key in the mobile app. Only use it in secured backend contexts.
- Keep PII duplication to a minimum. Read email via `my_profile` rather than storing it in `public.profiles`.
- Review RLS policies for each table you add.

You’re set! After this, the app’s registration, OTP verification, and profile upsert should work end-to-end with your Supabase project.
