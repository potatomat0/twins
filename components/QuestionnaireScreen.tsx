import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, useWindowDimensions, ScrollView, RefreshControl } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { QUESTIONS } from '@data/questions';
import Button from '@components/common/Button';
import { AnswerMap, computeBigFiveScores, normalizeScoresTo100 } from '@services/profileAnalyzer';
import KeyboardDismissable from '@components/common/KeyboardDismissable';
import haptics from '@services/haptics';

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

const OPTION_LABELS: Record<1|2|3|4|5, string> = {
  1: 'Disagree',
  2: 'Slightly Disagree',
  3: 'Neutral',
  4: 'Slightly Agree',
  5: 'Agree',
};

const QuestionnaireScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [index, setIndex] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const isSmall = windowWidth < 380;
  // Gating flow: no need for modals or cycling state

  const total = QUESTIONS.length;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progress = useMemo(() => Math.round((answeredCount / total) * 100), [answeredCount, total]);

  const current = QUESTIONS[index];
  const currentValue = answers[current.Item_Number];

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

  const onNext = () => {
    if (index < total - 1) setIndex((i) => i + 1);
    else onFinish();
  };

  const onPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  const onFinish = () => {
    const sums = computeBigFiveScores(answers);
    const normalized = normalizeScoresTo100(sums);
    navigation.navigate('Results', {
      username: route.params?.username ?? 'Friend',
      email: route.params?.email ?? '',
      ageGroup: route.params?.ageGroup ?? '',
      gender: route.params?.gender ?? '',
      scores: normalized,
    });
  };

  // No incomplete modal needed with gating

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <KeyboardDismissable>
    <SafeAreaView style={[styles.container, { backgroundColor: `rgb(${theme.colors['--bg']})` }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: `rgb(${theme.colors['--text-primary']})` }]}>Personality Questionnaire</Text>
        <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 8 }}>Question {index + 1} / {total}</Text>
        <View style={[styles.progressWrap, { backgroundColor: toRgba(theme.colors['--border'], 0.08) }]}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: `rgb(${theme.colors['--brand-primary']})` }]} />
        </View>
        <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 6 }}>{answeredCount}/{total} answered</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.stage}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.question, { borderColor: toRgba(theme.colors['--border'], 0.06), backgroundColor: toRgb(theme.colors['--surface']) }]}> 
          <Text style={[styles.qtext, { color: toRgb(theme.colors['--text-primary']) }]}> 
            {current.Item_Number}. I {current.Question}
          </Text>

          {/* Vertical Likert scale */}
          <View style={styles.optionsCol}>
            {[1, 2, 3, 4, 5].map((v) => {
              const selected = currentValue === (v as 1 | 2 | 3 | 4 | 5);
              const color = OPTION_COLORS[v as 1 | 2 | 3 | 4 | 5];
              const label = isSmall
                ? (v === 2 ? 'Slightly Disagree' : v === 4 ? 'Slightly Agree' : OPTION_LABELS[v as 1|2|3|4|5])
                : OPTION_LABELS[v as 1|2|3|4|5];
              return (
                <Pressable
                  key={v}
                  onPress={() => onSelect(current.Item_Number, v as 1 | 2 | 3 | 4 | 5)}
                  style={({ pressed }) => [
                    styles.optionV,
                    {
                      borderColor: selected ? `rgb(${color})` : toRgba(theme.colors['--border'], 0.12),
                      borderWidth: selected ? 2 : 1,
                      backgroundColor: toRgb(theme.colors['--surface']),
                      transform: [{ scale: selected ? 1.04 : pressed ? 0.98 : 1 }],
                      shadowColor: `rgb(${color})`,
                      shadowOpacity: selected ? 0.35 : 0,
                      shadowRadius: selected ? 10 : 0,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${OPTION_LABELS[v as 1 | 2 | 3 | 4 | 5]}`}
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={{
                      color: toRgb(color),
                      fontWeight: selected ? '800' : '600',
                      textAlign: 'left',
                      fontSize: isSmall ? 14 : 16,
                    }}
                    numberOfLines={2}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer navigation: no early finish allowed */}
      <View style={styles.footerRow}>
        <View style={{ flex: 1 }}>
          <Button title="Previous" variant="neutral" onPress={onPrev} disabled={index === 0} />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          {index < total - 1 ? (
            <Button title="Next" onPress={onNext} disabled={!currentValue} />
          ) : (
            <Button title="See result" onPress={onNext} disabled={!currentValue} />
          )}
        </View>
      </View>

      {/* With gating enabled, hints are unnecessary here */}
    </SafeAreaView>
    </KeyboardDismissable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  progressWrap: { height: 8, borderRadius: 6, overflow: 'hidden' },
  progressBar: { height: '100%' },
  stage: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  question: { borderWidth: 1, borderRadius: 12, padding: 32 },
  qtext: { fontSize: 18, marginBottom: 20, fontWeight: '600' },
  optionsCol: { flexDirection: 'column', gap: 10 },
  optionV: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, alignItems: 'flex-start', justifyContent: 'center' },
  footerRow: { position: 'absolute', bottom: 20, left: 16, right: 16, flexDirection: 'row' },
});

export default QuestionnaireScreen;
