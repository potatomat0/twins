import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import Button from '@components/common/Button';
import { signOut } from '@services/supabase';
import { useTranslation } from '@context/LocaleContext';

type Nav = StackNavigationProp<RootStackParamList, 'Dashboard'>;
type Route = RouteProp<RootStackParamList, 'Dashboard'>;
type Props = { navigation: Nav; route: Route };

const DashboardScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme, name, setTheme } = useTheme();
  const { t } = useTranslation();
  const username = route.params?.username || 'Friend';
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}> 
      <View style={styles.center}>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>Welcome back, {username}!</Text>
        <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>
          This dashboard is under construction.
        </Text>
        <View style={{ height: 16 }} />
        <Button
          title={name === 'dark' ? t('common.themeToggle.toLight') : t('common.themeToggle.toDark')}
          onPress={() => setTheme(name === 'dark' ? 'light' : 'dark')}
        />
        <View style={{ height: 16 }} />
        <Button
          title="Logout"
          variant="neutral"
          onPress={async () => {
            await signOut();
            // Clear stack and go back to Login
            navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] });
          }}
        />
      </View>
    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14 },
});
