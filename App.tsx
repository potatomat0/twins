import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, Theme as NavTheme } from '@react-navigation/native';
import AppNavigator from '@navigation/AppNavigator';
import { ThemeProvider, useTheme } from '@context/ThemeContext';
import { LocaleProvider } from '@context/LocaleContext';
import { toRgb, toRgba } from '@themes/index';
import AnimatedSplash from '@components/AnimatedSplash';
import { useAppResources } from '@hooks/useAppResources';

SplashScreen.preventAutoHideAsync().catch(() => {});

type NavigationWithThemeProps = {
  onReady?: () => void;
};

function NavigationWithTheme({ onReady }: NavigationWithThemeProps) {
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
    <NavigationContainer theme={navTheme} onReady={onReady}>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const resourcesReady = useAppResources();
  const [splashVisible, setSplashVisible] = useState(true);

  const handleSplashFinished = useCallback(() => {
    setSplashVisible(false);
  }, []);

  useEffect(() => {
    if (!splashVisible && resourcesReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [splashVisible, resourcesReady]);

  return (
    <LocaleProvider>
      <ThemeProvider>
        <View style={{ flex: 1 }}>
          {resourcesReady && <NavigationWithTheme />}
          {splashVisible && (
            <AnimatedSplash ready={resourcesReady} onFinish={handleSplashFinished} />
          )}
        </View>
      </ThemeProvider>
    </LocaleProvider>
  );
}
