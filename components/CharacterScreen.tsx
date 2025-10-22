import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
import { toRgb } from '@themes/index';
import Button from '@components/common/Button';
import NotificationModal from '@components/common/NotificationModal';
import { useSessionStore } from '@store/sessionStore';
import { useFocusEffect } from '@react-navigation/native';

type Nav = StackNavigationProp<RootStackParamList, 'Character'>;
type Route = RouteProp<RootStackParamList, 'Character'>;
type Props = { navigation: Nav; route: Route };

const icons: Record<string, any> = {
  Explorer: require('../assets/images/twins-explorer.png.png'),
  Connector: require('../assets/images/twins-connector.png.png'),
  Strategist: require('../assets/images/twins-strategist.png.png'),
  Guardian: require('../assets/images/twins-guardian.png.png'),
  Creator: require('../assets/images/twins-creator.png.png'),
};

function determineGroup(scores: Record<string, number>) {
  const toPct = (value?: number) => (value ?? 0) * 100;
  const E = toPct(scores['Extraversion']);
  const A = toPct(scores['Agreeableness']);
  const C = toPct(scores['Conscientiousness']);
  const S = toPct(scores['Emotional Stability']); // not used directly
  const O = toPct(scores['Intellect/Imagination']); // Openness

  const HIGH = 70;
  const VERY_HIGH = 85;

  if (O >= VERY_HIGH) return 'Creator';
  if (E >= HIGH && O >= HIGH) return 'Explorer';
  if (E >= HIGH && A >= HIGH) return 'Connector';
  if (C >= HIGH && O >= HIGH) return 'Strategist';
  if (A >= HIGH && C >= HIGH) return 'Guardian';
  // Fallback: pick the closest match based on top two scores
  const pairs: Array<[string, number]> = [
    ['Explorer', (E + O) / 2],
    ['Connector', (E + A) / 2],
    ['Strategist', (C + O) / 2],
    ['Guardian', (A + C) / 2],
    ['Creator', O],
  ];
  pairs.sort((a, b) => b[1] - a[1]);
  return pairs[0][0];
}

const CharacterScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { setCharacterDraft, setResumeTarget } = useSessionStore();
  const { width } = useWindowDimensions();
  const scores = route.params?.scores ?? {};
  const group = useMemo(() => determineGroup(scores), [scores]);
  const icon = icons[group];
  const descriptionKey = `character.descriptions.${group}`;
  const fullText = t(descriptionKey);
  const [confirmExit, setConfirmExit] = useState(false);

  // Typing / cursor animation over ~2 seconds
  const [shown, setShown] = useState('');
  useEffect(() => {
    const total = Math.max(1, fullText.length);
    const dur = 2000; // 2s
    const step = Math.ceil(dur / total);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(fullText.slice(0, i));
      if (i >= total) clearInterval(id);
    }, step);
    return () => clearInterval(id);
  }, [fullText]);
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setResumeTarget('character');
      return undefined;
    }, [setResumeTarget]),
  );

  useEffect(() => {
    if (route.params) {
      setCharacterDraft({ params: route.params, lastUpdated: Date.now() });
    }
  }, [route.params, setCharacterDraft]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}> 
      <View style={styles.center}>        
        <Image source={icon} style={{ width: Math.min(220, width * 0.6), height: Math.min(220, width * 0.6), resizeMode: 'contain' }} />
        <View style={{ height: 12 }} />
        <Text style={[styles.group, { color: toRgb(theme.colors['--text-primary']) }]}>
          {t(`character.labels.${group}`)}
        </Text>
        <View style={{ height: 6 }} />
        <Text style={[styles.desc, { color: toRgb(theme.colors['--text-secondary']) }]}> 
          {shown}
          {blink ? '|' : ' '}
        </Text>
        <View style={{ height: 24 }} />
        <Button title={t('character.goBack')} variant="danger" onPress={() => setConfirmExit(true)} style={{ alignSelf: 'stretch' }} />
        <View style={{ height: 10 }} />
        <Button
          title={t('character.createAccount')}
          onPress={() =>
            navigation.navigate('CreateAccount', {
              username: route.params?.username ?? '',
              email: route.params?.email ?? '',
              ageGroup: route.params?.ageGroup ?? '',
              gender: route.params?.gender ?? '',
              scores: scores,
              // character group will be read by CreateAccount via route and saved
            } as any)
          }
          style={{ alignSelf: 'stretch' }}
        />
      </View>

      <NotificationModal
        visible={confirmExit}
        title={t('character.confirm.title')}
        message={t('character.confirm.message')}
        primaryText={t('character.confirm.leave')}
        onPrimary={() => { setConfirmExit(false); navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] }); }}
        secondaryText={t('character.confirm.stay')}
        onSecondary={() => setConfirmExit(false)}
        onRequestClose={() => setConfirmExit(false)}
        primaryVariant="danger"
        secondaryVariant="accent"
      />
    </SafeAreaView>
  );
};

export default CharacterScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  group: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  desc: { fontSize: 14, textAlign: 'center' },
});
