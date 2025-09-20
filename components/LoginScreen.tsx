import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Entypo from '@expo/vector-icons/Entypo';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
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
  const [showPw, setShowPw] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
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
      <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>        
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
              <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>Welcome to Twins!</Text>
              {supabaseOk ? (
                <Text style={{ color: '#22c55e', fontWeight: '700' }}>Prototype 4. Database is connected</Text>
              ) : supabaseOk === false ? null : null}
            </View>
            <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>Sign in to continue</Text>

            <View style={styles.inputWrap}>
              <TextInput
                placeholder="Email"
                placeholderTextColor={toRgb(theme.colors['--text-muted'])}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    backgroundColor: toRgb(theme.colors['--surface']),
                    borderColor: emailFocus ? toRgb(theme.colors['--focus']) : toRgba(theme.colors['--border'], 0.08),
                    borderWidth: emailFocus ? 2 : 1,
                    color: toRgb(theme.colors['--text-primary']),
                    shadowColor: toRgb(theme.colors['--focus']),
                    shadowOpacity: emailFocus ? 0.35 : 0,
                    shadowRadius: emailFocus ? 10 : 0,
                    elevation: emailFocus ? 4 : 0,
                    paddingRight: 44,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                ref={emailRef}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus?.()}
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
              />
              {!!email && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear email"
                  onPress={() => setEmail('')}
                  style={styles.clearBtn}
                >
                  <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
                </Pressable>
              )}
            </View>
            {!emailValid && email.length > 0 && <Text style={styles.warn}>Please enter a valid email.</Text>}

            <View style={styles.inputWrap}>
              <TextInput
                placeholder="Password"
              placeholderTextColor={toRgb(theme.colors['--text-muted'])}
                style={[
                  styles.input,
                  {
                    backgroundColor: toRgb(theme.colors['--surface']),
                    borderColor: pwFocus ? toRgb(theme.colors['--focus']) : toRgba(theme.colors['--border'], 0.08),
                    borderWidth: pwFocus ? 2 : 1,
                    color: toRgb(theme.colors['--text-primary']),
                    paddingRight: 64,
                    shadowColor: toRgb(theme.colors['--focus']),
                    shadowOpacity: pwFocus ? 0.35 : 0,
                    shadowRadius: pwFocus ? 10 : 0,
                    elevation: pwFocus ? 4 : 0,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                ref={passwordRef}
                returnKeyType="done"
                onSubmitEditing={() => { if (canLogin) setModal(true); }}
                onFocus={() => setPwFocus(true)}
                onBlur={() => setPwFocus(false)}
              />
              {!!password && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear password"
                  onPress={() => setPassword('')}
                  style={styles.clearBtnLeft}
                >
                  <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
                onPress={() => setShowPw((v) => !v)}
                style={[styles.showBtn, { backgroundColor: toRgba(theme.colors['--border'], 0.06) }]}
              >
                {showPw ? (
                  <Entypo name="eye-with-line" size={16} color={toRgb(theme.colors['--text-primary'])} />
                ) : (
                  <AntDesign name="eye" size={16} color={toRgb(theme.colors['--text-primary'])} />
                )}
              </Pressable>
            </View>

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
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 8 }}>Or, start our personality quiz to start making an account</Text>
            <Button
              title="Start Personality Quiz"
              onPress={() => navigation.navigate('Registration', { email })}
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
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  inputWrap: { position: 'relative' },
  showBtn: { position: 'absolute', right: 12, top: 10, padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  clearBtn: { position: 'absolute', right: 12, top: 10, padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  clearBtnLeft: { position: 'absolute', right: 52, top: 10, padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  showTxt: { color: '#fff', fontWeight: '700' },
  warn: { color: '#f59e0b', marginTop: -8, marginBottom: 8 },
});
