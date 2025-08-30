import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, Pressable, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';
import { QUESTIONS } from '@data/questions';
import Button from '@components/common/Button';
import { AnswerMap, computeBigFiveScores, normalizeScoresTo100 } from '@services/profileAnalyzer';

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
  const listRef = useRef<FlatList>(null);
  const offsetsRef = useRef<Record<number, number>>({});
  const heightsRef = useRef<Record<number, number>>({});
  const scrollYRef = useRef(0);

  const progress = useMemo(() => Math.round((Object.keys(answers).length / QUESTIONS.length) * 100), [answers]);

  const onSelect = (id: number, value: 1|2|3|4|5) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
    // Always scroll down by the height of the current question block
    setTimeout(() => {
      const h = heightsRef.current[id] ?? 280;
      const nextOffset = scrollYRef.current + h + 16; // include gap
      if (listRef.current) listRef.current.scrollToOffset({ offset: nextOffset, animated: true });
    }, 10);
  };

  const onFinish = () => {
    const sums = computeBigFiveScores(answers);
    const normalized = normalizeScoresTo100(sums);
    navigation.navigate('Results', { username: route.params?.username ?? 'Friend', scores: normalized });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: `rgb(${theme.colors['--dark-bg']})` }]}>
      <View style={styles.header}> 
        <Text style={[styles.title, { color: `rgb(${theme.colors['--text-primary']})` }]}>Personality Questionnaire</Text>
        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: `rgb(${theme.colors['--brand-primary']})` }]} />
        </View>
        <Text style={{ color: '#bbb', marginTop: 6 }}>{progress}% completed</Text>
      </View>

      <FlatList
        ref={listRef}
        data={QUESTIONS}
        keyExtractor={(q) => String(q.Item_Number)}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          scrollYRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const current = answers[item.Item_Number];
          return (
            <View
              style={[styles.question, { borderColor: 'rgba(255,255,255,0.06)' }]}
              onLayout={(e) => {
                offsetsRef.current[item.Item_Number] = e.nativeEvent.layout.y;
                heightsRef.current[item.Item_Number] = e.nativeEvent.layout.height;
              }}
            >
              <Text style={[styles.qtext, { color: toRgb(theme.colors['--text-primary']) }]}>
                {item.Item_Number}. I {item.Question}
              </Text>
              <View style={styles.optionsCol}>
                {[1,2,3,4,5].map((v) => {
                  const selected = current === v;
                  const color = OPTION_COLORS[v as 1|2|3|4|5];
                  return (
                    <Pressable
                      key={v}
                      onPress={() => onSelect(item.Item_Number, v as 1|2|3|4|5)}
                      style={({ pressed }) => [
                        styles.option,
                        {
                          backgroundColor: '#14151a',
                          borderColor: selected ? `rgb(${color})` : 'rgba(255,255,255,0.12)',
                          borderWidth: selected ? 2 : 1,
                          transform: [{ scale: selected ? 1.04 : pressed ? 0.98 : 1 }],
                          shadowColor: `rgb(${color})`,
                          shadowOpacity: selected ? 0.35 : 0,
                          shadowRadius: selected ? 10 : 0,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${OPTION_LABELS[v as 1|2|3|4|5]}`}
                      accessibilityState={{ selected }}
                    >
                      <Text style={{ color: toRgb(color), fontWeight: selected ? '800' : '600' }}>
                        {OPTION_LABELS[v as 1|2|3|4|5]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginTop: 12 }} />
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        {Object.keys(answers).length < QUESTIONS.length ? (
          <Button
            title="Finish anyway"
            variant="warning"
            onPress={onFinish}
          />
        ) : (
          <Button title="See your result" onPress={onFinish} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  progressWrap: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' },
  progressBar: { height: '100%' },
  question: { marginBottom: 16, borderWidth: 1, borderRadius: 12, padding: 12, backgroundColor: '#14151a' },
  qtext: { fontSize: 16, marginBottom: 12 },
  optionsCol: { flexDirection: 'column', gap: 8 },
  option: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  footer: { position: 'absolute', bottom: 20, left: 16, right: 16 },
});

export default QuestionnaireScreen;
