import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated, Easing, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
import { toRgb, toRgba } from '@themes/index';
import SwipeHeader from '@components/common/SwipeHeader';
import Button from '@components/common/Button';
import NotificationModal from '@components/common/NotificationModal';
import { STEP2_QUESTIONS, getStep2CategoryLabel, getStep2QuestionText } from '@data/step2QuestionTexts';
import { useSessionStore } from '@store/sessionStore';
import haptics from '@services/haptics';
import { Feather } from '@expo/vector-icons';

type Nav = StackNavigationProp<RootStackParamList, 'Step2Questionnaire'>;
type Route = RouteProp<RootStackParamList, 'Step2Questionnaire'>;
type Props = { navigation: Nav; route: Route };

type Step2AnswerMap = Record<string, 0 | 1>;

const Step2QuestionnaireScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t, locale } = useTranslation();
  const { step2QuestionnaireDraft, setStep2QuestionnaireDraft, clearStep2QuestionnaireDraft, setResumeTarget } =
    useSessionStore();
  const hydratedRef = useRef(false);
  const paramsRef = useRef(route.params);
  const insets = useSafeAreaInsets();
  const questionSet = STEP2_QUESTIONS;
  const total = questionSet.length;
  const [answers, setAnswers] = useState<Step2AnswerMap>({});
  const [index, setIndex] = useState(0);
  const current = questionSet[index];
  const currentValue = current ? answers[current.id] : undefined;
  const progress = useMemo(() => (total > 0 ? Math.round(((index + 1) / total) * 100) : 0), [index, total]);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [barWidth, setBarWidth] = useState(0);
  const [confirmBack, setConfirmBack] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    paramsRef.current = route.params;
  }, [route.params]);

  useEffect(() => {
    const target = (progress / 100) * (barWidth || 1);
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, barWidth, progressAnim]);

  const questionText = useMemo(
    () => (current ? getStep2QuestionText(locale, current.id) : ''),
    [locale, current?.id],
  );
  const categoryLabel = useMemo(
    () => (current ? getStep2CategoryLabel(locale, current.category) : ''),
    [locale, current?.category],
  );

  useFocusEffect(
    useCallback(() => {
      setResumeTarget('step2Questionnaire');
      return undefined;
    }, [setResumeTarget]),
  );

  useEffect(() => {
    if (hydratedRef.current) return;
    if (step2QuestionnaireDraft) {
      setAnswers(step2QuestionnaireDraft.answers ?? {});
      const nextIndex = step2QuestionnaireDraft.index ?? 0;
      setIndex(Math.min(nextIndex, Math.max(total - 1, 0)));
    }
    hydratedRef.current = true;
  }, [step2QuestionnaireDraft, total]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    setStep2QuestionnaireDraft({
      answers,
      index,
      params: paramsRef.current,
      lastUpdated: Date.now(),
    });
  }, [answers, index, setStep2QuestionnaireDraft]);

  const onSelect = (value: 0 | 1) => {
    if (!current) return;
    haptics.selection();
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  };

  const onNext = async () => {
    await haptics.selection();
    if (index < total - 1) {
      setIndex((i) => i + 1);
    } else {
      await onFinish();
    }
  };

  const onPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  const onFinish = useCallback(async () => {
    const vector = questionSet.map((q) => answers[q.id] ?? 0);
    clearStep2QuestionnaireDraft();
    navigation.navigate('Step2Results', {
      username: route.params?.username ?? '',
      email: route.params?.email ?? '',
      ageGroup: route.params?.ageGroup ?? '',
      gender: route.params?.gender ?? '',
      scores: route.params?.scores ?? {},
      pcaFingerprint: route.params?.pcaFingerprint,
      step2Answers: answers,
      step2Vector: vector,
    });
  }, [answers, clearStep2QuestionnaireDraft, navigation, questionSet, route.params]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  if (!current) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
        <SwipeHeader title={t('step2.title')} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), fontSize: 16 }}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <SwipeHeader title={t('step2.title')} onBack={() => setConfirmBack(true)} />
      <View style={styles.header}>
        <Text style={[styles.counter, { color: toRgb(theme.colors['--text-primary']) }]}>
          {index + 1}/{total}
        </Text>
        <View
          style={[styles.progressWrap, { backgroundColor: toRgba(theme.colors['--border'], 0.12) }]}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View style={{ width: progressAnim, height: '100%', overflow: 'hidden' }}>
            <View style={{ flex: 1, backgroundColor: toRgb(theme.colors['--brand-primary']) }} />
          </Animated.View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.stage}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.question, { borderColor: toRgba(theme.colors['--border'], 0.08), backgroundColor: toRgba(theme.colors['--border'], 0.06) }]}>
          <Text style={[styles.category, { color: toRgb(theme.colors['--text-secondary']) }]}>{categoryLabel}</Text>
          <Text style={[styles.qtext, { color: toRgb(theme.colors['--text-primary']) }]}>{questionText}</Text>
          <View style={styles.optionsRow}>
            <Pressable
              onPress={() => onSelect(0)}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  borderColor: currentValue === 0 ? toRgb(theme.colors['--danger']) : toRgba(theme.colors['--border'], 0.2),
                  backgroundColor: currentValue === 0 ? toRgba(theme.colors['--danger'], 0.12) : 'transparent',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('step2.scale.no')}
              accessibilityState={{ selected: currentValue === 0 }}
            >
              <Feather name="x" size={18} color={toRgb(theme.colors['--danger'])} />
            </Pressable>
            <Pressable
              onPress={() => onSelect(1)}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  borderColor: currentValue === 1 ? toRgb(theme.colors['--brand-primary']) : toRgba(theme.colors['--border'], 0.2),
                  backgroundColor: currentValue === 1 ? toRgba(theme.colors['--brand-primary'], 0.12) : 'transparent',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('step2.scale.yes')}
              accessibilityState={{ selected: currentValue === 1 }}
            >
              <Feather name="check" size={18} color={toRgb(theme.colors['--brand-primary'])} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footerRow, { bottom: Math.max(16, insets.bottom + 12) }]}>
        <View style={{ flex: 1 }}>
          <Button title={t('step2.buttons.previous')} variant="neutral" onPress={onPrev} disabled={index === 0} />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          {index < total - 1 ? (
            <Button title={t('step2.buttons.next')} onPress={onNext} disabled={currentValue === undefined} />
          ) : (
            <Button title={t('step2.buttons.finish')} onPress={onNext} disabled={currentValue === undefined} />
          )}
        </View>
      </View>

      <NotificationModal
        visible={confirmBack}
        title={t('step2.confirm.title')}
        message={t('step2.confirm.message')}
        primaryText={t('step2.confirm.leave')}
        onPrimary={() => {
          setConfirmBack(false);
          navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
        }}
        secondaryText={t('step2.confirm.stay')}
        onSecondary={() => setConfirmBack(false)}
        onRequestClose={() => setConfirmBack(false)}
        primaryVariant="danger"
        secondaryVariant="accent"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  counter: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  progressWrap: { height: 12, borderRadius: 8, overflow: 'hidden' },
  stage: { flexGrow: 1, padding: 24, justifyContent: 'center', paddingBottom: 100 },
  question: { borderWidth: 2, borderRadius: 12, padding: 24, minHeight: 220, justifyContent: 'center' },
  category: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center', marginBottom: 10 },
  qtext: { fontSize: 20, marginBottom: 20, fontWeight: '700', textAlign: 'center' },
  optionsRow: { flexDirection: 'row', gap: 12 },
  optionCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: { position: 'absolute', left: 16, right: 16, flexDirection: 'row' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default Step2QuestionnaireScreen;
