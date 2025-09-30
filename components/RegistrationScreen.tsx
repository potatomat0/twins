import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, Keyboard, InteractionManager, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
import { toRgb, toRgba } from '@themes/index';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import Dropdown, { DropdownHandle } from '@components/common/Dropdown';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import KeyboardDismissable from '@components/common/KeyboardDismissable';
import { useSessionStore } from '@store/sessionStore';

type Nav = StackNavigationProp<RootStackParamList, 'Registration'>;
type Route = RouteProp<RootStackParamList, 'Registration'>;
type Props = { navigation: Nav; route: Route };

const AGE_GROUP_OPTIONS = [
  { value: '<18', key: 'under18' },
  { value: '18-24', key: 'range18_24' },
  { value: '25-35', key: 'range25_35' },
  { value: '35-44', key: 'range35_44' },
  { value: '45+', key: 'range45_plus' },
] as const;

const GENDER_OPTIONS = [
  { value: 'Male', key: 'male' },
  { value: 'Female', key: 'female' },
  { value: 'Non-Binary', key: 'nonBinary' },
  { value: 'Prefer Not To Say', key: 'preferNot' },
] as const;

const RegistrationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { registrationDraft, setRegistrationDraft, clearRegistrationDraft, setResumeTarget } = useSessionStore();
  const hydratedRef = useRef(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [jumpHint, setJumpHint] = useState(false);
  const [uFocus, setUFocus] = useState(false);
  const [eFocus, setEFocus] = useState(false);
  const [ageGroup, setAgeGroup] = useState('');
  const [gender, setGender] = useState('');
  const usernameRef = useRef<TextInput>(null as any);
  const emailRef = useRef<TextInput>(null as any);
  const ageRef = useRef<DropdownHandle>(null);
  const genderRef = useRef<DropdownHandle>(null);

  const emailValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const usernameValid = useMemo(() => username.trim().length >= 2, [username]);

  const canStart = usernameValid && emailValid && ageGroup && gender;

  const ageOptions = useMemo(
    () =>
      AGE_GROUP_OPTIONS.map((opt) => ({
        label: t(`registration.options.ageGroups.${opt.key}`),
        value: opt.value,
      })),
    [t],
  );

  const genderOptions = useMemo(
    () =>
      GENDER_OPTIONS.map((opt) => ({
        label: t(`registration.options.genders.${opt.key}`),
        value: opt.value,
      })),
    [t],
  );

  // Focus the next untouched field in forward order; otherwise dismiss
  const openDropdownAfterClose = (fn: () => void) => {
    try {
      InteractionManager.runAfterInteractions(() => setTimeout(fn, 80));
    } catch {
      setTimeout(fn, 160);
    }
  };

  // Advance to the next empty field; if none remain, do nothing
  const nextEmptyAfter = (from: 'username'|'email'|'age'|'gender') => {
    const order: Array<'username'|'email'|'age'|'gender'> = ['username','email','age','gender'];
    const idx = order.indexOf(from);
    for (let i = idx + 1; i < order.length; i++) {
      const f = order[i];
      if (f === 'email' && !email) return f;
      if (f === 'age' && !ageGroup) return f;
      if (f === 'gender' && !gender) return f;
    }
    return null;
  };

  const goNext = (from: 'username'|'email'|'age'|'gender') => {
    const next = nextEmptyAfter(from);
    if (!next) { setJumpHint(true); setTimeout(() => setJumpHint(false), 1500); Keyboard.dismiss(); return; }
    if (next === 'email') { emailRef.current?.focus?.(); return; }
    if (next === 'age') { openDropdownAfterClose(() => ageRef.current?.open?.()); return; }
    if (next === 'gender') { openDropdownAfterClose(() => genderRef.current?.open?.()); return; }
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  useFocusEffect(
    useCallback(() => {
      setResumeTarget('registration');
      return undefined;
    }, [setResumeTarget]),
  );

  useEffect(() => {
    if (!hydratedRef.current && registrationDraft) {
      setUsername(registrationDraft.username ?? '');
      setEmail(registrationDraft.email ?? '');
      setAgeGroup(registrationDraft.ageGroup ?? '');
      setGender(registrationDraft.gender ?? '');
    }
    hydratedRef.current = true;
  }, [registrationDraft]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const hasData = Boolean((username ?? '').trim() || (email ?? '').trim() || ageGroup || gender);
    if (hasData) {
      setRegistrationDraft({ username, email, ageGroup, gender });
    } else {
      if (registrationDraft) {
        clearRegistrationDraft();
      }
    }
  }, [username, email, ageGroup, gender, setRegistrationDraft, clearRegistrationDraft, registrationDraft]);

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
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{t('registration.title')}</Text>
        <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>{t('registration.subtitle')}</Text>

        <View style={styles.inputWrap}>
        <View style={styles.iconLeft}>
          <AntDesign name="user" size={12} color={toRgb(theme.colors['--text-muted'])} />
        </View>
        <TextInput
          placeholder={t('registration.usernamePlaceholder')}
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
          <Pressable accessibilityRole="button" accessibilityLabel={t('registration.accessibility.clearUsername')} onPress={() => setUsername('')} style={styles.clearBtn}>
            <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
          </Pressable>
        )}
        </View>
        {!usernameValid && username.length > 0 && (
          <Text style={styles.warn}>{t('registration.usernameRequirement')}</Text>
        )}

        <View style={styles.inputWrap}>
        <View style={styles.iconLeft}>
          <Entypo name="email" size={12} color={toRgb(theme.colors['--text-muted'])} />
        </View>
        <TextInput
          placeholder={t('registration.emailPlaceholder')}
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
          <Pressable accessibilityRole="button" accessibilityLabel={t('registration.accessibility.clearEmail')} onPress={() => setEmail('')} style={styles.clearBtn}>
            <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
          </Pressable>
        )}
        </View>
        {!emailValid && email.length > 0 && <Text style={styles.warn}>{t('registration.errors.invalidEmail')}</Text>}

        <View style={styles.inputWrap}>
          <View style={styles.iconLeft}>
            <FontAwesome6 name="users-line" size={12} color={toRgb(theme.colors['--text-muted'])} />
          </View>
          <Dropdown
            options={ageOptions}
            value={ageGroup}
            onChange={(v) => setAgeGroup(v)}
            placeholder={t('registration.agePlaceholder')}
            ref={ageRef}
            onCommit={() => goNext('age')}
          />
        </View>
        <View style={styles.inputWrap}>
          <View style={styles.iconLeft}>
            <FontAwesome name="transgender-alt" size={12} color={toRgb(theme.colors['--text-muted'])} />
          </View>
          <Dropdown
            options={genderOptions}
            value={gender}
            onChange={(v) => setGender(v)}
            placeholder={t('registration.genderPlaceholder')}
            ref={genderRef}
          />
        </View>

        {jumpHint ? (
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6 }}>{t('registration.jumpHint')}</Text>
        ) : null}
        <Button
          title={t('registration.startCta')}
          onPress={() => {
            const uname = username.trim();
            const mail = email.trim();
            navigation.navigate('Questionnaire', {
              username: uname,
              email: mail,
              ageGroup,
              gender,
            });
          }}
          disabled={!canStart}
          style={{ marginTop: 8 }}
        />
      </Card>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </KeyboardDismissable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
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
  clearBtn: { position: 'absolute', right: 12, top: 10, padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  warn: { color: '#f59e0b', marginTop: -8, marginBottom: 8 },
});

export default RegistrationScreen;
