# Supabase Schema Reference

> **Last Updated:** 2025-02-26
> **Status:** Active

This document reflects the current database schema state for the Twins application.

## Schema: `public`

### Tables

#### `public.profiles`
Stores user profile data, Big Five scores (encrypted), and ELO rating.
*   `id` (`uuid`, PK, FK -> `auth.users.id`)
*   `username` (`text`, nullable)
*   `age_group` (`text`, nullable)
*   `gender` (`text`, nullable)
*   `character_group` (`varchar`, nullable)
*   `personality_fingerprint` (`float4`, nullable)
*   `pca_dim1` (`float8`, nullable)
*   `pca_dim2` (`float8`, nullable)
*   `pca_dim3` (`float8`, nullable)
*   `pca_dim4` (`float8`, nullable)
*   `b5_cipher` (`text`, nullable)
*   `b5_iv` (`text`, nullable)
*   `created_at` (`timestamptz`, default `now()`)
*   `elo_rating` (`numeric`, default `1200`)
*   `match_allow_elo` (`boolean`, default `true`)

**RLS Policies:**
*   `profiles_is_owner`: Users can select/update their own profile.

#### `public.match_events`
Log of user actions (like/skip) for the matching algorithm.
*   `id` (`uuid`, PK, default `gen_random_uuid()`)
*   `actor_id` (`uuid`, not null, FK -> `auth.users.id`)
*   `target_id` (`uuid`, not null, FK -> `auth.users.id`)
*   `outcome` (`text`, check: `like` | `skip`)
*   `created_at` (`timestamptz`, default `now()`)

**RLS Policies:**
*   `actor_can_insert`: Users can insert events where they are the actor.
*   `actor_can_select`: Users can see their own events.

#### `public.matches`
Established matches (mutual likes).
*   `id` (`uuid`, PK, default `gen_random_uuid()`)
*   `user_a` (`uuid`, not null, FK -> `auth.users.id`)
*   `user_b` (`uuid`, not null, FK -> `auth.users.id`)
*   `created_at` (`timestamptz`, default `now()`)
*   *Constraint:* Unique `(user_a, user_b)`

**RLS Policies:**
*   `match_select`: Users can see matches they are part of.
*   `match_insert`: Service role only (created by edge function).

#### `public.messages`
Chat messages between matched users.
*   `id` (`uuid`, PK, default `gen_random_uuid()`)
*   `match_id` (`uuid`, not null, FK -> `public.matches.id`)
*   `sender_id` (`uuid`, not null, FK -> `auth.users.id`)
*   `receiver_id` (`uuid`, not null, FK -> `auth.users.id`)
*   `body` (`text`, not null)
*   `created_at` (`timestamptz`, default `now()`)
*   `updated_at` (`timestamptz`, default `now()`)
*   `status` (`text`, default `sent`, check: `sending`|`sent`|`delivered`|`seen`|`error`)

**RLS Policies:**
*   `messages_select`: Users can see messages for their matches.
*   `messages_insert`: Users can send messages to their matches (sender=auth.uid).
*   `messages_update_status`: Sender or Receiver can update the row (primarily for status).

#### `public.notifications`
In-app notifications (Likes, New Matches, Messages).
*   `id` (`uuid`, PK, default `gen_random_uuid()`)
*   `recipient_id` (`uuid`, not null, FK -> `auth.users.id`)
*   `actor_id` (`uuid`, nullable, FK -> `auth.users.id`)
*   `type` (`text`, check: `like` | `mutual` | `message`)
*   `payload` (`jsonb`)
*   `read` (`boolean`, default `false`)
*   `created_at` (`timestamptz`, default `now()`)

**RLS Policies:**
*   `recipient_select`: Users can see their own notifications.
*   `recipient_update`: Users can update (mark read) their own notifications.
*   `service_insert`: Service role only.

### Views

#### `public.profile_lookup`
Secure view for looking up basic user info (username/avatar) by ID.
*   `id`
*   `username`
*   `avatar_url` (derived from profile or metadata)
*   `email`

#### `public.my_profile`
Convenience view for the current user to see their own profile + email.

---

## Schema: `auth` (Managed by Supabase)

Core authentication tables. *Do not modify manually.*

*   `auth.users`: The identity store.
*   `auth.sessions`: Active sessions.
*   `auth.refresh_tokens`: Refresh tokens.
*   (And other internal tables: `identities`, `mfa_factors`, etc.)