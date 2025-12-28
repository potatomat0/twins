# Repository Lookup Map

High-level overview of the directories and core files you will touch most often. Update this document whenever structure or ownership changes.

## Entry points
- `App.tsx`: wraps providers (locale, theme), renders `AppNavigator`, and hosts the animated splash overlay.
- `app.json`: Expo runtime configuration (name, splash options, platform-specific metadata).

## Application structure
- `components/`: Screen components and shared UI. Notable subfolders:
  - `components/common/`: Reusable primitives (buttons, modals, dropdowns, etc.).
  - `components/charts/`: SVG/chart renderers (e.g., radar chart).
  - `components/ProfileDetailModal.tsx`: Reusable modal for detailed user profile view (matches, hobbies).
- `navigation/`: Stack navigator definitions (`AppNavigator.tsx`).
- `context/`: React context providers (`ThemeContext`, `LocaleContext`, `AuthContext`).
- `hooks/`: Custom hooks (`useAppResources`, `useAutoDismissKeyboard`, etc.).
- `i18n/`: Translation dictionaries and helpers.
- `themes/`: Theme definitions (`index.ts` exposes `themes`, `toRgb`, `toRgba`).
- `services/`: External integrations.
  - `services/supabase.ts`: Supabase client, auth, and profile/hobby data fetching.
  - `services/RealtimeManager.ts`: Centralized singleton for all Supabase Realtime subscriptions (Matches, Messages, Notifications).
  - `services/scoreCrypto.ts`: Client-side wrapper for generic encryption (hobbies) and Big Five scoring.
  - `services/storage.ts`: Avatar upload and optimized image URL generation.
- `services/pcaEvaluator.ts`: Lazy loader for the TensorFlow Lite PCA converter (`assets/ml/pca_evaluator_4d.tflite`).
- `store/`: Zustand-powered global state.
  - `store/sessionStore.ts`: Persistence for registration/onboarding drafts and resume logic.
  - `store/messagesStore.ts`: Global inbox threads, last message previews, and unread indicators.
  - `store/notificationStore.ts`: Realtime notification list and global badge counts.
- `assets/`: Static assets organised by type (`images`, `sound`, `svg`).
- `assets/ml/`: TensorFlow Lite artifacts (`pca_evaluator_4d.tflite`).
- `Documents/`: Product notes, conventions, lookup references (this file), progress log.
  - `Documents/nlp_recommendation_system.md`: Architecture of the hobby matching system.
- `data/`: Static datasets (question bank, scoring helpers).

## Backend & Infra
- `services/supabase.ts`: Primary data access layer. Now handles single-table `profiles` schema with encrypted traits.
- `supabase/functions/`: Deno Edge Functions.
  - `score-crypto/`: AES-256-GCM encryption/decryption for generic payloads (Big Five + Hobbies).
  - `recommend-users/`: Hybrid matching algorithm (PCA + ELO + Hobbies).
  - `get-profile-details/`: Secure fetch for full user profile (bypassing RLS for authorized matches/likes).
  - `embed/`: Vector embedding generator (currently using deterministic hashing for stability).
  - `match-update/`: Handles ELO updates and mutual match creation.
  - `notify/`: Notification dispatcher.
- `supabase/migrations/`: SQL migration history.
- `Documents/supabase.md` & `Documents/supbabase_current_schema.md`: Schema definitions and architecture notes.

## Tooling
- `babel.config.js`: Module resolver aliases.
- `tsconfig.json`: TypeScript compiler options.
- `package.json` / `yarn.lock`: Dependency management (Yarn only).

## Documentation pointers
- `Documents/coding-Convention.md`: House rules for contributing code.
- `Documents/progress.md`: Chronological change log.