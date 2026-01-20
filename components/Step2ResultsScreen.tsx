import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
import { toRgb } from '@themes/index';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import RadarChart from '@components/charts/RadarChart';
import KeyboardDismissable from '@components/common/KeyboardDismissable';
import NotificationModal from '@components/common/NotificationModal';
import { STEP2_QUESTIONS, getStep2CategoryLabel } from '@data/step2QuestionTexts';
import { useSessionStore } from '@store/sessionStore';
import { useFocusEffect } from '@react-navigation/native';
import SwipeHeader from '@components/common/SwipeHeader';

type Nav = StackNavigationProp<RootStackParamList, 'Step2Results'>;
type Route = RouteProp<RootStackParamList, 'Step2Results'>;
type Props = { navigation: Nav; route: Route };

type CategoryScore = { category: string; yesCount: number; total: number };

const Step2ResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t, locale } = useTranslation();
  const { setStep2ResultsDraft, setResumeTarget, clearStep2ResultsDraft } = useSessionStore();
  const answers = route.params?.step2Answers ?? {};
  const vector = route.params?.step2Vector ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setResumeTarget('step2Results');
      return undefined;
    }, [setResumeTarget]),
  );

  React.useEffect(() => {
    if (route.params) {
      setStep2ResultsDraft({ params: route.params, lastUpdated: Date.now() });
    }
  }, [route.params, setStep2ResultsDraft]);

  const scores = useMemo(() => {
    const byCategory: Record<string, CategoryScore> = {};
    for (const q of STEP2_QUESTIONS) {
      if (!byCategory[q.category]) {
        byCategory[q.category] = { category: q.category, yesCount: 0, total: 0 };
      }
      const val = answers[q.id] ?? 0;
      byCategory[q.category].total += 1;
      byCategory[q.category].yesCount += val;
    }
    return Object.values(byCategory);
  }, [answers]);

  const chartData = useMemo(
    () =>
      scores.map((item) => ({
        label: getStep2CategoryLabel(locale, item.category as any),
        score: item.total ? Math.round((item.yesCount / item.total) * 100) : 0,
      })),
    [scores, locale],
  );

  const summaryLine = useMemo(() => {
    if (scores.length === 0) return null;
    const yesCategories = scores.filter((item) => item.yesCount > 0);
    if (yesCategories.length === 0) return t('step2Results.summaryNone');
    if (yesCategories.length === scores.length) return t('step2Results.summaryAll');
    const labels = yesCategories.map((item) => getStep2CategoryLabel(locale, item.category as any));
    return t('step2Results.summarySome', { categories: labels.join(', ') });
  }, [scores, locale, t]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleContinue = () => {
    clearStep2ResultsDraft();
    navigation.navigate('CreateAccount', {
      username: route.params?.username ?? '',
      email: route.params?.email ?? '',
      ageGroup: route.params?.ageGroup ?? '',
      gender: route.params?.gender ?? '',
      scores: route.params?.scores ?? {},
      pcaFingerprint: route.params?.pcaFingerprint,
      step2Answers: answers,
      step2Vector: vector,
    });
  };

  const handleRestart = () => {
    clearStep2ResultsDraft();
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Step2Questionnaire' as any,
          params: {
            username: route.params?.username ?? '',
            email: route.params?.email ?? '',
            ageGroup: route.params?.ageGroup ?? '',
            gender: route.params?.gender ?? '',
            scores: route.params?.scores ?? {},
            pcaFingerprint: route.params?.pcaFingerprint,
          },
        },
      ],
    });
  };

  return (
    <KeyboardDismissable>
      <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
        <SwipeHeader title={t('step2Results.title')} onBack={handleRestart} />
        <ScrollView
          contentContainerStyle={{ padding: 16, alignItems: 'center' }}
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
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
              {t('step2Results.title')}
            </Text>
            <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>
              {t('step2Results.subtitle')}
            </Text>
            {summaryLine ? (
              <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 8 }}>
                {summaryLine}
              </Text>
            ) : null}
            <View style={{ height: 12 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button title={t('step2Results.back')} variant="neutral" onPress={handleRestart} />
              <Button title={t('step2Results.continue')} onPress={handleContinue} />
            </View>
            <View style={{ height: 10 }} />
            <Button title={t('step2Results.startOver')} variant="danger" onPress={() => setConfirmReset(true)} />
          </Card>
        </ScrollView>

        <NotificationModal
          visible={confirmReset}
          title={t('step2Results.confirmTitle')}
          message={t('step2Results.confirmMessage')}
          primaryText={t('step2Results.confirmLeave')}
          onPrimary={() => {
            setConfirmReset(false);
            navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
          }}
          secondaryText={t('step2Results.confirmStay')}
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

export default Step2ResultsScreen;
