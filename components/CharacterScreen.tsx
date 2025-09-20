import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';
import Button from '@components/common/Button';
import NotificationModal from '@components/common/NotificationModal';

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

const descriptions: Record<string, string> = {
  Explorer: 'You are curious and sociable, always seeking new adventures.',
  Connector: 'You are a warm and outgoing person who unites others.',
  Strategist: 'You are organized and insightful, achieving goals with vision.',
  Guardian: 'You are a dependable and caring pillar of support for others.',
  Creator: 'You have a highly imaginative mind, driven by pure creativity.',
};

function determineGroup(scores: Record<string, number>) {
  const E = scores['Extraversion'] ?? 0;
  const A = scores['Agreeableness'] ?? 0;
  const C = scores['Conscientiousness'] ?? 0;
  const S = scores['Emotional Stability'] ?? 0; // not used directly
  const O = scores['Intellect/Imagination'] ?? 0; // Openness

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
  const { width } = useWindowDimensions();
  const scores = route.params?.scores ?? {};
  const group = useMemo(() => determineGroup(scores), [scores]);
  const icon = icons[group];
  const fullText = descriptions[group] ?? '';
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}> 
      <View style={styles.center}>        
        <Image source={icon} style={{ width: Math.min(220, width * 0.6), height: Math.min(220, width * 0.6), resizeMode: 'contain' }} />
        <View style={{ height: 12 }} />
        <Text style={[styles.group, { color: toRgb(theme.colors['--text-primary']) }]}>{group}</Text>
        <View style={{ height: 6 }} />
        <Text style={[styles.desc, { color: toRgb(theme.colors['--text-secondary']) }]}> 
          {shown}
          {blink ? '|' : ' '}
        </Text>
        <View style={{ height: 24 }} />
        <Button title="Go back" variant="danger" onPress={() => setConfirmExit(true)} style={{ alignSelf: 'stretch' }} />
        <View style={{ height: 10 }} />
        <Button
          title="Create your account"
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
        title="Leave registration?"
        message="If you go to Login now, you will lose all your progress."
        primaryText="Leave"
        onPrimary={() => { setConfirmExit(false); navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] }); }}
        secondaryText="Stay"
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
