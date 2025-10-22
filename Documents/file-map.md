# Repository Lookup Map

High-level overview of the directories and core files you will touch most often. Update this document whenever structure or ownership changes.

## Entry points
- `App.tsx`: wraps providers (locale, theme), renders `AppNavigator`, and hosts the animated splash overlay.
- `app.json`: Expo runtime configuration (name, splash options, platform-specific metadata).

## Application structure
- `components/`: Screen components and shared UI. Notable subfolders:
  - `components/common/`: Reusable primitives (buttons, modals, dropdowns, etc.).
  - `components/charts/`: SVG/chart renderers (e.g., radar chart).
- `navigation/`: Stack navigator definitions (`AppNavigator.tsx`).
- `context/`: React context providers (`ThemeContext`, `LocaleContext`, etc.).
- `hooks/`: Custom hooks (resource loading, TensorFlow model loader placeholders).
- `i18n/`: Translation dictionaries and helpers.
- `themes/`: Theme definitions (`index.ts` exposes `themes`, `toRgb`, `toRgba`).
- `services/`: External integrations (Supabase client, haptics, audio).
- `store/`: Zustand-powered persistent state (draft flows, resume handling).
- `assets/`: Static assets organised by type (`images`, `sound`, `svg`). SVG imports currently rely on inline XML; clean raw files live under `assets/svg/`.
- `Documents/`: Product notes, conventions, lookup references (this file), progress log.
- `data/`: Static datasets (question bank, scoring helpers).
- `hooks/`, `services/`, `store/`: Support code referenced across screens; when adding new domain logic, ensure you update relevant lookups and documents here.

## Tooling
- `babel.config.js`: Module resolver aliases; keep in sync with TypeScript paths.
- `tsconfig.json`: TypeScript compiler options and path aliases.
- `package.json` / `yarn.lock`: Dependency management (Yarn only; see coding convention).

## Documentation pointers
- `Documents/coding-Convention.md`: House rules for contributing code. Update alongside this map whenever directory ownership or conventions shift.
- `Documents/progress.md`: Chronological change log; append a dated entry for notable adjustments (new screens, rewrites, infra changes).

