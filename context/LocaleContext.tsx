import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  translations,
  Locale,
  TranslationDictionary,
  TranslationValue,
} from '@i18n/translations';

type TranslationParams = Record<string, string | number>;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  availableLocales: Locale[];
  t: (key: string, params?: TranslationParams) => string;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const KEY_DELIMITER = '.';

function extractString(
  dict: TranslationDictionary | undefined,
  segments: string[],
): string | undefined {
  let current: TranslationValue | undefined = dict;
  for (const segment of segments) {
    if (!current || typeof current === 'string') {
      return typeof current === 'string' ? current : undefined;
    }
    current = current[segment];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, token) => {
    if (Object.prototype.hasOwnProperty.call(params, token)) {
      return String(params[token]);
    }
    return match;
  });
}

function translateWithFallback(locale: Locale, key: string, params?: TranslationParams) {
  const segments = key.split(KEY_DELIMITER);
  const localeValue = extractString(translations[locale], segments);

  if (localeValue && localeValue.trim().length > 0) {
    return interpolate(localeValue, params);
  }

  if (__DEV__ && locale !== DEFAULT_LOCALE) {
    console.warn(`[i18n] Missing translation for key "${key}" in locale "${locale}"`);
  }

  const fallbackValue = extractString(translations[DEFAULT_LOCALE], segments);
  if (fallbackValue && fallbackValue.trim().length > 0) {
    return interpolate(fallbackValue, params);
  }

  return key;
}

type LocaleProviderProps = {
  children: ReactNode;
  initialLocale?: Locale;
};

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children, initialLocale }) => {
  const [locale, setLocale] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);
  const STORAGE_KEY = '@twins:locale';

  useEffect(() => {
    (async () => {
      if (initialLocale) return;
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_LOCALES.includes(saved as Locale)) {
        setLocale(saved as Locale);
      }
    })();
  }, [initialLocale]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, locale).catch(() => {});
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      availableLocales: SUPPORTED_LOCALES,
      t: (key: string, params?: TranslationParams) => translateWithFallback(locale, key, params),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return ctx;
}

export function useTranslation() {
  const ctx = useLocale();
  return {
    t: ctx.t,
    locale: ctx.locale,
    setLocale: ctx.setLocale,
    availableLocales: ctx.availableLocales,
  };
}
