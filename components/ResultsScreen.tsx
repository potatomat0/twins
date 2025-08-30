import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, useWindowDimensions } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import RadarChart from '@components/charts/RadarChart';

type Nav = StackNavigationProp<RootStackParamList, 'Results'>;
type Route = RouteProp<RootStackParamList, 'Results'>;
type Props = { navigation: Nav; route: Route };

const ResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const username = route.params?.username ?? 'Friend';
  const { width: windowWidth } = useWindowDimensions();
  const scores = route.params?.scores ?? {
    'Extraversion': 50,
    'Agreeableness': 50,
    'Conscientiousness': 50,
    'Emotional Stability': 50,
    'Intellect/Imagination': 50,
  };

  const chartData = useMemo(() => (
    [
      { label: 'Extraversion', score: scores['Extraversion'] },
      { label: 'Agreeableness', score: scores['Agreeableness'] },
      { label: 'Conscientiousness', score: scores['Conscientiousness'] },
      { label: 'Emotional Stability', score: scores['Emotional Stability'] },
      { label: 'Intellect/Imagination', score: scores['Intellect/Imagination'] },
    ]
  ), [scores]);

  const top3 = useMemo(() => Object.entries(scores)
    .sort((a,b) => b[1]-a[1])
    .slice(0,3), [scores]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--dark-bg']) }]}>
      {/* Full-width chart */}
      <View style={{ width: '100%', alignItems: 'center', marginBottom: 12 }}>
        <RadarChart
          data={chartData}
          color={theme.colors['--brand-primary']}
          iconColor={theme.colors['--accent-cyan']}
          closeColor={theme.colors['--danger']}
        />
      </View>

      <Card>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>
          Here's your final result, {username}!
        </Text>
        <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>
          Top strengths:
        </Text>
        {top3.map(([k, v]) => (
          <Text key={k} style={{ color: '#fff', marginBottom: 4 }}>
            • {k}: {v}
          </Text>
        ))}
        <View style={{ height: 12 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button title="Start Over" variant="neutral" onPress={() => navigation.replace('Registration')} />
          <Button title="Complete your profile" onPress={() => { /* TODO: push Final Registration */ }} />
        </View>
      </Card>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { marginTop: 8, marginBottom: 8 },
});

export default ResultsScreen;
