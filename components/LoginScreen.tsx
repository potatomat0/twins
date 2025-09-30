import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Entypo from '@expo/vector-icons/Entypo';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/AppNavigator';
import { useTheme } from '@context/ThemeContext';
import { useTranslation } from '@context/LocaleContext';
import { toRgb, toRgba } from '@themes/index';
import Card from '@components/common/Card';
import Button from '@components/common/Button';
import NotificationModal from '@components/common/NotificationModal';
import KeyboardDismissable from '@components/common/KeyboardDismissable';
import Dropdown from '@components/common/Dropdown';
import supabase, { signInWithPassword, fetchProfile, upsertProfile } from '@services/supabase';
import { Locale } from '@i18n/translations';

type Nav = StackNavigationProp<RootStackParamList, 'Login'>;
type Props = { navigation: Nav };

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t, locale, setLocale, availableLocales } = useTranslation();
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


  const languageOptions = useMemo(
    () =>
      availableLocales.map((code) => ({
        label: t(`login.languages.${code}`),
        value: code,
      })),
    [availableLocales, t],
  );

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
            <View style={styles.languageSwitcher}>
              <Text style={[styles.languageLabel, { color: toRgb(theme.colors['--text-secondary']) }]}>
               <Entypo name="language" /> | {t('login.languageLabel')}
              </Text>
              <Dropdown
                options={languageOptions}
                value={locale}
                onChange={(next) => setLocale(next as Locale)}
                placeholder={t('login.languagePlaceholder')}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{t('login.welcomeTitle')}</Text>
              {supabaseOk ? (
                <Text style={{ color: '#22c55e', fontWeight: '700' }}>{t('login.connectionStatus')}</Text>
              ) : supabaseOk === false ? null : null}
            </View>
            <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>{t('login.subtitle')}</Text>

            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <Entypo name="email" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
              <TextInput
                placeholder={t('login.emailPlaceholder')}
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
                  accessibilityLabel={t('login.accessibility.clearEmail')}
                  onPress={() => setEmail('')}
                  style={styles.clearBtn}
                >
                  <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
                </Pressable>
              )}
            </View>
            {!emailValid && email.length > 0 && <Text style={styles.warn}>{t('login.errors.invalidEmail')}</Text>}

            <View style={styles.inputWrap}>
              <View style={styles.iconLeft}>
                <MaterialIcons name="password" size={12} color={toRgb(theme.colors['--text-muted'])} />
              </View>
              <TextInput
                placeholder={t('login.passwordPlaceholder')}
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
                  accessibilityLabel={t('login.accessibility.clearPassword')}
                  onPress={() => setPassword('')}
                  style={styles.clearBtnLeft}
                >
                  <MaterialIcons name="clear" size={12} color={toRgb(theme.colors['--text-primary'])} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPw ? t('login.accessibility.hidePassword') : t('login.accessibility.showPassword')}
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
              title={t('login.submit')}
              onPress={async () => {
                const mail = email.trim();
                const fallbackName = (mail.split('@')[0] || 'User');
                try {
                  const { data, error } = await signInWithPassword(mail, password);
                  console.log('[Login] signIn response:', { data, error });
                  if (error) {
                    setModalTitle(t('login.errors.invalidCredentialsTitle'));
                    setModalMsg(error.message || t('login.errors.invalidCredentialsMessage'));
                    setModal(true);
                    return;
                  }
                  const authUser = data.user;
                  const userId = authUser?.id;
                  let username = (authUser?.user_metadata as any)?.username || fallbackName;
                  if (userId) {
                    const { data: prof, error: profErr } = await fetchProfile(userId);
                    console.log('[Login] fetchProfile:', { prof, profErr });
                    if (!prof) {
                      // create minimal profile with email captured
                      const { data: created, error: upErr } = await upsertProfile({ id: userId, username });
                      console.log('[Login] upsertProfile (create):', { created, upErr });
                      if (created?.username) username = created.username;
                    } else if (prof.username) {
                      username = prof.username;
                    }
                  }
                  navigation.reset({ index: 0, routes: [{ name: 'Dashboard' as any, params: { username, email: mail } }] });
                } catch (e: any) {
                  console.log('[Login] exception:', e);
                  setModalTitle(t('login.errors.genericTitle'));
                  setModalMsg(e?.message || t('login.errors.genericMessage'));
                  setModal(true);
                }
              }}
              disabled={!canLogin}
            />

            <View style={{ height: 16 }} />
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 8 }}>{t('login.quizPrompt')}</Text>
            <Button
              title={t('login.quizCta')}
              onPress={() => navigation.navigate('Registration', { email })}
            />
          </Card>
        </ScrollView>
        </KeyboardAvoidingView>

        <NotificationModal
          visible={modal}
          title={modalTitle || t('common.notice')}
          message={modalMsg || t('login.noticeFallback')}
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
  iconLeft: { position: 'absolute', left: -24, top: 14 },
  languageSwitcher: { marginBottom: 12 },
  languageLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  showBtn: { position: 'absolute', right: 12, top: 10, padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  clearBtn: { position: 'absolute', right: 12, top: 10, padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  clearBtnLeft: { position: 'absolute', right: 52, top: 10, padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  showTxt: { color: '#fff', fontWeight: '700' },
  warn: { color: '#f59e0b', marginTop: -8, marginBottom: 8 },
});
