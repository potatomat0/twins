# Twins Localization Guide

## i18n Overview

The app now routes all user-facing copy through a locale-aware context so we can ship English, Japanese, and Vietnamese variants without rewriting components. English strings live in `i18n/translations.ts`; Japanese (`ja`) and Vietnamese (`vi`) entries are scaffolded with empty values ready to be filled in.

## Localization Architecture

- `context/LocaleContext.tsx` wraps the app (see `App.tsx`) and exposes `useTranslation()` which returns the `t(key, params?)` helper alongside the active locale and a setter.
- Login includes a language selector built with the shared `Dropdown`, letting testers switch locales at runtime.
- Shared primitives (Dropdown, NotificationModal, SocialButton) consume `t()` for their defaults, reducing per-screen duplication.

## Translation Catalog

`i18n/translations.ts` groups copy by domain (`common`, `login`, `registration`, `questionnaire`, `results`, `character`, `createAccount`, `verifyEmail`, etc.). Keys mirror usage in components—for example `t('createAccount.errors.invalidEmail')`.

- Add English content when introducing a new key; leave `ja`/`vi` placeholders blank until translations are available.
- Favor descriptive key paths (`errors.invalidEmail`, `notices.profileSaveMessage`) so the intent is obvious.

## Questionnaire Copy

The personality statements now live in `data/questionTexts.ts`. Scoring metadata remains in `data/questions.ts`, while localized sentences live under `QUESTION_TEXTS` (indexed by item number).

1. Edit `QUESTION_TEXTS.en[itemNumber]` for English tweaks.
2. Fill in `QUESTION_TEXTS.ja` / `QUESTION_TEXTS.vi` when translations are ready.
3. `components/QuestionnaireScreen.tsx` calls `getQuestionText(locale, itemNumber)` and falls back to English automatically, so no UI change is required.

## Screen Coverage

- **Login / Registration / Create Account / Verify Email / Questionnaire / Results / Character**: titles, instructions, action buttons, validation errors, and notices all come from the translation catalog. Supabase error messages still surface when provided; otherwise localized fallbacks are shown.
- **NotificationModal** defaults its primary button to `t('common.ok')` if a custom label isn’t supplied.
- **Social sign-in placeholders** use `createAccount.socials.*` for headings, modal copy, and provider names.

## Common Components

- `components/common/Dropdown.tsx` resolves its placeholder/header via `t('common.select')` when no custom text is passed.
- `components/common/SocialButton.tsx` builds labels/accessibility text with `t('common.signInWithProvider', { provider })`.
- `components/common/NotificationModal.tsx` pulls the default primary label from `common.ok` and accepts localized titles/messages from callers.

## Color Scheme

Themes are defined in `themes/index.ts` and provided by `ThemeProvider`. Components should continue to feed copy through `t()` while using theme tokens (`--bg`, `--surface`, `--text-primary`, `--focus`, etc.) via `toRgb`/`toRgba` for visual consistency. Localization does not alter color handling.

## User Flow Snapshot

1. **Login**: switch locales, sign in, or jump to Registration.
2. **Registration**: collect profile info and navigate to Questionnaire (data forwarded to Create Account later).
3. **Questionnaire**: localized statements from `QUESTION_TEXTS`; users must answer all 50 items to continue.
4. **Results**: shows localized factor labels, top-three summary, and navigation into Character or Create Account.
5. **Character**: displays the localized persona description and routes to Create Account with prefills.
6. **Create Account**: localized form validations, notices, and OTP initiation (when email confirmation is enabled).
7. **Verify Email**: localized OTP verification with resend flow and profile finalization.

## Updating Copy

When adding new UI text:

1. Add a key to `i18n/translations.ts` under the appropriate namespace (and optional placeholders for `ja`/`vi`).
2. Reference the key via `t('namespace.path')` inside the component.
3. For questionnaire statements, update `data/questionTexts.ts` instead of embedding strings in components.
4. Run a quick manual check using the Login screen’s language switcher to confirm the new copy renders and the English fallback works.
