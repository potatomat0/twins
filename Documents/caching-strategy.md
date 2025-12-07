# Caching strategy (AsyncStorage)

- TTL policy: short-lived data (recommendation pools) expires after 7 days; session/profile/avatar URLs can be treated as long-lived (Supabase Auth already persists its session).
- Pools: stored under `pool:${userId}:{filters}` (swipe) and `pool:list:${userId}:{filters}` (list) with a 7‑day TTL using `services/cache.ts`. App reads cache before network and refreshes after fetch.
- Media: we do **not** store blobs in AsyncStorage. Avatars are served via public URLs (`user-upload/placeHolderUserImage.png` fallback). Supabase Storage cache/bucket handles media.
- Prefetch: when Explore screens mount, cache is read immediately while a fresh pool fetch runs in parallel. To prefetch earlier (e.g., during splash), call the same fetch + `setCache` from the boot flow once the user session is known.
- Helpers: `services/cache.ts` wraps `getCache/setCache/clearCache` with optional TTL; safe to reuse for other lightweight JSON payloads.
- Indefinite vs TTL:
  - Indefinite: Supabase session (handled by SDK), user profile fields, avatar URLs.
  - 7 days: recommendation pools or other derived lists likely to change.
  - Not stored: raw media blobs, secrets, or large datasets.
