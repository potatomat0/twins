import React, { useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
import { toRgb, toRgba } from '@themes/index';
import Button from '@components/common/Button';
import { Feather } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';

type Nav = StackNavigationProp<RootStackParamList, 'QuizPrimer'>;
type Route = RouteProp<RootStackParamList, 'QuizPrimer'>;
type Props = { navigation: Nav; route: Route };

const LIKERT_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '239 68 68',
  2: '234 88 12',
  3: '120 120 130',
  4: '34 211 238',
  5: '59 130 246',
};

const QuizPrimerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const questionnaireParams = route.params;

  const slides = useMemo(
    () => [
      {
        key: 'overview',
        title: t('quizPrimer.slides.overview.title'),
        body: t('quizPrimer.slides.overview.body'),
        bullets: [
          t('quizPrimer.slides.overview.points.length'),
          t('quizPrimer.slides.overview.points.time'),
          t('quizPrimer.slides.overview.points.honesty'),
        ],
      },
      {
        key: 'scale',
        title: t('quizPrimer.slides.scale.title'),
        body: t('quizPrimer.slides.scale.body'),
      },
    ],
    [t],
  );

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.x;
    const next = Math.round(offset / width);
    if (next !== step) {
      setStep(next);
    }
  };

  const finalize = () => {
    if (questionnaireParams) {
      navigation.replace('Questionnaire', questionnaireParams);
    } else {
      navigation.goBack();
    }
  };

  const goNext = () => {
    if (step < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (step + 1), animated: true });
      setStep((prev) => Math.min(prev + 1, slides.length - 1));
      return;
    }
    finalize();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <View style={styles.wrapper}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          contentContainerStyle={{ alignItems: 'stretch' }}
        >
          {slides.map((slide) => (
            <View key={slide.key} style={[styles.slide, { width }]}>
              <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{slide.title}</Text>
              <Text style={[styles.body, { color: toRgb(theme.colors['--text-secondary']) }]}>{slide.body}</Text>
              {slide.key === 'overview' ? (
                <View style={styles.list}>
                  {slide.bullets?.map((entry) => (
                    <Text key={entry} style={[styles.listItem, { color: toRgb(theme.colors['--text-secondary']) }]}>
                      • {entry}
                    </Text>
                  ))}
                </View>
              ) : (
                <View style={styles.scaleWrap}>
                  {[1, 2, 3, 4, 5].map((v) => {
                    const rgb = LIKERT_COLORS[v as 1 | 2 | 3 | 4 | 5];
                    const label = t(`questionnaire.scale.${[
                      'disagree',
                      'slightlyDisagree',
                      'neutral',
                      'slightlyAgree',
                      'agree',
                    ][v - 1]}`);
                    return (
                      <View key={v} style={[styles.scaleRow, { backgroundColor: toRgba(rgb, 0.08) }]}>
                        <View style={[styles.iconCircle, { borderColor: `rgb(${rgb})` }]}>
                          {v === 1 && <Feather name="x" size={20} color={`rgb(${rgb})`} />}
                          {v === 2 && <FontAwesome name="arrow-down" size={20} color={`rgb(${rgb})`} />}
                          {v === 3 && <FontAwesome name="circle" size={20} color={`rgb(${rgb})`} />}
                          {v === 4 && <FontAwesome name="arrow-up" size={20} color={`rgb(${rgb})`} />}
                          {v === 5 && <FontAwesome name="check" size={20} color={`rgb(${rgb})`} />}
                        </View>
                        <Text style={[styles.scaleText, { color: toRgb(theme.colors['--text-primary']) }]}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.pagination}>
          {slides.map((slide, index) => (
            <View
              key={slide.key}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === step
                      ? toRgb(theme.colors['--brand-primary'])
                      : toRgba(theme.colors['--border'], 0.25),
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            title={step === slides.length - 1 ? t('quizPrimer.begin') : t('quizPrimer.next')}
            onPress={goNext}
          />
          <View style={{ height: 12 }} />
          <Button title={t('quizPrimer.back')} variant="neutral" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrapper: {
    flex: 1,
    padding: 24,
  },
  slide: {
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    marginTop: 20,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  scaleWrap: {
    marginTop: 24,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  scaleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  actions: {
    marginTop: 'auto',
  },
});

export default QuizPrimerScreen;
