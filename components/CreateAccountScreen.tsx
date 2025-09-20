import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, RefreshControl, Pressable, KeyboardAvoidingView, Platform, Keyboard, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Dropdown, { DropdownHandle } from '@components/common/Dropdown';
import NotificationModal from '@components/common/NotificationModal';
import SocialButton from '@components/common/SocialButton';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { signUpWithPassword, signInWithPassword, upsertProfile } from '@services/supabase';

type Nav = StackNavigationProp<RootStackParamList, 'CreateAccount'>;
type Route = RouteProp<RootStackParamList, 'CreateAccount'>;
type Props = { navigation: Nav; route: Route };

const ageGroups = ['<18', '18-24', '25-35', '35-44', '45+'];
const genders = ['Male', 'Female', 'Non-Binary', 'Prefer Not To Say'];

// TODO: replace this mock with TensorFlow Lite model output
function mockFingerprint(scores: Record<string, number> | undefined) {
  if (!scores) return 'fp(—, —)';
  const x = ((scores['Extraversion'] ?? 50) - (100 - (scores['Emotional Stability'] ?? 50)) + (scores['Intellect/Imagination'] ?? 50)) / 3;
  const y = ((scores['Agreeableness'] ?? 50) + (scores['Conscientiousness'] ?? 50)) / 2;
  const xf = Math.max(0, Math.min(100, Math.round(x)));
  const yf = Math.max(0, Math.min(100, Math.round(y)));
  return `fp(${xf}, ${yf})`;
}

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  // 0-6
  if (score <= 2) return { label: 'Weak', color: '#ef4444', pct: 33 };
  if (score <= 4) return { label: 'Medium', color: '#f59e0b', pct: 66 };
  return { label: 'Strong', color: '#22c55e', pct: 100 };
}

// Determine character group from normalized scores
function determineCharacterGroup(scores?: Record<string, number>) {
  if (!scores) return null;
  const E = scores['Extraversion'] ?? 0;
  const A = scores['Agreeableness'] ?? 0;
  const C = scores['Conscientiousness'] ?? 0;
  const O = scores['Intellect/Imagination'] ?? 0; // Openness
  const HIGH = 70;
  const VERY_HIGH = 85;
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

const CreateAccountScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [created, setCreated] = useState(false);

  const [username, setUsername] = useState(route.params?.username ?? '');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [ageGroup, setAgeGroup] = useState(route.params?.ageGroup ?? '');
  const [gender, setGender] = useState(route.params?.gender ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [uFocus, setUFocus] = useState(false);
  const [eFocus, setEFocus] = useState(false);
  const [pFocus, setPFocus] = useState(false);
  const [cFocus, setCFocus] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [jumpHint, setJumpHint] = useState(false);
  const emailRef = useRef<TextInput>(null as any);
  const genderRef = useRef<DropdownHandle>(null);
  const ageRef = useRef<DropdownHandle>(null);
  const passwordRef = useRef<TextInput>(null as any);
  const confirmRef = useRef<TextInput>(null as any);

  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const usernameValid = useMemo(() => username.trim().length >= 3, [username]);
  const strength = useMemo(() => passwordStrength(password), [password]);
  const confirmValid = useMemo(() => confirm.length > 0 && confirm === password, [confirm, password]);
  const canSubmit = usernameValid && emailValid && ageGroup && gender && password.length >= 8 && confirmValid && agreed;

  const fp = mockFingerprint(route.params?.scores);

  // Focus the next untouched field forward; otherwise dismiss
  const openDropdownAfterClose = (fn: () => void) => {
    try {
      InteractionManager.runAfterInteractions(() => setTimeout(fn, 80));
    } catch {
      setTimeout(fn, 160);
    }
  };

  // Advance only to the next empty field; if none remain, do nothing
  const nextEmptyAfter = (from: 'username'|'email'|'gender'|'age'|'password'|'confirm') => {
    const order: Array<'username'|'email'|'gender'|'age'|'password'|'confirm'> = ['username','email','gender','age','password','confirm'];
    const idx = order.indexOf(from);
    for (let i = idx + 1; i < order.length; i++) {
      const f = order[i];
      if (f === 'email' && !email) return f;
      if (f === 'gender' && !gender) return f;
      if (f === 'age' && !ageGroup) return f;
      if (f === 'password' && !password) return f;
      if (f === 'confirm' && !confirm) return f;
    }
    return null;
  };

  const goNext = (from: 'username'|'email'|'gender'|'age'|'password'|'confirm') => {
    const next = nextEmptyAfter(from);
    if (!next) { setJumpHint(true); setTimeout(() => setJumpHint(false), 1500); Keyboard.dismiss(); return; }
    if (next === 'email') { emailRef.current?.focus?.(); return; }
    if (next === 'gender') { openDropdownAfterClose(() => genderRef.current?.open?.()); return; }
    if (next === 'age') { openDropdownAfterClose(() => ageRef.current?.open?.()); return; }
    if (next === 'password') { openDropdownAfterClose(() => passwordRef.current?.focus?.()); return; }
    if (next === 'confirm') { openDropdownAfterClose(() => confirmRef.current?.focus?.()); return; }
  };

  const focusNextUntouched = (from: 'username'|'email'|'gender'|'age'|'password'|'confirm') => {
    const order: Array<'username'|'email'|'gender'|'age'|'password'|'confirm'> = ['username','email','gender','age','password','confirm'];
    const idx = order.indexOf(from);
    for (let i = idx + 1; i < order.length; i++) {
      const f = order[i];
      if (f === 'email' && !email) { emailRef.current?.focus?.(); return; }
      if (f === 'gender' && !gender) { openDropdownAfterClose(() => genderRef.current?.open?.()); return; }
      if (f === 'age' && !ageGroup) { openDropdownAfterClose(() => ageRef.current?.open?.()); return; }
      if (f === 'password' && !password) { openDropdownAfterClose(() => passwordRef.current?.focus?.()); return; }
      if (f === 'confirm' && !confirm) { openDropdownAfterClose(() => confirmRef.current?.focus?.()); return; }
    }
    Keyboard.dismiss();
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
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
            <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>Create your account</Text>
            <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>Review your info and set a password</Text>

            {/* TODO: connect to Firebase Auth + GCP backend */}
            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <AntDesign name="user" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
              <TextInput
                placeholder="Username"
              placeholderTextColor={toRgb(theme.colors['--text-muted'])}
              style={[
                styles.input,
                {
                  backgroundColor: toRgb(theme.colors['--surface']),
                  borderColor: uFocus ? toRgb(theme.colors['--focus']) : toRgba(theme.colors['--border'], 0.08),
                  borderWidth: uFocus ? 2 : 1,
                  color: toRgb(theme.colors['--text-primary']),
                  shadowColor: toRgb(theme.colors['--focus']),
                  shadowOpacity: uFocus ? 0.35 : 0,
                  shadowRadius: uFocus ? 10 : 0,
                  elevation: uFocus ? 4 : 0,
                },
              ]}
              value={username}
              onChangeText={setUsername}
              returnKeyType="next"
              onSubmitEditing={() => goNext('username')}
              blurOnSubmit={false}
              onFocus={() => setUFocus(true)}
              onBlur={() => setUFocus(false)}
            />
            {!!username && (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear username" onPress={() => setUsername('')} style={styles.clearBtn}>
                <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
              </Pressable>
            )}
            </View>
            {!usernameValid && username.length > 0 && (
              <Text style={styles.warn}>Username must be at least 3 characters.</Text>
            )}

            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <Entypo name="email" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
              <TextInput
                placeholder="Email"
              placeholderTextColor={toRgb(theme.colors['--text-muted'])}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  backgroundColor: toRgb(theme.colors['--surface']),
                  borderColor: eFocus ? toRgb(theme.colors['--focus']) : toRgba(theme.colors['--border'], 0.08),
                  borderWidth: eFocus ? 2 : 1,
                  color: toRgb(theme.colors['--text-primary']),
                  shadowColor: toRgb(theme.colors['--focus']),
                  shadowOpacity: eFocus ? 0.35 : 0,
                  shadowRadius: eFocus ? 10 : 0,
                  elevation: eFocus ? 4 : 0,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              ref={emailRef}
              returnKeyType="next"
              onSubmitEditing={() => goNext('email')}
              blurOnSubmit={false}
              onFocus={() => setEFocus(true)}
              onBlur={() => setEFocus(false)}
            />
            {!!email && (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear email" onPress={() => setEmail('')} style={styles.clearBtn}>
                <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
              </Pressable>
            )}
            </View>
            {!emailValid && email.length > 0 && <Text style={styles.warn}>Please enter a valid email.</Text>}

            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <FontAwesome name="transgender-alt" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
              <Dropdown
                options={genders}
                value={gender}
                onChange={(v) => setGender(v)}
                placeholder="Choose your gender"
                ref={genderRef}
                onCommit={() => goNext('gender')}
              />
            </View>
            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <FontAwesome6 name="users-line" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
              <Dropdown
                options={ageGroups}
                value={ageGroup}
                onChange={(v) => setAgeGroup(v)}
                placeholder="Choose your age group"
                ref={ageRef}
                onCommit={() => goNext('age')}
              />
            </View>

            {/* TODO: enforce stronger password policies per product requirements */}
            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <MaterialIcons name="password" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
              <TextInput
                placeholder="Password"
                placeholderTextColor={toRgb(theme.colors['--text-muted'])}
                style={[
                  styles.input,
                  {
                    backgroundColor: toRgb(theme.colors['--surface']),
                    borderColor: pFocus ? toRgb(theme.colors['--focus']) : toRgba(theme.colors['--border'], 0.08),
                    borderWidth: pFocus ? 2 : 1,
                    color: toRgb(theme.colors['--text-primary']),
                    paddingRight: 96,
                    shadowColor: toRgb(theme.colors['--focus']),
                    shadowOpacity: pFocus ? 0.35 : 0,
                    shadowRadius: pFocus ? 10 : 0,
                    elevation: pFocus ? 4 : 0,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                ref={passwordRef}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => goNext('password')}
                onFocus={() => setPFocus(true)}
                onBlur={() => setPFocus(false)}
              />
              {!!password && (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear password" onPress={() => setPassword('')} style={styles.clearBtnLeft}>
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
            <View style={styles.strengthWrap}>
              <View style={[styles.strengthBarBg]}>
                <View style={[styles.strengthBar, { width: `${strength.pct}%`, backgroundColor: strength.color }]} />
              </View>
              <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
            </View>
            <Text style={[styles.hint, { color: toRgb(theme.colors['--text-secondary']) }]}>Use 8+ characters with a mix of letters, numbers, and symbols.</Text>

            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <MaterialIcons name="password" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor={toRgb(theme.colors['--text-muted'])}
                style={[
                  styles.input,
                  {
                    backgroundColor: toRgb(theme.colors['--surface']),
                    borderColor: cFocus ? toRgb(theme.colors['--focus']) : toRgba(theme.colors['--border'], 0.08),
                    borderWidth: cFocus ? 2 : 1,
                    color: toRgb(theme.colors['--text-primary']),
                    paddingRight: 96,
                    shadowColor: toRgb(theme.colors['--focus']),
                    shadowOpacity: cFocus ? 0.35 : 0,
                    shadowRadius: cFocus ? 10 : 0,
                    elevation: cFocus ? 4 : 0,
                  },
                ]}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                ref={confirmRef}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (canSubmit) setShowModal(true); else focusNextUntouched('confirm');
                }}
                onFocus={() => setCFocus(true)}
                onBlur={() => setCFocus(false)}
              />
              {!!confirm && (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear confirm password" onPress={() => setConfirm('')} style={styles.clearBtnLeft}>
                  <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                onPress={() => setShowConfirm((v) => !v)}
                style={[styles.showBtn, { backgroundColor: toRgba(theme.colors['--border'], 0.06) }]}
              >
                {showConfirm ? (
                  <Entypo name="eye-with-line" size={16} color={toRgb(theme.colors['--text-primary'])} />
                ) : (
                  <AntDesign name="eye" size={16} color={toRgb(theme.colors['--text-primary'])} />
                )}
              </Pressable>
            </View>
            {!confirmValid && confirm.length > 0 && (
              <Text style={styles.warn}>Passwords do not match.</Text>
            )}

            {/* Mock fingerprint — TODO: supply from TF Lite model via useTensorflowModel */}
            <View style={[styles.fpRow, { borderColor: toRgba(theme.colors['--border'], 0.08) }]}>
              <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>Fingerprint</Text>
              <Text style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700' }}>{fp}</Text>
            </View>

            {/* Terms / Privacy acknowledgment */}
            <View style={styles.termsRow}>
              <Pressable
                onPress={() => setAgreed((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
                style={[styles.checkbox, { borderColor: agreed ? '#22c55e' : 'rgba(255,255,255,0.2)' }]}
              >
                {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
              </Pressable>
              <Text style={{ color: toRgb(theme.colors['--text-secondary']), flex: 1 }}>
                I agree to the 
                <Text
                  style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700' }}
                  onPress={() => setShowModal(true)}
                > Terms</Text> and 
                <Text
                  style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700' }}
                  onPress={() => setShowModal(true)}
                > Privacy Policy</Text>
              </Text>
            </View>

            <View style={{ height: 12 }} />
            {jumpHint ? (
              <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6 }}>
                All set — you can create your account now.
              </Text>
            ) : null}
            <View>
              <Button
                title="Create Account"
                style={{ width: '100%' }}
                onPress={async () => {
                  const mail = email.trim();
                  const uname = username.trim();
                  try {
                    const { data, error } = await signUpWithPassword(mail, password, { username: uname, age_group: ageGroup, gender });
                    if (error) {
                      setShowModal(true);
                      return;
                    }
                    const user = data.user;
                    console.log('[CreateAccount] signUp response:', { data, error });
                    if (data.session && user?.id) {
                      // Insert or update own profile (RLS owner policy)
                      await upsertProfile({ id: user.id, username: uname, age_group: ageGroup, gender, character_group: determineCharacterGroup(route.params?.scores) });
                      setCreated(true);
                    } else {
                      // Try to sign in immediately (works when email confirmation is disabled)
                      const { data: sdata, error: signInErr } = await signInWithPassword(mail, password);
                      console.log('[CreateAccount] signIn fallback response:', { data: sdata, error: signInErr });
                      if (!signInErr && sdata.user?.id) {
                        await upsertProfile({ id: sdata.user.id, username: uname, age_group: ageGroup, gender, character_group: determineCharacterGroup(route.params?.scores) });
                        setCreated(true);
                      } else {
                        // Email confirmation likely enabled in project settings, route to OTP screen
                        navigation.navigate('VerifyEmail' as any, { email: mail, password, username: uname, ageGroup, gender, scores: route.params?.scores ?? {} });
                      }
                    }
                  } catch {
                    console.log('[CreateAccount] signUp exception');
                    setShowModal(true);
                  }
                }}
                disabled={!canSubmit}
              />
              <View style={{ height: 10 }} />
              <Button
                title="Back to Login"
                style={{ width: '100%' }}
                variant="neutral"
                onPress={() => setConfirmExit(true)}
              />
            </View>

            {/* TODO: implement social sign-in providers via Firebase Auth (Google, Facebook, Apple, Microsoft) */}
            <View style={{ height: 16 }} />
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 8 }}>Or, sign in with</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'space-around' }}>
              <SocialButton style={{padding: 10}} provider="google" onPress={() => setShowModal(true)} />
              <SocialButton provider="facebook" onPress={() => setShowModal(true)} />
              <SocialButton provider="apple" onPress={() => setShowModal(true)} />
              <SocialButton provider="microsoft" onPress={() => setShowModal(true)} />
            </View>
          </Card>
        </ScrollView>
        </KeyboardAvoidingView>

        <NotificationModal
          visible={showModal}
          title="Email confirmation is enabled"
          message="For a smoother dev experience, disable 'Confirm email' in Supabase (Auth → Providers → Email). Then new accounts will auto‑login after sign up."
          primaryText="OK"
          onPrimary={() => setShowModal(false)}
          onRequestClose={() => setShowModal(false)}
        />
        <NotificationModal
          visible={created}
          title="Account created"
          message="Your account has been created successfully."
          primaryText="Login now"
          onPrimary={() => { setCreated(false); navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] }); }}
          secondaryText="Use a different account"
          onSecondary={() => { setCreated(false); navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] }); }}
          onRequestClose={() => setCreated(false)}
          primaryVariant="primary"
          secondaryVariant="muted"
          stacked
        />
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
  iconLeft: { position: 'absolute', left: -24, top: 14 },
  showBtn: { position: 'absolute', right: 12, top: 10, padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  clearBtn: { position: 'absolute', right: 12, top: 10, padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  clearBtnLeft: { position: 'absolute', right: 52, top: 10, padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  showTxt: { color: '#fff', fontWeight: '700' },
  warn: { color: '#f59e0b', marginTop: -8, marginBottom: 8 },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -4, marginBottom: 12 },
  strengthBarBg: { flex: 1, height: 6, borderRadius: 4, overflow: 'hidden' },
  strengthBar: { height: '100%' },
  strengthText: { fontWeight: '700' },
  hint: { color: '--text-secondary', marginTop: -6, marginBottom: 10, fontSize: 12 },
  fpRow: { marginTop: 8, padding: 12, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#22c55e', fontWeight: '900' },
});

export default CreateAccountScreen;
