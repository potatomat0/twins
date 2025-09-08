import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { toRgb } from '@themes/index';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import NotificationModal from '@components/common/NotificationModal';
import KeyboardDismissable from '@components/common/KeyboardDismissable';
import supabase, { signInWithPassword, fetchProfile, upsertProfile } from '@services/supabase';

type Nav = StackNavigationProp<RootStackParamList, 'Login'>;
type Props = { navigation: Nav };

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMsg, setModalMsg] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailRef = useRef<TextInput>(null as any);
  const passwordRef = useRef<TextInput>(null as any);

  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const canLogin = emailValid && password.length >= 1;
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Lightweight auth endpoint probe (no credentials required)
        const { data, error } = await supabase.auth.getSession();
        if (!cancelled) setSupabaseOk(!error);
      } catch {
        if (!cancelled) setSupabaseOk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <KeyboardDismissable>
      <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--dark-bg']) }]}>        
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ padding: 16, alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>Welcome back</Text>
              {supabaseOk ? (
                <Text style={{ color: '#22c55e', fontWeight: '700' }}>· Powered by Supabase</Text>
              ) : supabaseOk === false ? null : null}
            </View>
            <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>Sign in to continue</Text>

            <TextInput
              placeholder="Email"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              ref={emailRef}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus?.()}
            />
            {!emailValid && email.length > 0 && <Text style={styles.warn}>Please enter a valid email.</Text>}

            <TextInput
              placeholder="Password"
              placeholderTextColor="#888"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              ref={passwordRef}
              returnKeyType="done"
              onSubmitEditing={() => { if (canLogin) setModal(true); }}
            />

            <View style={{ height: 12 }} />
            <Button
              title="Login"
              onPress={async () => {
                const mail = email.trim();
                const fallbackName = (mail.split('@')[0] || 'User');
                try {
                  const { data, error } = await signInWithPassword(mail, password);
                  if (error) {
                    setModalTitle('Invalid credentials');
                    setModalMsg(error.message ?? 'Email or password is incorrect.');
                    setModal(true);
                    return;
                  }
                  const authUser = data.user;
                  const userId = authUser?.id;
                  let username = (authUser?.user_metadata as any)?.username || fallbackName;
                  if (userId) {
                    const { data: prof } = await fetchProfile(userId);
                    if (!prof) {
                      // create minimal profile
                      const { data: created } = await upsertProfile({ id: userId, username });
                      if (created?.username) username = created.username;
                    } else if (prof.username) {
                      username = prof.username;
                    }
                  }
                  navigation.reset({ index: 0, routes: [{ name: 'Dashboard' as any, params: { username, email: mail } }] });
                } catch (e: any) {
                  setModalTitle('Error');
                  setModalMsg(e?.message ?? 'An unexpected error occurred.');
                  setModal(true);
                }
              }}
              disabled={!canLogin}
            />

            <View style={{ height: 16 }} />
            <Text style={{ color: '#bbb', marginBottom: 8 }}>Or, start our personality quiz to start making an account</Text>
            <Button
              title="Start Personality Quiz"
              onPress={() => navigation.navigate('Questionnaire', { username: '', email, ageGroup: '', gender: '' })}
            />
          </Card>
        </ScrollView>
        </KeyboardAvoidingView>

        <NotificationModal
          visible={modal}
          title={modalTitle || 'Notice'}
          message={modalMsg || 'Something happened.'}
          primaryText="OK"
          onPrimary={() => setModal(false)}
          onRequestClose={() => setModal(false)}
        />
      </SafeAreaView>
    </KeyboardDismissable>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  input: {
    backgroundColor: '#191a1f',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  warn: { color: '#f59e0b', marginTop: -8, marginBottom: 8 },
});
