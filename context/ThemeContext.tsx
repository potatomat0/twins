import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { themes, ThemeName, ThemeSpec } from '@themes/index';

type ThemeContextType = {
  theme: ThemeSpec;
  name: ThemeName;
  setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemeName>('system');
  const resolvedName = preference === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : preference;

  const value = useMemo(
    () => ({ theme: themes[resolvedName], name: preference, setTheme: setPreference }),
    [preference, resolvedName]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
