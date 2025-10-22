import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
import { toRgb, toRgba } from '@themes/index';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import NotificationModal from '@components/common/NotificationModal';
import { resendEmailOtp, verifyEmailOtp, upsertProfile, signInWithPassword } from '@services/supabase';
import { useSessionStore } from '@store/sessionStore';

type Nav = StackNavigationProp<RootStackParamList, 'VerifyEmail'>;
type Route = RouteProp<RootStackParamList, 'VerifyEmail'>;
type Props = { navigation: Nav; route: Route };

function determineCharacterGroup(scores?: Record<string, number>) {
  if (!scores) return null;
  const toPct = (value?: number) => (value ?? 0) * 100;
  const E = toPct(scores['Extraversion']);
  const A = toPct(scores['Agreeableness']);
  const C = toPct(scores['Conscientiousness']);
  const O = toPct(scores['Intellect/Imagination']);
  const HIGH = 70, VERY_HIGH = 85;
  if (O >= VERY_HIGH) return 'Creator';
  if (E >= HIGH && O >= HIGH) return 'Explorer';
  if (E >= HIGH && A >= HIGH) return 'Connector';
  if (C >= HIGH && O >= HIGH) return 'Strategist';
  if (A >= HIGH && C >= HIGH) return 'Guardian';
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

const VerifyEmailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { clearAllDrafts } = useSessionStore();
  const email = route.params?.email ?? '';
  const password = route.params?.password ?? '';
  const username = route.params?.username ?? '';
  const ageGroup = route.params?.ageGroup ?? '';
  const gender = route.params?.gender ?? '';
  const scores = route.params?.scores ?? {};

  const [code, setCode] = useState('');
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const onVerify = async () => {
    setWorking(true);
    try {
      console.log('[VerifyEmail] verifying OTP for', email);
      const { data, error } = await verifyEmailOtp(email, code.trim());
      console.log('[VerifyEmail] verifyOtp response:', { data, error });
      if (error) { setNotice(error.message ?? t('verifyEmail.genericError')); setWorking(false); return; }
      let user = data.user;
      const character_group = determineCharacterGroup(scores) || undefined;
      if (!user?.id) {
        // Some projects may not return a session on verify; try explicit sign-in
        console.log('[VerifyEmail] no session after verify; attempting sign-in');
        const { data: sdata, error: signInErr } = await signInWithPassword(email, password);
        console.log('[VerifyEmail] signIn after verify:', { sdata, signInErr });
        if (signInErr || !sdata.user?.id) {
          setNotice(signInErr?.message ?? t('verifyEmail.signInPrompt'));
          setWorking(false);
          return;
        }
        user = sdata.user;
      }
      // Upsert profile under authenticated session
      const { data: prof, error: upErr } = await upsertProfile({ id: user.id, username, age_group: ageGroup, gender, character_group });
      console.log('[VerifyEmail] upsert profile:', { prof, upErr });
      if (upErr) {
        const details = `${upErr.details ?? upErr.message ?? ''}`.toLowerCase();
        if (upErr.code === '23505' || details.includes('duplicate key value')) {
          setNotice(t('verifyEmail.profileErrorDuplicate'));
        } else {
          setNotice(upErr.message ?? t('verifyEmail.profileErrorGeneric'));
        }
        setWorking(false);
        return;
      }
      // Auto-login complete → go to Dashboard
      clearAllDrafts();
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' as any, params: { username, email } }] });
    } catch (e: any) {
      console.log('[VerifyEmail] exception:', e);
      setNotice(e?.message ?? t('verifyEmail.genericError'));
    } finally {
      setWorking(false);
    }
  };

  const onResend = async () => {
    try {
      console.log('[VerifyEmail] resending OTP to', email);
      const { data, error } = await resendEmailOtp(email);
      console.log('[VerifyEmail] resend response:', { data, error });
      setNotice(error ? (error.message ?? t('verifyEmail.resendError')) : t('verifyEmail.resendSuccess'));
    } catch (e: any) {
      console.log('[VerifyEmail] resend exception:', e);
      setNotice(e?.message ?? t('verifyEmail.resendError'));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}> 
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <Card>
            <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{t('verifyEmail.title')}</Text>
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 10 }}>{t('verifyEmail.description', { email })}</Text>
            <TextInput
              placeholder={t('verifyEmail.placeholder')}
              placeholderTextColor={toRgb(theme.colors['--text-muted'])}
              keyboardType="number-pad"
              maxLength={6}
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.08), color: toRgb(theme.colors['--text-primary']) }]}
              value={code}
              onChangeText={setCode}
              returnKeyType="done"
              onSubmitEditing={onVerify}
            />
            <View style={{ height: 10 }} />
            <Button title={working ? t('verifyEmail.verifying') : t('verifyEmail.verify')} onPress={onVerify} disabled={working || code.trim().length < 6} />
            <View style={{ height: 8 }} />
            <Button title={t('verifyEmail.resend')} variant="neutral" onPress={onResend} />
            <View style={{ height: 8 }} />
            <Button title={t('verifyEmail.backToLogin')} variant="neutral" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] })} />
          </Card>
        </View>
      </KeyboardAvoidingView>

      <NotificationModal
        visible={!!notice}
        title={t('verifyEmail.noticeTitle')}
        message={notice ?? ''}
        primaryText={t('verifyEmail.noticeDismiss')}
        onPrimary={() => setNotice(null)}
        onRequestClose={() => setNotice(null)}
      />
    </SafeAreaView>
  );
};

export default VerifyEmailScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  input: { borderRadius: 12, padding: 14, borderWidth: 1 },
});
