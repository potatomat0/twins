import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { themes, ThemeName, ThemeSpec } from '@themes/index';

type ThemeContextType = {
  theme: ThemeSpec;
  name: ThemeName;
  setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const initialTheme = systemScheme === 'light' ? 'light' : 'dark';
  const [name, setName] = useState<ThemeName>(initialTheme);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setName(colorScheme === 'light' ? 'light' : 'dark');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setName(systemScheme === 'light' ? 'light' : 'dark');
  }, [systemScheme]);
  const value = useMemo(
    () => ({ theme: themes[name], name, setTheme: setName }),
    [name]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
