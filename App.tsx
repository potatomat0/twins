import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, Theme as NavTheme } from '@react-navigation/native';
import AppNavigator from '@navigation/AppNavigator';
import { ThemeProvider, useTheme } from '@context/ThemeContext';
import { LocaleProvider } from '@context/LocaleContext';
import { toRgb, toRgba } from '@themes/index';

function NavigationWithTheme() {
  const { theme, name } = useTheme();
  const navTheme: NavTheme = {
    ...DefaultTheme,
    dark: name === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: toRgb(theme.colors['--bg']),
      card: toRgb(theme.colors['--surface']),
      text: toRgb(theme.colors['--text-primary']),
      border: toRgba(theme.colors['--border'], 0.1),
      primary: toRgb(theme.colors['--brand-primary']),
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <NavigationWithTheme />
      </ThemeProvider>
    </LocaleProvider>
  );
}
