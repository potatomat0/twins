import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
import { toRgb } from '@themes/index';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import RadarChart from '@components/charts/RadarChart';
import KeyboardDismissable from '@components/common/KeyboardDismissable';
import NotificationModal from '@components/common/NotificationModal';
import { FACTOR_LABEL_KEYS } from '@data/factors';

type Nav = StackNavigationProp<RootStackParamList, 'Results'>;
type Route = RouteProp<RootStackParamList, 'Results'>;
type Props = { navigation: Nav; route: Route };

const ResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const username = route.params?.username ?? '';
  const email = route.params?.email ?? '';
  const ageGroup = route.params?.ageGroup ?? '';
  const gender = route.params?.gender ?? '';
  const { width: windowWidth } = useWindowDimensions();
  const scores = route.params?.scores ?? {
    'Extraversion': 0.5,
    'Agreeableness': 0.5,
    'Conscientiousness': 0.5,
    'Emotional Stability': 0.5,
    'Intellect/Imagination': 0.5,
  };
  const pcaFingerprint = route.params?.pcaFingerprint;

  const chartData = useMemo(
    () => [
      { label: 'Extraversion', score: (scores['Extraversion'] ?? 0) * 100 },
      { label: 'Agreeableness', score: (scores['Agreeableness'] ?? 0) * 100 },
      { label: 'Conscientiousness', score: (scores['Conscientiousness'] ?? 0) * 100 },
      { label: 'Emotional Stability', score: (scores['Emotional Stability'] ?? 0) * 100 },
      { label: 'Intellect/Imagination', score: (scores['Intellect/Imagination'] ?? 0) * 100 },
    ],
    [scores],
  );

  const top3 = useMemo(
    () =>
      Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    [scores],
  );

  const resolvedName = username?.trim().length ? username.trim() : t('results.screen.defaultName');

  const [refreshing, setRefreshing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <KeyboardDismissable>
      <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}> 
        <ScrollView
          contentContainerStyle={{ padding: 16, alignItems: 'center' }}
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Full-width chart */}
          <View style={{ width: '100%', alignItems: 'center', marginBottom: -32 }}>
            <RadarChart
              data={chartData}
              color={theme.colors['--brand-primary']}
              iconColor={theme.colors['--accent-cyan']}
              closeColor={theme.colors['--danger']}
              tooltipMaxHeight={220}
            />
          </View>

          <Card>
            <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>
              {t('results.screen.title', { username: resolvedName })}
            </Text>
            <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>
              {t('results.screen.subtitle')}
            </Text>
            {top3.map(([key, value]) => {
              const labelKey = FACTOR_LABEL_KEYS[key as keyof typeof FACTOR_LABEL_KEYS];
              const factorLabel = labelKey ? t(labelKey) : key;
              const percent = Math.round((value ?? 0) * 100);
              return (
                <Text key={key} style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 4 }}>
                  {t('results.screen.strengthEntry', { factor: factorLabel, value: `${percent}%` })}
                </Text>
              );
            })}
            <View style={{ height: 12 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title={t('results.screen.startOver')}
                variant="neutral"
                onPress={() => setConfirmReset(true)}
              />
              <Button
                title={t('results.screen.continue')}
                onPress={() =>
                  navigation.navigate('Character' as any, {
                    username,
                    email,
                    ageGroup,
                    gender,
                    scores,
                    pcaFingerprint,
                  })
                }
              />
            </View>
          </Card>
        </ScrollView>
        <NotificationModal
          visible={confirmReset}
          title={t('results.screen.confirmTitle')}
          message={t('results.screen.confirmMessage')}
          primaryText={t('results.screen.confirmLeave')}
          onPrimary={() => { setConfirmReset(false); navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] }); }}
          secondaryText={t('results.screen.confirmStay')}
          onSecondary={() => setConfirmReset(false)}
          onRequestClose={() => setConfirmReset(false)}
          primaryVariant="danger"
          secondaryVariant="accent"
        />
      </SafeAreaView>
    </KeyboardDismissable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { marginTop: 8, marginBottom: 8 },
});

export default ResultsScreen;
