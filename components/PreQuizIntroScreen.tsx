import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
import { toRgb } from '@themes/index';
import Button from '@components/common/Button';

type Nav = StackNavigationProp<RootStackParamList, 'QuizIntro'>;
type Route = RouteProp<RootStackParamList, 'QuizIntro'>;
type Props = { navigation: Nav; route: Route };

const PreQuizIntroScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const juggle = useRef(new Animated.Value(0)).current;
  const email = route.params?.email;

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--brand-primary']) }]}>
      <View style={styles.inner}>
        <Animated.View style={[styles.badge, scaleStyle]}>
          <Text style={styles.badgeText}>{t('preQuizIntro.badge')}</Text>
        </Animated.View>
        <Text style={styles.heading}>{t('preQuizIntro.heading')}</Text>
        <Text style={styles.message}>{t('preQuizIntro.message')}</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• {t('preQuizIntro.points.profile')}</Text>
          <Text style={styles.listItem}>• {t('preQuizIntro.points.expectations')}</Text>
        </View>
        <View style={styles.actions}>
          <Button
            title={t('preQuizIntro.continue')}
            onPress={() => navigation.replace('Registration', email ? { email } : undefined)}
            variant="neutral"
            style={styles.primaryAction}
          />
          <Button
            title={t('preQuizIntro.back')}
            onPress={() => navigation.goBack()}
            variant="neutral"
            style={styles.secondaryAction}
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
    color: '#f8fafc',
    marginBottom: 12,
  },
  message: {
    color: '#f8fafc',
    fontSize: 16,
    lineHeight: 24,
  },
  list: {
    marginTop: 18,
    marginBottom: 32,
  },
  listItem: {
    color: '#f1f5f9',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {},
  primaryAction: {
    backgroundColor: 'rgba(12, 10, 24, 0.65)',
    marginBottom: 12,
  },
  secondaryAction: {
    backgroundColor: 'rgba(12, 10, 24, 0.18)',
  },
  badge: {
    borderRadius: 999,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(10, 9, 30, 0.35)',
    marginBottom: 20,
  },
  badgeText: {
    color: '#e0e7ff',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});

export default PreQuizIntroScreen;
