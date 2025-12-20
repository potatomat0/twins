import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import Button from '@components/common/Button';
import { useTranslation } from '@context/LocaleContext';
import { useAuth } from '@context/AuthContext';
import { decryptScoresRemote, type ScoresPayload } from '@services/scoreCrypto';
import RadarChart from '@components/charts/RadarChart';
import { FACTOR_LABEL_KEYS } from '@data/factors';

type Nav = StackNavigationProp<RootStackParamList, 'Dashboard'>;
type Route = RouteProp<RootStackParamList, 'Dashboard'>;
type Props = { navigation: Nav; route: Route };

const DashboardScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, name, setTheme } = useTheme();
  const { t } = useTranslation();
  const { signOut, user, profile } = useAuth();
  const hasRouteScores = useMemo(
    () => Boolean(route.params?.scores && Object.keys(route.params.scores ?? {}).length > 0),
    [route.params?.scores],
  );
  const [scores, setScores] = useState<ScoresPayload | null>(hasRouteScores ? route.params?.scores ?? null : null);
  const [scoreState, setScoreState] = useState<'idle' | 'loading' | 'ready' | 'error'>(hasRouteScores ? 'ready' : 'idle');
  const [scoreError, setScoreError] = useState<string | null>(null);
  const email = user?.email ?? '';
  const username =
    route.params?.username ||
    profile?.username ||
    (user?.user_metadata as any)?.username ||
    (email ? email.split('@')[0] : 'Friend');

  useEffect(() => {
    if (!route.params?.scores) return;
    setScores(route.params.scores ?? null);
    setScoreState('ready');
    setScoreError(null);
  }, [route.params?.scores]);

  // Refetch on focus if we have encrypted scores but local state is empty
  useFocusEffect(
    React.useCallback(() => {
      if (!profile?.b5_cipher || !profile?.b5_iv) return;
      if (scoreState === 'ready' && scores) return;
      setScoreState('loading');
      setScoreError(null);
      (async () => {
        try {
          const decrypted = await decryptScoresRemote(profile.b5_cipher as string, profile.b5_iv as string);
          if (decrypted) {
            setScores(decrypted);
            setScoreState('ready');
          } else {
            setScores(null);
            setScoreState('error');
            setScoreError(t('dashboard.decryptError'));
          }
        } catch (err: any) {
          setScores(null);
          setScoreState('error');
          setScoreError(err?.message ?? t('dashboard.decryptError'));
        }
      })();
    }, [profile?.b5_cipher, profile?.b5_iv, scoreState, scores, t]),
  );

  useEffect(() => {
    let active = true;
    if (!profile?.b5_cipher || !profile?.b5_iv) {
      if (!hasRouteScores) {
        setScores(null);
        setScoreState('idle');
        setScoreError(null);
      }
      return () => {
        active = false;
      };
    }
    if (!hasRouteScores) {
      setScoreState('loading');
    }
    setScoreError(null);
    (async () => {
      try {
        const decrypted = await decryptScoresRemote(profile.b5_cipher as string, profile.b5_iv as string);
        if (!active) return;
        if (decrypted) {
          setScores(decrypted);
          setScoreState('ready');
        } else if (!hasRouteScores) {
          setScores(null);
          setScoreState('error');
          setScoreError(t('dashboard.decryptError'));
        }
      } catch (error: any) {
        if (!active) return;
        if (!hasRouteScores) {
          setScores(null);
          setScoreState('error');
          setScoreError(error?.message ?? t('dashboard.decryptError'));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [profile?.b5_cipher, profile?.b5_iv, hasRouteScores, t]);

  const chartData = useMemo(() => {
    if (!scores) return null;
    return [
      { label: 'Extraversion', score: (scores['Extraversion'] ?? 0) * 100 },
      { label: 'Agreeableness', score: (scores['Agreeableness'] ?? 0) * 100 },
      { label: 'Conscientiousness', score: (scores['Conscientiousness'] ?? 0) * 100 },
      { label: 'Emotional Stability', score: (scores['Emotional Stability'] ?? 0) * 100 },
      { label: 'Intellect/Imagination', score: (scores['Intellect/Imagination'] ?? 0) * 100 },
    ];
  }, [scores]);

  const topTraits = useMemo(() => {
    if (!scores) return [];
    return Object.entries(scores)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, 3);
  }, [scores]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}> 
      <View style={styles.center}>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{t('dashboard.title', { username })}</Text>
        <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>{t('dashboard.subtitle')}</Text>
        <View style={{ height: 16 }} />
        <View style={{ width: '100%', alignItems: 'center' }}>
          {scoreState === 'loading' ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={toRgb(theme.colors['--brand-primary'])} />
              <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginLeft: 8 }}>{t('dashboard.loadingScores')}</Text>
            </View>
          ) : null}
          {scoreState === 'ready' && chartData ? (
            <>
              <RadarChart
                data={chartData}
                color={theme.colors['--brand-primary']}
                iconColor={theme.colors['--accent-cyan']}
                closeColor={theme.colors['--danger']}
                tooltipMaxHeight={220}
              />
              <View style={{ width: '100%', marginTop: 16 }}>
                <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>
                  {t('dashboard.topTraits')}
                </Text>
                {topTraits.map(([key, value]) => {
                  const labelKey = FACTOR_LABEL_KEYS[key as keyof typeof FACTOR_LABEL_KEYS];
                  const factorLabel = labelKey ? t(labelKey) : key;
                  const percent = Math.round((value ?? 0) * 100);
                  return (
                    <Text key={key} style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 4 }}>
                      {t('results.screen.strengthEntry', { factor: factorLabel, value: `${percent}%` })}
                    </Text>
                  );
                })}
              </View>
            </>
          ) : null}
          {scoreState === 'idle' ? (
            <Text style={{ color: toRgb(theme.colors['--text-muted']), textAlign: 'center', marginTop: 8 }}>
              {t('dashboard.missingScores')}
            </Text>
          ) : null}
          {scoreState === 'error' ? (
            <Text style={{ color: toRgb(theme.colors['--danger']), textAlign: 'center', marginTop: 8 }}>
              {scoreError ?? t('dashboard.decryptError')}
            </Text>
          ) : null}
        </View>
        <View style={{ height: 24 }} />
        <Button
          title={name === 'dark' ? t('common.themeToggle.toLight') : t('common.themeToggle.toDark')}
          onPress={() => setTheme(name === 'dark' ? 'light' : 'dark')}
        />
        <View style={{ height: 16 }} />
        <Button
          title={t('dashboard.logout')}
          variant="neutral"
          onPress={async () => {
            await signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
          }}
        />
      </View>
    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
});
