import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, RefreshControl, Pressable, KeyboardAvoidingView, Platform, Keyboard, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
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
import supabase, { signUpWithPassword, signInWithPassword, upsertProfile } from '@services/supabase';
import { useSessionStore } from '@store/sessionStore';

type Nav = StackNavigationProp<RootStackParamList, 'CreateAccount'>;
type Route = RouteProp<RootStackParamList, 'CreateAccount'>;
type Props = { navigation: Nav; route: Route };

const AGE_VALUES = ['<18', '18-24', '25-35', '35-44', '45+'] as const;
const AGE_KEYS = ['under18', 'range18_24', 'range25_35', 'range35_44', 'range45_plus'] as const;
const GENDER_VALUES = ['Male', 'Female', 'Non-Binary', 'Prefer Not To Say'] as const;
const GENDER_KEYS = ['male', 'female', 'nonBinary', 'preferNot'] as const;

type NoticeState = {
  title: string;
  message: string;
  primaryText?: string;
  primaryVariant?: 'primary' | 'danger' | 'accent';
};

// TODO: replace this mock with TensorFlow Lite model output
function mockFingerprint(scores: Record<string, number> | undefined) {
  if (!scores) return 'fp(—, —)';
  const toPct = (value?: number) => (value ?? 0) * 100;
  const extraversion = toPct(scores['Extraversion']);
  const stability = toPct(scores['Emotional Stability']);
  const openness = toPct(scores['Intellect/Imagination']);
  const agreeableness = toPct(scores['Agreeableness']);
  const conscientiousness = toPct(scores['Conscientiousness']);
  const x = (extraversion - (100 - stability) + openness) / 3;
  const y = (agreeableness + conscientiousness) / 2;
  const xf = Math.max(0, Math.min(100, Math.round(x)));
  const yf = Math.max(0, Math.min(100, Math.round(y)));
  return `fp(${xf}, ${yf})`;
}

type StrengthKey = 'weak' | 'medium' | 'strong';

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  // 0-6
  if (score <= 2) return { key: 'weak' as StrengthKey, color: '#ef4444', pct: 33 };
  if (score <= 4) return { key: 'medium' as StrengthKey, color: '#f59e0b', pct: 66 };
  return { key: 'strong' as StrengthKey, color: '#22c55e', pct: 100 };
}

// Determine character group from normalized scores
function determineCharacterGroup(scores?: Record<string, number>) {
  if (!scores) return null;
  const toPct = (value?: number) => (value ?? 0) * 100;
  const E = toPct(scores['Extraversion']);
  const A = toPct(scores['Agreeableness']);
  const C = toPct(scores['Conscientiousness']);
  const O = toPct(scores['Intellect/Imagination']); // Openness
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
  const { t } = useTranslation();
  const { createAccountDraft, setCreateAccountDraft, clearCreateAccountDraft, clearAllDrafts, setResumeTarget } = useSessionStore();
  const hydratedRef = useRef(false);
  const paramsRef = useRef<RootStackParamList['CreateAccount'] | undefined>(route.params);
  const draftRef = useRef(createAccountDraft);
  useEffect(() => {
    paramsRef.current = route.params;
  }, [route.params]);
  useEffect(() => {
    draftRef.current = createAccountDraft;
  }, [createAccountDraft]);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
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
  const [creating, setCreating] = useState(false);
  const emailRef = useRef<TextInput>(null as any);
  const genderRef = useRef<DropdownHandle>(null);
  const ageRef = useRef<DropdownHandle>(null);
  const passwordRef = useRef<TextInput>(null as any);
  const confirmRef = useRef<TextInput>(null as any);

  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const usernameValid = useMemo(() => username.trim().length >= 3, [username]);
  const strength = useMemo(() => passwordStrength(password), [password]);
  const strengthLabel = useMemo(() => t(`createAccount.passwordStrength.${strength.key}`), [strength.key, t]);
  const confirmValid = useMemo(() => confirm.length > 0 && confirm === password, [confirm, password]);
  const canSubmit = usernameValid && emailValid && ageGroup && gender && password.length >= 8 && confirmValid && agreed;

  const ageOptions = useMemo(
    () => AGE_KEYS.map((key, idx) => ({ label: t(`registration.options.ageGroups.${key}`), value: AGE_VALUES[idx] })),
    [t],
  );

  const genderOptions = useMemo(
    () => GENDER_KEYS.map((key, idx) => ({ label: t(`registration.options.genders.${key}`), value: GENDER_VALUES[idx] })),
    [t],
  );

  const fp = mockFingerprint(route.params?.scores);
  const characterGroup = useMemo(() => determineCharacterGroup(route.params?.scores) ?? undefined, [route.params?.scores]);

  const openNotice = (config: NoticeState) => {
    setNotice(config);
  };

  const closeNotice = () => setNotice(null);

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

  useFocusEffect(
    useCallback(() => {
      setResumeTarget('createAccount');
      return undefined;
    }, [setResumeTarget]),
  );

  useEffect(() => {
    if (hydratedRef.current) return;
    if (createAccountDraft) {
      setUsername(createAccountDraft.form.username ?? '');
      setEmail(createAccountDraft.form.email ?? '');
      setAgeGroup(createAccountDraft.form.ageGroup ?? '');
      setGender(createAccountDraft.form.gender ?? '');
      setAgreed(createAccountDraft.form.agreed ?? false);
      paramsRef.current = createAccountDraft.params;
    } else if (route.params) {
      setUsername(route.params.username ?? '');
      setEmail(route.params.email ?? '');
      setAgeGroup(route.params.ageGroup ?? '');
      setGender(route.params.gender ?? '');
    }
    hydratedRef.current = true;
  }, [createAccountDraft, route.params]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const hasFormData = Boolean((username ?? '').trim() || (email ?? '').trim() || ageGroup || gender || agreed);
    if (!hasFormData) {
      if (createAccountDraft) {
        clearCreateAccountDraft();
      }
      return;
    }
    const base = paramsRef.current ?? {};
    const fallbackScores = (base as any)?.scores ?? draftRef.current?.params?.scores ?? {};
    const resumeParams: RootStackParamList['CreateAccount'] = {
      ...(base as object),
      username,
      email,
      ageGroup,
      gender,
      scores: fallbackScores,
    } as RootStackParamList['CreateAccount'];
    setCreateAccountDraft({
      params: resumeParams,
      form: { username, email, ageGroup, gender, agreed },
      lastUpdated: Date.now(),
    });
  }, [username, email, ageGroup, gender, agreed, setCreateAccountDraft, clearCreateAccountDraft, createAccountDraft]);

  const handleCreateAccount = async () => {
    if (!canSubmit || creating) {
      if (!canSubmit) focusNextUntouched('confirm');
      return;
    }
    const mail = email.trim();
    const uname = username.trim();
    setCreating(true);
    try {
      const normalizedEmail = mail.toLowerCase();
      const { count: emailCount, error: emailLookupError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('email', normalizedEmail);
      if (emailLookupError) {
        console.warn('[CreateAccount] email lookup failed', emailLookupError);
        if ((emailLookupError as any)?.code === 'PGRST205') {
          openNotice({
            title: t('createAccount.notices.usersViewMissingTitle'),
            message: t('createAccount.notices.usersViewMissingMessage'),
            primaryVariant: 'danger',
          });
          return;
        }
      }
      const emailExists = (emailCount ?? 0) > 0;
      console.log('[CreateAccount] email availability check complete', {
        email: normalizedEmail,
        emailExists,
        emailLookupError: emailLookupError?.message,
      });
      if (emailExists) {
        openNotice({
          title: t('createAccount.notices.emailExistsTitle'),
          message: t('createAccount.notices.emailExistsMessage'),
          primaryVariant: 'danger',
        });
        return;
      }

      let usernameTaken = false;
      const { count: usernameCount, error: usernameLookupError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .filter('raw_user_meta_data->>username', 'ilike', uname);
      if (usernameLookupError) {
        console.warn('[CreateAccount] username lookup against public.users failed', usernameLookupError);
        if ((usernameLookupError as any)?.code === 'PGRST205') {
          openNotice({
            title: t('createAccount.notices.usersViewMissingTitle'),
            message: t('createAccount.notices.usersViewMissingMessage'),
            primaryVariant: 'danger',
          });
          return;
        }
      }
      usernameTaken = (usernameCount ?? 0) > 0;
      console.log('[CreateAccount] username availability check (auth.users metadata)', {
        username: uname,
        usernameTakenViaAuth: usernameTaken,
        usernameLookupError: usernameLookupError?.message,
      });

      if (!usernameTaken) {
        const { count: profileUsernameCount, error: profileUsernameError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .ilike('username', uname);
        if (profileUsernameError) {
          console.warn('[CreateAccount] username lookup against profiles failed', profileUsernameError);
        }
        usernameTaken = usernameTaken || (profileUsernameCount ?? 0) > 0;
        console.log('[CreateAccount] username availability check (profiles fallback)', {
          username: uname,
          usernameTakenViaProfiles: (profileUsernameCount ?? 0) > 0,
          profileUsernameError: profileUsernameError?.message,
        });
      }

      if (usernameTaken) {
        openNotice({
          title: t('createAccount.notices.usernameUnavailableTitle'),
          message: t('createAccount.notices.usernameUnavailableMessage'),
          primaryVariant: 'danger',
        });
        return;
      }

      const { data, error } = await signUpWithPassword(mail, password, { username: uname, age_group: ageGroup, gender });
      console.log('[CreateAccount] signUp response:', { data, error });
      if (error) {
        const normalized = (error.message ?? '').toLowerCase();
        if (normalized.includes('already registered') || normalized.includes('already exists')) {
          openNotice({
            title: t('createAccount.notices.emailExistsTitle'),
            message: t('createAccount.notices.emailExistsMessage'),
            primaryVariant: 'danger',
          });
        } else {
          openNotice({
            title: t('createAccount.notices.genericErrorTitle'),
            message: error.message ?? t('createAccount.notices.genericErrorMessage'),
            primaryVariant: 'danger',
          });
        }
        return;
      }
      const user = data.user;
      const identities = user?.identities ?? [];
      if (!data.session && user && identities.length === 0) {
        openNotice({
          title: t('createAccount.notices.emailExistsTitle'),
          message: t('createAccount.notices.emailExistsMessage'),
          primaryVariant: 'danger',
        });
        return;
      }
      if (data.session && user?.id) {
        const { error: profileError } = await upsertProfile({
          id: user.id,
          username: uname,
          age_group: ageGroup,
          gender,
          character_group: characterGroup,
        });
        if (profileError) {
          const details = `${profileError.details ?? profileError.message ?? ''}`.toLowerCase();
          if (profileError.code === '23505' || details.includes('duplicate key value')) {
            openNotice({
              title: t('createAccount.notices.usernameUnavailableTitle'),
              message: t('createAccount.notices.usernameUnavailableMessage'),
              primaryVariant: 'danger',
            });
          } else {
            openNotice({
              title: t('createAccount.notices.profileSaveTitle'),
              message: profileError.message ?? t('createAccount.notices.profileSaveMessage'),
              primaryVariant: 'danger',
            });
          }
          return;
        }
        clearAllDrafts();
        setCreated(true);
        return;
      }

      const { data: sdata, error: signInErr } = await signInWithPassword(mail, password);
      console.log('[CreateAccount] signIn fallback response:', { data: sdata, error: signInErr });
      if (!signInErr && sdata.user?.id) {
        const { error: profileError } = await upsertProfile({
          id: sdata.user.id,
          username: uname,
          age_group: ageGroup,
          gender,
          character_group: characterGroup,
        });
        if (profileError) {
          const details = `${profileError.details ?? profileError.message ?? ''}`.toLowerCase();
          if (profileError.code === '23505' || details.includes('duplicate key value')) {
          openNotice({
            title: t('createAccount.notices.usernameUnavailableTitle'),
            message: t('createAccount.notices.usernameUnavailableMessage'),
            primaryVariant: 'danger',
          });
        } else {
          openNotice({
            title: t('createAccount.notices.profileSaveTitle'),
            message: profileError.message ?? t('createAccount.notices.profileSaveMessage'),
            primaryVariant: 'danger',
          });
        }
          return;
        }
        clearAllDrafts();
        setCreated(true);
        return;
      }

      navigation.navigate('VerifyEmail' as any, {
        email: mail,
        password,
        username: uname,
        ageGroup,
        gender,
        scores: route.params?.scores ?? {},
        origin: 'signup',
      });
    } catch (err: any) {
      console.log('[CreateAccount] signUp exception', err);
      openNotice({
        title: t('createAccount.notices.genericErrorTitle'),
        message: err?.message ?? t('createAccount.notices.genericErrorMessage'),
        primaryVariant: 'danger',
      });
    } finally {
      setCreating(false);
    }
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
            <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{t('createAccount.title')}</Text>
            <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>{t('createAccount.subtitle')}</Text>

            {/* TODO: connect to Firebase Auth + GCP backend */}
            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <AntDesign name="user" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
              <TextInput
                placeholder={t('createAccount.usernamePlaceholder')}
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
              <Pressable accessibilityRole="button" accessibilityLabel={t('createAccount.a11y.clearUsername')} onPress={() => setUsername('')} style={styles.clearBtn}>
                <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
              </Pressable>
            )}
            </View>
            {!usernameValid && username.length > 0 && (
              <Text style={styles.warn}>{t('createAccount.errors.usernameTooShort')}</Text>
            )}

            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <Entypo name="email" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
              <TextInput
                placeholder={t('createAccount.emailPlaceholder')}
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
              <Pressable accessibilityRole="button" accessibilityLabel={t('createAccount.a11y.clearEmail')} onPress={() => setEmail('')} style={styles.clearBtn}>
                <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
              </Pressable>
            )}
            </View>
            {!emailValid && email.length > 0 && <Text style={styles.warn}>{t('createAccount.errors.invalidEmail')}</Text>}

            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <FontAwesome name="transgender-alt" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
              <Dropdown
                options={genderOptions}
                value={gender}
                onChange={(v) => setGender(v)}
                placeholder={t('createAccount.genderPlaceholder')}
                ref={genderRef}
                onCommit={() => goNext('gender')}
              />
            </View>
            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <FontAwesome6 name="users-line" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
              <Dropdown
                options={ageOptions}
                value={ageGroup}
                onChange={(v) => setAgeGroup(v)}
                placeholder={t('createAccount.agePlaceholder')}
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
                placeholder={t('createAccount.passwordPlaceholder')}
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
                <Pressable accessibilityRole="button" accessibilityLabel={t('createAccount.a11y.clearPassword')} onPress={() => setPassword('')} style={styles.clearBtnLeft}>
                  <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPw ? t('createAccount.a11y.hidePassword') : t('createAccount.a11y.showPassword')}
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
              <Text style={[styles.strengthText, { color: strength.color }]}>{strengthLabel}</Text>
            </View>
            <Text style={[styles.hint, { color: toRgb(theme.colors['--text-secondary']) }]}>{t('createAccount.passwordHint')}</Text>

            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <MaterialIcons name="password" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
             <TextInput
                placeholder={t('createAccount.confirmPlaceholder')}
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
                  if (canSubmit) handleCreateAccount(); else focusNextUntouched('confirm');
                }}
                onFocus={() => setCFocus(true)}
                onBlur={() => setCFocus(false)}
              />
              {!!confirm && (
                <Pressable accessibilityRole="button" accessibilityLabel={t('createAccount.a11y.clearConfirm')} onPress={() => setConfirm('')} style={styles.clearBtnLeft}>
                  <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showConfirm ? t('createAccount.a11y.hideConfirm') : t('createAccount.a11y.showConfirm')}
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
              <Text style={styles.warn}>{t('createAccount.errors.confirmMismatch')}</Text>
            )}

            {/* Mock fingerprint — TODO: supply from TF Lite model via useTensorflowModel */}
            <View style={[styles.fpRow, { borderColor: toRgba(theme.colors['--border'], 0.08) }]}>
              <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>{t('createAccount.fingerprintLabel')}</Text>
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
                {t('createAccount.terms.prefix')}{' '}
                <Text
                  style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700' }}
                  onPress={() => openNotice({
                    title: t('createAccount.terms.termsModalTitle'),
                    message: t('createAccount.terms.termsModalMessage'),
                  })}
                >
                  {t('createAccount.terms.termsLink')}
                </Text>{' '}
                {t('createAccount.terms.and')}{' '}
                <Text
                  style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700' }}
                  onPress={() => openNotice({
                    title: t('createAccount.terms.privacyModalTitle'),
                    message: t('createAccount.terms.privacyModalMessage'),
                  })}
                >
                  {t('createAccount.terms.privacyLink')}
                </Text>
              </Text>
            </View>

            <View style={{ height: 12 }} />
            {jumpHint ? (
              <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6 }}>
                {t('createAccount.jumpHint')}
              </Text>
            ) : null}
            <View>
              <Button
                title={creating ? t('createAccount.creating') : t('createAccount.submit')}
                style={{ width: '100%' }}
                onPress={handleCreateAccount}
                disabled={!canSubmit || creating}
              />
              <View style={{ height: 10 }} />
              <Button
                title={t('createAccount.backToLogin')}
                style={{ width: '100%' }}
                variant="neutral"
                onPress={() => setConfirmExit(true)}
              />
            </View>

            {/* TODO: implement social sign-in providers via Firebase Auth (Google, Facebook, Apple, Microsoft) */}
            <View style={{ height: 16 }} />
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 8 }}>{t('createAccount.socials.heading')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'space-around' }}>
              <SocialButton
                style={{padding: 10}}
                provider="google"
                onPress={() => openNotice({
                  title: t('createAccount.socials.modalTitle'),
                  message: t('createAccount.socials.modalMessage', { provider: t('createAccount.socials.providers.google') }),
                })}
              />
              <SocialButton
                provider="facebook"
                onPress={() => openNotice({
                  title: t('createAccount.socials.modalTitle'),
                  message: t('createAccount.socials.modalMessage', { provider: t('createAccount.socials.providers.facebook') }),
                })}
              />
              <SocialButton
                provider="apple"
                onPress={() => openNotice({
                  title: t('createAccount.socials.modalTitle'),
                  message: t('createAccount.socials.modalMessage', { provider: t('createAccount.socials.providers.apple') }),
                })}
              />
              <SocialButton
                provider="microsoft"
                onPress={() => openNotice({
                  title: t('createAccount.socials.modalTitle'),
                  message: t('createAccount.socials.modalMessage', { provider: t('createAccount.socials.providers.microsoft') }),
                })}
              />
            </View>
          </Card>
        </ScrollView>
        </KeyboardAvoidingView>

        <NotificationModal
          visible={!!notice}
          title={notice?.title}
          message={notice?.message}
          primaryText={notice?.primaryText ?? t('common.ok')}
          primaryVariant={notice?.primaryVariant}
          onPrimary={closeNotice}
          onRequestClose={closeNotice}
        />
        <NotificationModal
          visible={created}
          title={t('createAccount.notices.successTitle')}
          message={t('createAccount.notices.successMessage')}
          primaryText={t('createAccount.success.loginNow')}
          onPrimary={() => { setCreated(false); clearAllDrafts(); navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] }); }}
          secondaryText={t('createAccount.success.useDifferent')}
          onSecondary={() => { setCreated(false); clearAllDrafts(); navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] }); }}
          onRequestClose={() => setCreated(false)}
          primaryVariant="primary"
          secondaryVariant="muted"
          stacked
        />
        <NotificationModal
          visible={confirmExit}
          title={t('createAccount.confirmExit.title')}
          message={t('createAccount.confirmExit.message')}
          primaryText={t('createAccount.confirmExit.leave')}
          onPrimary={() => { setConfirmExit(false); navigation.reset({ index: 0, routes: [{ name: 'Login' as any }] }); }}
          secondaryText={t('createAccount.confirmExit.stay')}
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
