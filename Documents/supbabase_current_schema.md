# Supabase Schema Reference

> **Last Updated:** 2025-02-26
> **Status:** Active (Single Table Architecture)

## Schema: `public`

### Tables

#### `public.profiles`
Consolidated user data table. Contains public identity, encrypted traits, and matching vectors.
*   `id` (`uuid`, PK, FK -> `auth.users.id`)
*   `username` (`text`, nullable)
*   `age_group` (`text`, nullable)
*   `gender` (`text`, nullable)
*   `avatar_url` (`text`, nullable)
*   `character_group` (`varchar`, nullable)
*   `elo_rating` (`numeric`, default `1200`)
*   `match_allow_elo` (`boolean`, default `true`)
*   **Personality (Encrypted)**:
    *   `b5_cipher` (`text`): Encrypted Big Five scores.
    *   `b5_iv` (`text`): Initialization vector.
*   **Hobbies (Encrypted + Vector)**:
    *   `hobbies_cipher` (`text`): Encrypted list of hobby keywords.
    *   `hobbies_iv` (`text`): Initialization vector.
    *   `hobby_embedding` (`vector(384)`): Semantic vector for matching.
    *   *(Note: `hobbies` plaintext column is deprecated/unused).*
*   **Matching Vectors**:
    *   `pca_dim1` - `pca_dim4` (`float8`): Principal Component Analysis dimensions.

**RLS Policies:**
*   `profiles_is_owner`: Users can select/update their own profile.

#### `public.matches`
Established matches (mutual likes).
*   `id` (`uuid`, PK)
*   `user_a` / `user_b` (`uuid`, FK -> `auth.users`)
*   Constraint: Unique pair.

#### `public.match_events`
Log of user actions (like/skip) for the matching algorithm.
*   `actor_id` / `target_id`
*   `outcome` (`like` | `skip`)

#### `public.messages`
Chat messages.
*   `match_id`, `sender_id`, `receiver_id`, `body`, `status`.

#### `public.notifications`
In-app notifications.
*   `recipient_id`, `actor_id`, `type`, `payload`, `read`.

### Views

#### `public.my_profile`
Convenience view joining `profiles` with `auth.users.email` and `email_confirmed_at`.

#### `public.profile_lookup`
Secure lookup view for basic user info (username/avatar) by ID.

---

## Edge Functions

### `recommend-users`
*   **Logic**: Hybrid Matching.
*   **Formula**:
    *   *Default*: `0.8 * PCA + 0.2 * ELO`
    *   *With Hobbies*: `0.6 * PCA + 0.15 * ELO + 0.25 * Hobby`
*   **Returns**: Candidate pool with `similarity` score and encrypted hobbies.

### `embed`
*   **Logic**: Generates 384-dimensional vector from text.
*   **Model**: Currently uses a **Deterministic Hash Mock** for stability on free-tier edge runtime.
*   **Future**: Can be swapped for `Supabase/gte-small` or OpenAI API.

### `score-crypto`
*   **Logic**: AES-256-GCM encryption/decryption.
*   **Usage**: Handles both Personality Scores (object) and Hobbies (array).

### `match-update`
*   **Logic**: Updates ELO ratings (cooperative) and creates mutual matches.
