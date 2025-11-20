import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, ScrollView, RefreshControl, Animated, Easing, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
import { toRgb, toRgba } from '@themes/index';
import { QUESTIONS, type Question } from '@data/questions';
import { getQuestionText } from '@data/questionTexts';
import Button from '@components/common/Button';
import { AnswerMap, computeBigFiveScores, normalizeScoresToUnitRange, FACTORS, type Factor } from '@services/profileAnalyzer';
import { projectScoresToPca } from '@services/pcaEvaluator';
import KeyboardDismissable from '@components/common/KeyboardDismissable';
import SwipeHeader from '@components/common/SwipeHeader';
import NotificationModal from '@components/common/NotificationModal';
import haptics from '@services/haptics';
import { useSound } from '@services/sound';
import { Svg, Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { useSessionStore } from '@store/sessionStore';

type Nav = StackNavigationProp<RootStackParamList, 'Questionnaire'>;
type Route = RouteProp<RootStackParamList, 'Questionnaire'>;
type Props = { navigation: Nav; route: Route };

const OPTION_COLORS: Record<1|2|3|4|5, string> = {
  1: '239 68 68', // red
  2: '234 88 12', // dark orange
  3: '120 120 130', // grey
  4: '34 211 238', // cyan
  5: '59 130 246', // blue
};

const TOTAL_ACTIVE_QUESTIONS = 25;

type FactorPools = Record<Factor, { positive: Question[]; negative: Question[] }>;

function buildFactorPools(): FactorPools {
  const pools = {} as FactorPools;
  for (const factor of FACTORS) {
    pools[factor] = { positive: [], negative: [] };
  }
  for (const q of QUESTIONS) {
    const pool = pools[q.Factor_Name];
    if (q.Direction === '+') {
      pool.positive.push(q);
    } else {
      pool.negative.push(q);
    }
  }
  return pools;
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pullRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  const index = Math.floor(Math.random() * items.length);
  return items.splice(index, 1)[0];
}

function generateQuestionSet(): Question[] {
  const pools = buildFactorPools();
  const workingPools: FactorPools = {} as FactorPools;
  for (const factor of FACTORS) {
    workingPools[factor] = {
      positive: [...pools[factor].positive],
      negative: [...pools[factor].negative],
    };
  }

  const perTrait = Math.round(TOTAL_ACTIVE_QUESTIONS / FACTORS.length);
  const basePerDirection = Math.floor(perTrait / 2);
  const remainderPerTrait = perTrait - basePerDirection * 2;
  let extraDirection: '+' | '-' = '+';
  const chosen: Question[] = [];

  for (const factor of FACTORS) {
    const pool = workingPools[factor];
    const factorSelection: Question[] = [];

    for (let i = 0; i < basePerDirection; i += 1) {
      const pos = pullRandom(pool.positive);
      if (pos) factorSelection.push(pos);
      const neg = pullRandom(pool.negative);
      if (neg) factorSelection.push(neg);
    }

    for (let r = 0; r < remainderPerTrait; r += 1) {
      const wantPositive = extraDirection === '+';
      let pick = wantPositive ? pullRandom(pool.positive) : pullRandom(pool.negative);
      if (!pick) {
        pick = wantPositive ? pullRandom(pool.negative) : pullRandom(pool.positive);
      }
      if (!pick) {
        pick = pullRandom(pool.positive.length ? pool.positive : pool.negative);
      }
      if (pick) {
        factorSelection.push(pick);
        extraDirection = extraDirection === '+' ? '-' : '+';
      }
    }

    chosen.push(...factorSelection);
  }

  if (chosen.length < TOTAL_ACTIVE_QUESTIONS) {
    const selectedIds = new Set(chosen.map((q) => q.Item_Number));
    const remaining = shuffleArray(QUESTIONS.filter((q) => !selectedIds.has(q.Item_Number)));
    for (const q of remaining) {
      chosen.push(q);
      if (chosen.length >= TOTAL_ACTIVE_QUESTIONS) break;
    }
  }

  return shuffleArray(chosen.slice(0, TOTAL_ACTIVE_QUESTIONS));
}

const QuestionnaireScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t, locale } = useTranslation();
  const { questionnaireDraft, setQuestionnaireDraft, clearQuestionnaireDraft, setResumeTarget } = useSessionStore();
  const hydratedRef = useRef(false);
  const paramsRef = useRef(route.params);
  useEffect(() => {
    paramsRef.current = route.params;
  }, [route.params]);
  const questionMap = useMemo(() => {
    const map = new Map<number, Question>();
    for (const q of QUESTIONS) {
      map.set(q.Item_Number, q);
    }
    return map;
  }, []);
  const [questionIds, setQuestionIds] = useState<number[]>([]);
  const questionSet = useMemo(() => {
    if (questionIds.length === 0) return [] as Question[];
    return questionIds
      .map((id) => questionMap.get(id))
      .filter((q): q is Question => Boolean(q));
  }, [questionIds, questionMap]);
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [index, setIndex] = useState(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isSmall = windowWidth < 380;
  // Gating flow: no need for modals or cycling state

  useEffect(() => {
    if (questionIds.length > 0) return;
    const saved = questionnaireDraft?.questionIds;
    if (saved && saved.length > 0 && saved.every((id) => questionMap.has(id))) {
      setQuestionIds(saved);
    } else {
      const generated = generateQuestionSet().map((q) => q.Item_Number);
      setQuestionIds(generated);
    }
  }, [questionnaireDraft, questionIds.length, questionMap]);


  const total = questionSet.length;
  const answeredCount = useMemo(() => questionSet.reduce((acc, q) => (answers[q.Item_Number] ? acc + 1 : acc), 0), [answers, questionSet]);
  // Progress follows question index (X/total) for a clearer sense of progress
  const progress = useMemo(() => (total > 0 ? Math.round(((index + 1) / total) * 100) : 0), [index, total]);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const target = (progress / 100) * (barWidth || 1);
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, barWidth]);

  const current = total > 0 ? questionSet[index] : undefined;
  const currentValue = current ? answers[current.Item_Number] : undefined;
  const questionText = useMemo(
    () => (current ? getQuestionText(locale, current.Item_Number) : ''),
    [locale, current?.Item_Number],
  );

  const optionLabels: Record<1 | 2 | 3 | 4 | 5, string> = useMemo(
    () => ({
      1: t('questionnaire.scale.disagree'),
      2: t('questionnaire.scale.slightlyDisagree'),
      3: t('questionnaire.scale.neutral'),
      4: t('questionnaire.scale.slightlyAgree'),
      5: t('questionnaire.scale.agree'),
    }) as Record<1 | 2 | 3 | 4 | 5, string>,
    [t],
  );

  const onSelect = (id: number, value: 1 | 2 | 3 | 4 | 5) => {
    setAnswers((prev) => {
      const hadPrev = !!prev[id];
      const prevCount = Object.keys(prev).length;
      const next = { ...prev, [id]: value } as AnswerMap;
      // Subtle haptic only when this selection completes the last remaining answer
      if (!hadPrev && prevCount === total - 1) {
        // fire and forget
        haptics.selection();
      }
      return next;
    });
  };

  const pop = useSound('pop');
  const onNext = async () => {
    try { pop.seekTo?.(0); } catch {}
    try { await pop.play(); } catch {}
    await haptics.medium();
    setTimeout(() => haptics.light(), 60);
    if (index < total - 1) setIndex((i) => i + 1);
    else await onFinish();
  };

  const onPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  const onFinish = useCallback(async () => {
    const { sums, counts } = computeBigFiveScores(answers, questionSet);
    const normalized = normalizeScoresToUnitRange(sums, counts);
    let pcaFingerprint: Awaited<ReturnType<typeof projectScoresToPca>> | undefined;
    try {
      pcaFingerprint = await projectScoresToPca(normalized);
    } catch (error) {
      if (__DEV__) console.warn('[Questionnaire] Failed to compute PCA fingerprint', error);
    }
    clearQuestionnaireDraft();
    navigation.navigate('Results', {
      username: route.params?.username ?? '',
      email: route.params?.email ?? '',
      ageGroup: route.params?.ageGroup ?? '',
      gender: route.params?.gender ?? '',
      scores: normalized,
      pcaFingerprint: pcaFingerprint ?? undefined,
    });
  }, [answers, questionSet, clearQuestionnaireDraft, navigation, route.params]);

  // No incomplete modal needed with gating

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const [confirmBack, setConfirmBack] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setResumeTarget('questionnaire');
      return undefined;
    }, [setResumeTarget]),
  );

  useEffect(() => {
    if (hydratedRef.current) return;
    if (questionSet.length === 0) return;
    if (questionnaireDraft) {
      setAnswers(questionnaireDraft.answers ?? {});
      const nextIndex = questionnaireDraft.index ?? 0;
      setIndex(Math.min(nextIndex, Math.max(questionSet.length - 1, 0)));
    }
    hydratedRef.current = true;
  }, [questionSet.length, questionnaireDraft]);

  useEffect(() => {
    if (!hydratedRef.current || questionSet.length === 0 || questionIds.length === 0) return;
    setQuestionnaireDraft({
      answers,
      index,
      params: paramsRef.current,
      questionIds,
      lastUpdated: Date.now(),
    });
    if (__DEV__) {
      console.log('[Questionnaire] draft persisted', {
        answered: Object.keys(answers).length,
        index,
        total: questionSet.length,
      });
    }
  }, [answers, index, questionIds, questionSet.length, setQuestionnaireDraft]);

  if (!current) {
    return (
      <KeyboardDismissable>
        <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}> 
          <SwipeHeader title={t('questionnaire.title')} onBack={() => navigation.goBack()} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), fontSize: 16 }}>{t('common.loading')}</Text>
          </View>
        </SafeAreaView>
      </KeyboardDismissable>
    );
  }

  return (
    <KeyboardDismissable>
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <SwipeHeader title={t('questionnaire.title')} onBack={() => setConfirmBack(true)} />
      <View style={styles.header}>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']), textAlign: 'center' }]}>{index + 1}/{total}</Text>
        <View
          style={[styles.progressWrap, { backgroundColor: toRgba(theme.colors['--border'], 0.12) }]}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View style={{ width: progressAnim, height: '100%', overflow: 'hidden' }}>
            <Svg width={barWidth || 0} height="100%">
              <Defs>
                <SvgLinearGradient id="grad" x1="0" y1="0" x2={barWidth || 1} y2="0" gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor={toRgba(theme.colors['--brand-primary'], 0.6)} />
                  <Stop offset={(barWidth || 1) * 0.6} stopColor={toRgb(theme.colors['--brand-primary'])} />
                  <Stop offset={barWidth || 1} stopColor={toRgba(theme.colors['--accent-cyan'], 0.9)} />
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width={barWidth || 0} height="100%" fill="url(#grad)" />
            </Svg>
          </Animated.View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.stage}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.question, { borderColor: toRgba(theme.colors['--border'], 0.08), backgroundColor: toRgba(theme.colors['--border'], 0.06) }]}> 
          <Text style={[styles.qtext, { color: toRgb(theme.colors['--text-primary']) }]}> 
            {questionText}
          </Text>

          {/* Horizontal Likert scale with icons only */}
          <View style={styles.optionsRow}>
            {[1, 2, 3, 4, 5].map((v) => {
              const selected = currentValue === (v as 1 | 2 | 3 | 4 | 5);
              const colorTriplet = OPTION_COLORS[v as 1 | 2 | 3 | 4 | 5];
              const color = toRgb(colorTriplet);
              const iconSize = isSmall ? 28 : 32;
              return (
                <Pressable
                  key={v}
                  onPress={() => onSelect(current.Item_Number, v as 1 | 2 | 3 | 4 | 5)}
                  style={({ pressed }) => [
                    styles.optionV,
                    {
                      flex: 1,
                      marginHorizontal: 4,
                      alignItems: 'center',
                      borderColor: selected ? color : toRgba(theme.colors['--border'], 0.12),
                      borderWidth: selected ? 2 : 1,
                      backgroundColor: 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={optionLabels[v as 1 | 2 | 3 | 4 | 5]}
                  accessibilityState={{ selected }}
                >
                  {({ pressed }) => (
                    <View
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: color,
                        shadowOpacity: selected ? 0.5 : 0,
                        shadowRadius: selected ? 12 : 0,
                        elevation: selected ? 6 : 0,
                        transform: [{ scale: selected ? 0.94 : pressed ? 0.92 : 1 }],
                      }}
                    >
                      {v === 1 && <Feather name="x" size={iconSize} color={color} />}
                      {v === 2 && <FontAwesome name="arrow-down" size={iconSize} color={color} />}
                      {v === 3 && <FontAwesome name="circle" size={iconSize - 2} color={color} />}
                      {v === 4 && <FontAwesome name="arrow-up" size={iconSize} color={color} />}
                      {v === 5 && <FontAwesome name="check" size={iconSize} color={color} />}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer navigation: no early finish allowed */}
      <View style={[styles.footerRow, { bottom: Math.max(16, insets.bottom + 12) }]}>
        <View style={{ flex: 1 }}>
          <Button title={t('questionnaire.buttons.previous')} variant="neutral" onPress={onPrev} disabled={index === 0} />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          {index < total - 1 ? (
            <Button title={t('questionnaire.buttons.next')} onPress={onNext} disabled={!currentValue} />
          ) : (
            <Button title={t('questionnaire.buttons.finish')} onPress={onNext} disabled={!currentValue} />
          )}
        </View>
      </View>

      {/* Back-confirmation */}
      <NotificationModal
        visible={confirmBack}
        title={t('questionnaire.confirm.title')}
        message={t('questionnaire.confirm.message')}
        primaryText={t('questionnaire.confirm.leave')}
        onPrimary={() => { setConfirmBack(false); navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] }); }}
        secondaryText={t('questionnaire.confirm.stay')}
        onSecondary={() => setConfirmBack(false)}
        onRequestClose={() => setConfirmBack(false)}
        primaryVariant="danger"
        secondaryVariant="accent"
      />
    </SafeAreaView>
    </KeyboardDismissable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  progressWrap: { height: 14, borderRadius: 8, overflow: 'hidden' },
  stage: { flexGrow: 1, padding: 24, justifyContent: 'center', paddingBottom: 100 },
  question: { borderWidth: 2, borderRadius: 12, padding: 24, minHeight: 220, justifyContent: 'center' },
  qtext: { fontSize: 20, marginBottom: 20, fontWeight: '700', textAlign: 'center' },
  optionsRow: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between' },
  optionV: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, justifyContent: 'center' },
  footerRow: { position: 'absolute', bottom: 20, left: 16, right: 16, flexDirection: 'row' },
});

export default QuestionnaireScreen;
