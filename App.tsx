import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, NavigationContainer, Theme as NavTheme, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from '@navigation/AppNavigator';
import { ThemeProvider, useTheme } from '@context/ThemeContext';
import { LocaleProvider } from '@context/LocaleContext';
import { AuthProvider, useAuth } from '@context/AuthContext';
import { toRgb, toRgba } from '@themes/index';
import AnimatedSplash from '@components/AnimatedSplash';
import { useAppResources } from '@hooks/useAppResources';
import type { RootStackParamList } from '@navigation/AppNavigator';

SplashScreen.preventAutoHideAsync().catch(() => {});

const navigationRef = createNavigationContainerRef<RootStackParamList>();

function NavigationWithTheme({ onReady }: { onReady: () => void }) {
  const { theme, name } = useTheme();
  const navTheme: NavTheme = useMemo(
    () => ({
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
    }),
    [theme, name],
  );

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} onReady={onReady}>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </NavigationContainer>
  );
}

function AppShell() {
  const assetsReady = useAppResources();
  const { user, profile, loading } = useAuth();
  const appReady = assetsReady && !loading;
  const [splashVisible, setSplashVisible] = useState(true);
  const [navReady, setNavReady] = useState(false);
  const lastResolvedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!appReady) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [appReady]);

  useEffect(() => {
    if (!appReady || !navReady || !navigationRef.isReady()) {
      return;
    }

    const email = user?.email ?? '';
    const metadataName = (user?.user_metadata as any)?.username;
    const derivedUsername = profile?.username ?? metadataName ?? (email ? email.split('@')[0] : 'Friend');
    const currentRoute = navigationRef.getCurrentRoute();
    const targetKey = user ? `Dashboard:${user.id}` : 'Login';

    if (user) {
      if (lastResolvedKeyRef.current === targetKey && currentRoute?.name === 'Dashboard') {
        return;
      }
      lastResolvedKeyRef.current = targetKey;
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'Dashboard', params: { username: derivedUsername, email } }],
      });
      return;
    }

    if (currentRoute?.name === 'Dashboard') {
      lastResolvedKeyRef.current = targetKey;
      navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
  }, [appReady, navReady, user, profile]);

  return (
    <View style={{ flex: 1 }}>
      <NavigationWithTheme onReady={() => setNavReady(true)} />
      {splashVisible && <AnimatedSplash ready={appReady} onFinish={() => setSplashVisible(false)} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LocaleProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </ThemeProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
