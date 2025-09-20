import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import RadarChart from '@components/charts/RadarChart';
import KeyboardDismissable from '@components/common/KeyboardDismissable';
import NotificationModal from '@components/common/NotificationModal';

type Nav = StackNavigationProp<RootStackParamList, 'Results'>;
type Route = RouteProp<RootStackParamList, 'Results'>;
type Props = { navigation: Nav; route: Route };

const ResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const username = route.params?.username ?? 'Friend';
  const email = route.params?.email ?? '';
  const ageGroup = route.params?.ageGroup ?? '';
  const gender = route.params?.gender ?? '';
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

  const [refreshing, setRefreshing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <KeyboardDismissable>
      <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}> 
        <ScrollView
          contentContainerStyle={{ padding: 16, alignItems: 'center' }}
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Full-width chart */}
          <View style={{ width: '100%', alignItems: 'center', marginBottom: -32 }}>
            <RadarChart
              data={chartData}
              color={theme.colors['--brand-primary']}
              iconColor={theme.colors['--accent-cyan']}
              closeColor={theme.colors['--danger']}
              tooltipMaxHeight={220}
            />
          </View>

          <Card>
            <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>
              Here's your final result! 
            </Text>
            <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>
              Top strengths:
            </Text>
            {top3.map(([k, v]) => (
              <Text key={k} style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 4 }}>
                • {k}: {v}
              </Text>
            ))}
            <View style={{ height: 12 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                title="Start Over"
                variant="neutral"
                onPress={() => setConfirmReset(true)}
              />
              <Button
                title="Continue"
                onPress={() =>
                  navigation.navigate('Character' as any, {
                    username,
                    email,
                    ageGroup,
                    gender,
                    scores,
                  })
                }
              />
            </View>
          </Card>
        </ScrollView>
        <NotificationModal
          visible={confirmReset}
          title="Start over?"
          message="If you go to Login now, you will lose this result."
          primaryText="Leave"
          onPrimary={() => { setConfirmReset(false); navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] }); }}
          secondaryText="Stay"
          onSecondary={() => setConfirmReset(false)}
          onRequestClose={() => setConfirmReset(false)}
          primaryVariant="danger"
          secondaryVariant="accent"
        />
      </SafeAreaView>
    </KeyboardDismissable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { marginTop: 8, marginBottom: 8 },
});

export default ResultsScreen;
