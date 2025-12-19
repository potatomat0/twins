import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, Pressable, Image } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useTranslation } from '@context/LocaleContext';
import { useAuth } from '@context/AuthContext';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import { decryptScoresRemote } from '@services/scoreCrypto';
import RadarChart from '@components/charts/RadarChart';
import { FACTOR_LABEL_KEYS } from '@data/factors';
import { Profile, upsertProfile } from '@services/supabase';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { placeholderAvatarUrl, uploadAvatar } from '@services/storage';

const AGE_VALUES = ['<18', '18-24', '25-35', '35-44', '45+'] as const;
const AGE_KEYS = ['under18', 'range18_24', 'range25_35', 'range35_44', 'range45_plus'] as const;
const GENDER_VALUES = ['Male', 'Female', 'Non-Binary', 'Prefer Not To Say'] as const;
const GENDER_KEYS = ['male', 'female', 'nonBinary', 'preferNot'] as const;

const UserSettingsScreen: React.FC = () => {
  const { theme, name: themeName, setTheme } = useTheme();
  const { t, setLocale, availableLocales, locale } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, profile, signOut } = useAuth();
  const [sections, setSections] = useState<Record<string, boolean>>({
    profile: false,
    graph: false,
    language: false,
    theme: false,
  });

  const [username, setUsername] = useState(profile?.username ?? user?.user_metadata?.username ?? '');
  const [ageGroup, setAgeGroup] = useState(profile?.age_group ?? '');
  const [gender, setGender] = useState(profile?.gender ?? '');
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [scoreState, setScoreState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (!profile?.b5_cipher || !profile?.b5_iv) {
      setScores(null);
      setScoreState('idle');
      return;
    }
    setScoreState('loading');
    (async () => {
      try {
        const data = await decryptScoresRemote(profile.b5_cipher as string, profile.b5_iv as string);
        if (data) {
          setScores(data);
          setScoreState('ready');
        } else {
          setScores(null);
          setScoreState('error');
        }
      } catch {
        setScores(null);
        setScoreState('error');
      }
    })();
  }, [profile?.b5_cipher, profile?.b5_iv]);

  const chartData = useMemo(() => {
    if (!scores) return null;
    return [
      { label: 'Extraversion', score: (scores['Extraversion'] ?? 0) * 100 },
      { label: 'Agreeableness', score: (scores['Agreeableness'] ?? 0) * 100 },
      { label: 'Conscientiousness', score: (scores['Conscientiousness'] ?? 0) * 100 },
      { label: 'Emotional Stability', score: (scores['Emotional Stability'] ?? 0) * 100 },
      { label: 'Intellect/Imagination', score: (scores['Intellect/Imagination'] ?? 0) * 100 },
    ];
  }, [scores]);

  const topTraits = useMemo(() => {
    if (!scores) return [];
    return Object.entries(scores)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, 3);
  }, [scores]);

  const ageOptions = useMemo(
    () => AGE_KEYS.map((key, idx) => ({ label: t(`registration.options.ageGroups.${key}`), value: AGE_VALUES[idx] })),
    [t],
  );
  const genderOptions = useMemo(
    () => GENDER_KEYS.map((key, idx) => ({ label: t(`registration.options.genders.${key}`), value: GENDER_VALUES[idx] })),
    [t],
  );

  const languageOptions = useMemo(
    () =>
      availableLocales.map((loc) => ({
        label: t(`login.languages.${loc}`),
        value: loc,
      })),
    [availableLocales, t],
  );

  const themeOptions = useMemo(
    () => [
      { label: t('settings.themeOptions.system'), value: 'system' },
      { label: t('settings.themeOptions.light'), value: 'light' },
      { label: t('settings.themeOptions.dark'), value: 'dark' },
    ],
    [t],
  );

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile?.avatar_url]);

  const buildProfilePayload = useCallback(
    (extra?: Partial<Profile>): Profile => ({
      id: user?.id as string,
      username: username.trim() || null,
      age_group: ageGroup || null,
      gender: gender || null,
      character_group: profile?.character_group ?? null,
      pca_dim1: profile?.pca_dim1 ?? null,
      pca_dim2: profile?.pca_dim2 ?? null,
      pca_dim3: profile?.pca_dim3 ?? null,
      pca_dim4: profile?.pca_dim4 ?? null,
      b5_cipher: profile?.b5_cipher ?? null,
      b5_iv: profile?.b5_iv ?? null,
      avatar_url: avatarUrl ?? profile?.avatar_url ?? null,
      ...extra,
    }),
    [ageGroup, avatarUrl, gender, profile, user?.id, username],
  );

  const saveProfile = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await upsertProfile(buildProfilePayload());
    } finally {
      setSaving(false);
    }
  }, [buildProfilePayload, user?.id]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' as any }],
    });
  }, [navigation, signOut]);

  const pickAvatar = useCallback(
    async (mode: 'camera' | 'library') => {
      if (!user?.id) return;
      setUploadError(null);
      const permission =
        mode === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setUploadError(t('settings.permissionDenied'));
        return;
      }

      const result =
        mode === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setUploadingAvatar(true);
      try {
        const { publicUrl } = await uploadAvatar(user.id, asset.uri, (asset as any).mimeType || asset.type);
        setAvatarUrl(publicUrl);
        await upsertProfile(buildProfilePayload({ avatar_url: publicUrl }));
      } catch (err: any) {
        setUploadError(err?.message ?? 'Upload failed');
      } finally {
        setUploadingAvatar(false);
      }
    },
    [buildProfilePayload, t, user?.id],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{t('dashboard.title', { username })}</Text>
        <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>{t('settings.heading')}</Text>

        <Accordion
          title={t('settings.accordion.profile')}
          open={sections.profile}
          onToggle={() => setSections((s) => ({ ...s, profile: !s.profile }))}
          icon="person-circle-outline"
        >
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Image source={{ uri: avatarUrl || placeholderAvatarUrl }} style={styles.avatar} />
            {uploadError ? (
              <Text style={{ color: toRgb(theme.colors['--danger']), marginTop: 6 }}>{uploadError}</Text>
            ) : null}
            <View style={styles.avatarActions}>
              <Button
                title={uploadingAvatar ? t('settings.uploadingPhoto') : t('settings.uploadPhoto')}
                onPress={() => pickAvatar('library')}
                disabled={uploadingAvatar}
                variant="neutral"
              />
              <Button
                title={t('settings.takePhoto')}
                onPress={() => pickAvatar('camera')}
                disabled={uploadingAvatar}
                variant="neutral"
              />
            </View>
          </View>
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6 }}>{t('settings.displayName')}</Text>
          <TextInput
            style={[styles.input, { borderColor: toRgba(theme.colors['--border'], 0.12), color: toRgb(theme.colors['--text-primary']) }]}
            value={username}
            onChangeText={setUsername}
            placeholder={t('settings.displayName')}
            placeholderTextColor={toRgb(theme.colors['--text-muted'])}
          />
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6 }}>{t('settings.emailReadonly')}</Text>
          <Text style={[styles.readonly, { color: toRgb(theme.colors['--text-secondary']), borderColor: toRgba(theme.colors['--border'], 0.12) }]}>
            {user?.email ?? '—'}
          </Text>
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6, marginTop: 6 }}>{t('settings.ageGroup')}</Text>
          <Dropdown options={ageOptions} value={ageGroup} onChange={(v) => setAgeGroup(v as string)} placeholder={t('settings.ageGroup')} />
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6, marginTop: 6 }}>{t('settings.gender')}</Text>
          <Dropdown options={genderOptions} value={gender} onChange={(v) => setGender(v as string)} placeholder={t('settings.gender')} />
          <View style={{ height: 12 }} />
          <Button title={saving ? t('common.loading') : t('settings.saveProfile')} onPress={saveProfile} disabled={saving || !user?.id} />
        </Accordion>

        <Accordion
          title={t('settings.accordion.graph')}
          open={sections.graph}
          onToggle={() => setSections((s) => ({ ...s, graph: !s.graph }))}
          icon="stats-chart-outline"
        >
          {scoreState === 'loading' && (
            <View style={{ alignItems: 'center', padding: 12 }}>
              <ActivityIndicator color={toRgb(theme.colors['--brand-primary'])} />
              <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 8 }}>{t('settings.decrypting')}</Text>
            </View>
          )}
          {scoreState === 'ready' && chartData ? (
            <View style={{ alignItems: 'center' }}>
              <RadarChart
                data={chartData}
                color={theme.colors['--brand-primary']}
                iconColor={theme.colors['--accent-cyan']}
                closeColor={theme.colors['--danger']}
                tooltipMaxHeight={220}
              />
              <View style={{ marginTop: 8 }}>
                {topTraits.map(([key, value]) => {
                  const labelKey = FACTOR_LABEL_KEYS[key as keyof typeof FACTOR_LABEL_KEYS];
                  const factorLabel = labelKey ? t(labelKey) : key;
                  const percent = Math.round((value ?? 0) * 100);
                  return (
                    <Text key={key} style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 4 }}>
                      {t('results.screen.strengthEntry', { factor: factorLabel, value: `${percent}%` })}
                    </Text>
                  );
                })}
              </View>
            </View>
          ) : null}
          {scoreState === 'error' && (
            <Text style={{ color: toRgb(theme.colors['--danger']), marginTop: 8 }}>{t('settings.decryptError')}</Text>
          )}
          <View style={{ height: 12 }} />
          <Button title={t('settings.retryQuiz')} variant="neutral" onPress={() => navigation.navigate('QuizIntro' as any)} />
          <View style={{ height: 8 }} />
          <Button title={t('dashboard.logout')} variant="danger" onPress={signOut} />
        </Accordion>

        <Accordion
          title={t('settings.accordion.language')}
          open={sections.language}
          onToggle={() => setSections((s) => ({ ...s, language: !s.language }))}
          icon="language-outline"
        >
          <Dropdown
            options={languageOptions}
            value={locale}
            onChange={(val) => setLocale(val as any)}
            placeholder="Select language"
          />
        </Accordion>

        <Accordion
          title={t('settings.accordion.theme')}
          open={sections.theme}
          onToggle={() => setSections((s) => ({ ...s, theme: !s.theme }))}
          icon="color-palette-outline"
        >
          <Dropdown
            options={themeOptions}
            value={themeName}
            onChange={(val) => setTheme(val as any)}
            placeholder={t('settings.theme')}
          />
        </Accordion>
      </ScrollView>
      <View style={{ padding: 16 }}>
        <Button title={t('dashboard.logout')} variant="danger" onPress={handleLogout} />
      </View>
    </SafeAreaView>
  );
};

export default UserSettingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  readonly: { borderWidth: 1, borderRadius: 10, padding: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#d1d5db' },
  avatarActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});

const Accordion: React.FC<{
  title: string;
  icon?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, icon = 'chevron-down', open, onToggle, children }) => {
  const { theme } = useTheme();
  return (
    <View
      style={{
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: toRgba(theme.colors['--border'], 0.12),
        backgroundColor: toRgb(theme.colors['--surface']),
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={onToggle}
        style={{
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Ionicons name={(icon as any) ?? 'chevron-down'} size={18} color={toRgb(theme.colors['--text-primary'])} />
        <Text style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700', flex: 1 }}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={toRgb(theme.colors['--text-secondary'])} />
      </Pressable>
      {open && <View style={{ padding: 12, gap: 8 }}>{children}</View>}
    </View>
  );
};
