import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
import Button from '@components/common/Button';
import { toRgb, toRgba } from '@themes/index';
import { useSessionStore } from '@store/sessionStore';
import { useFocusEffect } from '@react-navigation/native';

type Nav = StackNavigationProp<RootStackParamList, 'Step2Intro'>;
type Route = RouteProp<RootStackParamList, 'Step2Intro'>;
type Props = { navigation: Nav; route: Route };

type IntroPointKey = 'topics' | 'pace' | 'privacy';

const POINT_ICONS: Record<IntroPointKey, keyof typeof Ionicons.glyphMap> = {
  topics: 'chatbubbles-outline',
  pace: 'flash-outline',
  privacy: 'lock-closed-outline',
};

const Step2IntroScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { setStep2IntroDraft, setResumeTarget } = useSessionStore();
  const juggle = useRef(new Animated.Value(0)).current;
  const params = route.params;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(juggle, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(juggle, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [juggle]);

  const scaleStyle = useMemo(
    () => ({
      transform: [
        {
          translateY: juggle.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }),
        },
      ],
    }),
    [juggle],
  );

  useFocusEffect(
    useCallback(() => {
      setResumeTarget('step2Intro');
      return undefined;
    }, [setResumeTarget]),
  );

  useEffect(() => {
    if (params) {
      setStep2IntroDraft({ params, lastUpdated: Date.now() });
    }
  }, [params, setStep2IntroDraft]);

  const background = toRgb(theme.colors['--bg']);
  const primaryBtnColor = toRgb(theme.colors['--brand-primary']);
  const textPrimary = toRgb(theme.colors['--text-primary']);
  const textSecondary = toRgb(theme.colors['--text-secondary']);
  const iconAccent = toRgb(theme.colors['--accent-cyan']);
  const badgeBg = toRgba(theme.colors['--surface'], 0.32);
  const borderColor = toRgba(theme.colors['--border'], 0.35);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: background }]}>
      <View style={styles.inner}>
        <Animated.View style={[styles.badge, { backgroundColor: badgeBg }, scaleStyle]}>
          <Text style={[styles.badgeText, { color: textPrimary }]}>{t('step2Intro.badge')}</Text>
        </Animated.View>
        <Text style={[styles.heading, { color: textPrimary }]}>{t('step2Intro.heading')}</Text>
        <Text style={[styles.message, { color: textSecondary }]}>{t('step2Intro.message')}</Text>
        <View style={styles.list}>
          {(['topics', 'pace', 'privacy'] as IntroPointKey[]).map((key) => (
            <View key={key} style={styles.listRow}>
              <Ionicons name={POINT_ICONS[key]} size={18} color={iconAccent} style={styles.listIcon} />
              <Text style={[styles.listText, { color: textSecondary }]}>{t(`step2Intro.points.${key}`)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <Button
            title={t('step2Intro.back')}
            onPress={() => navigation.goBack()}
            variant="neutral"
            style={[styles.buttonHalf, styles.secondaryButton, { borderColor }]}
          />
          <Button
            title={t('step2Intro.continue')}
            onPress={() => navigation.replace('Step2Questionnaire', params)}
            variant="primary"
            style={[styles.buttonHalf, styles.primaryButton, { backgroundColor: primaryBtnColor, borderColor }]}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    marginTop: 18,
    marginBottom: 28,
    gap: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listIcon: {
    marginRight: 10,
  },
  listText: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
    alignItems: 'stretch',
    width: '100%',
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
  badge: {
    borderRadius: 999,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  badgeText: {
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});

export default Step2IntroScreen;
