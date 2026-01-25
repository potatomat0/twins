import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Button from '@components/common/Button';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useTranslation } from '@context/LocaleContext';
import { useSessionStore, ResumeDestination } from '@store/sessionStore';
import type { RootStackParamList } from '@navigation/AppNavigator';
import { InteractionManager } from 'react-native';

type Nav = StackNavigationProp<RootStackParamList, 'ResumePrompt'>;
type Route = RouteProp<RootStackParamList, 'ResumePrompt'>;

const ResumePromptScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const destination = params?.destination;
  const { clearAllDrafts } = useSessionStore();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const labels = useMemo(() => {
    const screen = destination?.screen ?? 'questionnaire';
    const key =
      screen === 'Registration'
        ? 'resumePrompt.registration'
        : screen === 'Character'
        ? 'resumePrompt.character'
        : screen === 'Step2Intro'
        ? 'resumePrompt.step2Intro'
        : screen === 'Step2Questionnaire'
        ? 'resumePrompt.step2Questionnaire'
        : screen === 'Step2Results'
        ? 'resumePrompt.step2Results'
        : screen === 'CreateAccount'
        ? 'resumePrompt.createAccount'
        : 'resumePrompt.questionnaire';
    return {
      title: t('resumePrompt.title'),
      message: t(key),
      dismiss: t('resumePrompt.dismiss'),
      resume: t('resumePrompt.resume'),
    };
  }, [destination?.screen, t]);

  const handleResume = () => {
    if (!destination) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        }),
      );
      return;
    }
    const reset = CommonActions.reset({
      index: 0,
      routes: [{ name: destination.screen as any, params: destination.params }],
    });
    InteractionManager.runAfterInteractions(() => {
      navigation.dispatch(reset);
    });
  };

  const handleDismiss = () => {
    clearAllDrafts();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      }),
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <View style={[styles.card, { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.08) }]}>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{labels.title}</Text>
        <Text style={[styles.message, { color: toRgb(theme.colors['--text-secondary']) }]}>{labels.message}</Text>
        <View style={styles.actions}>
          <Button title={labels.dismiss} variant="neutral" onPress={handleDismiss} />
          <View style={{ width: 12 }} />
          <Button title={labels.resume} onPress={handleResume} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
});

export default ResumePromptScreen;
