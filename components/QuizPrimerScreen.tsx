import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
import { toRgb, toRgba } from '@themes/index';
import Button from '@components/common/Button';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Feather } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';

type Nav = StackNavigationProp<RootStackParamList, 'QuizPrimer'>;
type Route = RouteProp<RootStackParamList, 'QuizPrimer'>;
type Props = { navigation: Nav; route: Route };

type OverviewBulletKey = 'length' | 'time' | 'honesty';

const LIKERT_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '239 68 68',
  2: '234 88 12',
  3: '120 120 130',
  4: '34 211 238',
  5: '59 130 246',
};

const BULLET_ICONS: Record<OverviewBulletKey, keyof typeof Ionicons.glyphMap> = {
  length: 'time-outline',
  time: 'pulse-outline',
  honesty: 'sparkles-outline',
};

const QuizPrimerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const { width, height } = useWindowDimensions();
  const slideWidth = Math.min(width * 0.88, 420);
  const spacer = 24; // base padding on wrapper
  const usableHeight = Math.max(height - spacer * 4, 400);
  const cardHeight = Math.min(Math.max(usableHeight, 480), 620);
  const contentMinHeight = Math.max(cardHeight - 80, 340);
  const [step, setStep] = useState(0);
  const questionnaireParams = route.params;

  const slides = useMemo(
    () => [
      {
        key: 'overview' as const,
        title: t('quizPrimer.slides.overview.title'),
        body: t('quizPrimer.slides.overview.body'),
        bullets: ['length', 'time', 'honesty'] as OverviewBulletKey[],
      },
      {
        key: 'scale' as const,
        title: t('quizPrimer.slides.scale.title'),
        body: t('quizPrimer.slides.scale.body'),
      },
    ],
    [t],
  );

  const updateStep = useCallback(
    (next: number, animated = true) => {
      const clamped = Math.max(0, Math.min(next, slides.length - 1));
      scrollRef.current?.scrollTo({ x: slideWidth * clamped, animated });
      setStep(clamped);
    },
    [slides.length, slideWidth],
  );

  const finalize = useCallback(() => {
    if (questionnaireParams) {
      navigation.replace('Questionnaire', questionnaireParams);
    } else {
      navigation.goBack();
    }
  }, [navigation, questionnaireParams]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const next = Math.round(contentOffset.x / slideWidth);
    if (next !== step) {
      setStep(next);
    }
  };

  const handleNext = () => {
    if (step < slides.length - 1) {
      updateStep(step + 1);
      return;
    }
    finalize();
  };

  const handleBack = () => {
    if (step > 0) {
      updateStep(step - 1);
      return;
    }
    navigation.goBack();
  };

  const background = toRgb(theme.colors['--bg']);
  const accentColor = toRgb(theme.colors['--brand-primary']);
  const textPrimary = toRgb(theme.colors['--text-primary']);
  const textSecondary = toRgb(theme.colors['--text-secondary']);
  const bulletColor = toRgb(theme.colors['--accent-cyan']);
  const surfaceTint = toRgba(theme.colors['--surface'], 0.22);
  const borderTint = toRgba(theme.colors['--border'], 0.25);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: background }]}
    >
      <View style={styles.wrapper}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled={false}
          snapToInterval={slideWidth}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          contentContainerStyle={styles.carouselContent}
        >
          {slides.map((slide) => {
            const isOverview = slide.key === 'overview';
            return (
              <View key={slide.key} style={[styles.slide, { width: slideWidth, height: cardHeight }]}>
                <View
                  style={[
                    styles.slideSurface,
                    { backgroundColor: surfaceTint, borderColor: borderTint },
                  ]}
                >
                  <ScrollView
                    style={styles.slideScroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                      styles.slideContent,
                      isOverview ? styles.slideContentCenter : styles.slideContentTop,
                      { minHeight: contentMinHeight },
                    ]}
                  >
                    <Text style={[styles.title, { color: textPrimary }]}>{slide.title}</Text>
                    <Text style={[styles.body, { color: textSecondary }]}>{slide.body}</Text>
                    {isOverview ? (
                      <View style={styles.list}>
                        {slide.bullets?.map((key) => (
                          <View key={key} style={styles.listItemRow}>
                            <Ionicons
                              name={BULLET_ICONS[key]}
                              size={18}
                              color={bulletColor}
                              style={styles.listIcon}
                            />
                            <Text style={[styles.listText, { color: textSecondary }]}>
                              {t(`quizPrimer.slides.overview.points.${key}`)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.scaleWrap}>
                        {[1, 2, 3, 4, 5].map((value) => {
                          const rgb = LIKERT_COLORS[value as 1 | 2 | 3 | 4 | 5];
                          const label = t(
                            `questionnaire.scale.${[
                              'disagree',
                              'slightlyDisagree',
                              'neutral',
                              'slightlyAgree',
                              'agree',
                            ][value - 1]}`,
                          );
                          return (
                            <View key={value} style={[styles.scaleRow, { backgroundColor: toRgba(rgb, 0.2) }]}>
                              <View style={[styles.iconCircle, { borderColor: `rgb(${rgb})` }]}>
                                {value === 1 && <Feather name="x" size={18} color={`rgb(${rgb})`} />}
                                {value === 2 && <FontAwesome name="arrow-down" size={18} color={`rgb(${rgb})`} />}
                                {value === 3 && <FontAwesome name="circle" size={18} color={`rgb(${rgb})`} />}
                                {value === 4 && <FontAwesome name="arrow-up" size={18} color={`rgb(${rgb})`} />}
                                {value === 5 && <FontAwesome name="check" size={18} color={`rgb(${rgb})`} />}
                              </View>
                              <Text style={[styles.scaleText, { color: textPrimary }]}>{label}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    <View style={{ height: 12 }} />
                  </ScrollView>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View
          style={[
            styles.actions,
            { width: slideWidth },
            step === slides.length - 1 ? styles.actionsRaised : null,
          ]}
        >
          <Button
            title={t('quizPrimer.back')}
            variant="neutral"
            onPress={handleBack}
            style={[
              styles.buttonHalf,
              styles.secondaryButton,
              { borderColor: borderTint },
            ]}
          />
          <Button
            title={step === slides.length - 1 ? t('quizPrimer.begin') : t('quizPrimer.next')}
            onPress={handleNext}
            variant="primary"
            style={[
              styles.buttonHalf,
              styles.primaryButton,
              { backgroundColor: accentColor, borderColor: borderTint },
            ]}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrapper: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselContent: {
    alignItems: 'stretch',
    height: '100%',
  },
  slide: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  slideSurface: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  slideScroll: {
    flex: 1,
  },
  slideContent: {
    paddingBottom: 12,
    gap: 12,
  },
  slideContentCenter: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  slideContentTop: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    marginTop: 13,
    gap: 10,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listIcon: {
    marginRight: 10,
  },
  listText: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 15,
  },
  scaleWrap: {
    marginTop: 20,
    gap: 10,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7 ,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  iconCircle: {
    width: 35,
    height: 35,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  scaleText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    marginTop: 'auto',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  actionsRaised: {
    marginTop: 32,
  },
  buttonHalf: {
    flex: 1,
  },
  primaryButton: {
    borderWidth: 1,
  },
  secondaryButton: {
    borderWidth: 1,
  },
});

export default QuizPrimerScreen;
