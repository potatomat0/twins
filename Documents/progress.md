# Progress Log

- 2025-10-28: Auth persistence — introduced an AuthProvider that restores Supabase sessions via AsyncStorage during the splash sequence, ensuring valid users land on the Dashboard automatically and invalid tokens drop back to Login.
- 2025-12-20: ELO system integration — added ELO rating to profiles, implemented `match-update` edge function for cooperative rating adjustments, and updated Explore screen to use hybrid scoring (PCA + ELO).
- 2025-12-25: NLP Hobby Matching — implemented `embed` edge function (deterministic mock for stability), updated `recommend-users` to support hobby vectors, and added `hobbies_cipher` for privacy. Added `ProfileDetailModal` for viewing matches. Reverted to Single Table Architecture (`profiles`) for stability.
- 2025-12-26: UI Polish & Messaging — Improved Chat UI with user-scoped caching, single-line session separators, and auto-scroll fixes. Enhanced `UserSettingsScreen` with avatar cropping (expo-image-manipulator) and "Verified" email badge. Fixed `PGRST200` and `PGRST204` errors by sanitizing upsert payloads. Stabilized Edge Functions with robust error handling and reverted to Single Table Architecture to resolve join issues.
