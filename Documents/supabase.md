Supabase - Now the backend service for Twins

Project URL: https://gkbcdqpkjxdjjgolvgeg.supabase.co
API Key: (See env/secrets)

# Current schema (app usage)

The app relies on `auth.users` for identity and the `public` schema for application data.

## Core Tables

- **`public.profiles`**: Extended user data (username, demographics, personality scores, ELO). Keyed by `auth.users.id`.
- **`public.matches`**: Mutual connections between users.
- **`public.match_events`**: Log of user swipes/interactions (used for recommendation algo).
- **`public.messages`**: Real-time chat messages between matched users.
- **`public.notifications`**: User alerts (new likes, matches, messages).

## Security (RLS)
All tables in `public` have Row Level Security (RLS) enabled.
- **Profiles**: Users can read/write their own profile.
- **Matches/Messages**: Strict access control ensuring users only see data they are part of.
- **Notifications**: Users only see notifications where they are the recipient.

## Edge Functions

- **`score-crypto`**: Encrypts/Decrypts Big Five personality scores using AES-256-GCM.
- **`recommend-users`**: Generates user feed based on similarity and ELO.
- **`match-update`**: Handles swipe actions, updates ELO, creates matches.
- **`notify`**: Centralized notification dispatcher (handles deduplication).

# Production notes

1) **Authentication**: Handled via Supabase Auth.
2) **Profile Data**: Stored in `public.profiles`.
3) **Real-time**: The app subscribes to `messages` (for chat) and `notifications` (for badges/alerts).
4) **Secrets**: Ensure `B5_ENCRYPTION_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are set in Edge Function secrets.

## Client Config
Use `expo-constants` or `EXPO_PUBLIC_` env vars to inject Supabase URL and Anon Key.