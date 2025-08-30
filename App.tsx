import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, Theme as NavTheme } from '@react-navigation/native';
import AppNavigator from '@navigation/AppNavigator';
import { ThemeProvider, useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';

function NavigationWithTheme() {
  const { theme } = useTheme();
  const navTheme: NavTheme = {
    ...DefaultTheme,
    dark: true,
    colors: {
      ...DefaultTheme.colors,
      background: toRgb(theme.colors['--dark-bg']),
      card: toRgb(theme.colors['--dark-card']),
      text: toRgb(theme.colors['--text-primary']),
      border: 'rgba(255,255,255,0.1)',
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
    <ThemeProvider>
      <NavigationWithTheme />
    </ThemeProvider>
  );
}
