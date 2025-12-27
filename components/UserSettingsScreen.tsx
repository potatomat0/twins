import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, Pressable, Switch } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useTranslation } from '@context/LocaleContext';
import { useAuth } from '@context/AuthContext';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import { decryptScoresRemote, encryptGenericRemote, decryptGenericRemote } from '@services/scoreCrypto';
import RadarChart from '@components/charts/RadarChart';
import { FACTOR_LABEL_KEYS } from '@data/factors';
import { Profile, upsertProfile, supabase as supabaseClient, fetchMyProfile } from '@services/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { placeholderAvatarUrl, uploadAvatar, getOptimizedImageUrl } from '@services/storage';
import ProfileDetailModal, { ProfileDetail } from '@components/ProfileDetailModal';

const AGE_VALUES = ['<18', '18-24', '25-35', '35-44', '45+'] as const;
const AGE_KEYS = ['under18', 'range18_24', 'range25_35', 'range35_44', 'range45_plus'] as const;
const GENDER_VALUES = ['Male', 'Female', 'Non-Binary', 'Prefer Not To Say'] as const;
const GENDER_KEYS = ['male', 'female', 'nonBinary', 'preferNot'] as const;

const UserSettingsScreen: React.FC = () => {
  const { theme, name: themeName, setTheme } = useTheme();
  const { t, setLocale, availableLocales, locale } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [sections, setSections] = useState<Record<string, boolean>>({
    profile: false,
    hobbies: false,
    graph: false,
    language: false,
    theme: false,
  });

  const [username, setUsername] = useState(profile?.username ?? user?.user_metadata?.username ?? '');
  const [ageGroup, setAgeGroup] = useState(profile?.age_group ?? '');
  const [gender, setGender] = useState(profile?.gender ?? '');
  const [hobbies, setHobbies] = useState<string[]>(profile?.hobbies ?? []);
  const [hobbyInput, setHobbyInput] = useState('');
  const [hobbyError, setHobbyError] = useState<string | null>(null);
  const [decryptingHobbies, setDecryptingHobbies] = useState(false);

  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [matchAllowElo, setMatchAllowElo] = useState<boolean>(profile?.match_allow_elo ?? true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(!!user?.email_confirmed_at);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPublicProfile, setShowPublicProfile] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await fetchMyProfile();
      if (data?.email_confirmed_at) {
        setIsVerified(true);
      }
    })();
  }, []);

  // Decrypt hobbies if needed
  useEffect(() => {
    if (profile?.hobbies?.length) {
      setHobbies(profile.hobbies);
      return;
    }
    if (profile?.hobbies_cipher && profile?.hobbies_iv) {
      setDecryptingHobbies(true);
      decryptGenericRemote<string[]>(profile.hobbies_cipher, profile.hobbies_iv)
        .then((decrypted) => {
          if (decrypted && Array.isArray(decrypted)) {
            setHobbies(decrypted);
          }
        })
        .finally(() => setDecryptingHobbies(false));
    }
  }, [profile?.hobbies, profile?.hobbies_cipher, profile?.hobbies_iv]);

  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [scoreState, setScoreState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const loadScores = useCallback(async () => {
    const b5Cipher = profile?.b5_cipher;
    const b5Iv = profile?.b5_iv;
    let cipher = b5Cipher;
    let iv = b5Iv;

    if ((!cipher || !iv) && user?.id) {
      const { data } = await supabaseClient
        .from('profiles')
        .select('b5_cipher, b5_iv')
        .eq('id', user.id)
        .maybeSingle();
      cipher = data?.b5_cipher ?? null;
      iv = data?.b5_iv ?? null;
    }

    if (!cipher || !iv) {
      setScores(null);
      setScoreState('idle');
      return;
    }

    setScoreState('loading');
    try {
      const data = await decryptScoresRemote(cipher as string, iv as string);
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
  }, [profile?.b5_cipher, profile?.b5_iv, user?.id]);

  useEffect(() => {
    if (scoreState === 'idle') {
      void loadScores();
    }
  }, [loadScores, scoreState]);

  useFocusEffect(
    useCallback(() => {
      if (scoreState === 'ready' && scores) return;
      if (scoreState === 'loading') return;
      void loadScores();
    }, [loadScores, scoreState, scores]),
  );

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

  const publicProfileCard = useMemo<ProfileDetail>(() => {
    return {
      id: user?.id ?? '',
      username: username || profile?.username || user?.email || 'You',
      age_group: ageGroup || profile?.age_group || null,
      gender: gender || profile?.gender || null,
      character_group: profile?.character_group ?? null,
      avatar_url: avatarUrl || profile?.avatar_url || placeholderAvatarUrl,
      hobbies: hobbies,
      hobby_embedding: (profile as any)?.hobby_embedding ?? null,
      pca_dim1: profile?.pca_dim1 ?? null,
      pca_dim2: profile?.pca_dim2 ?? null,
      pca_dim3: profile?.pca_dim3 ?? null,
      pca_dim4: profile?.pca_dim4 ?? null,
    };
  }, [ageGroup, avatarUrl, gender, hobbies, profile, user?.email, user?.id, username]);

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url ?? null);
    setMatchAllowElo(profile?.match_allow_elo ?? true);
  }, [profile?.avatar_url]);

  // Preset colors for hobbies
  const hobbyColors = useMemo(() => [
    theme.colors['--brand-primary'],
    theme.colors['--accent-cyan'],
    theme.colors['--accent-pink'],
    theme.colors['--accent-orange'],
  ], [theme]);

  const addHobby = useCallback(() => {
    const val = hobbyInput.trim();
    if (!val) return;
    if (val.length < 2 || val.length > 30) {
      setHobbyError(t('settings.hobbyLengthError'));
      return;
    }
    if (hobbies.length >= 10) {
      setHobbyError(t('settings.hobbyCountError'));
      return;
    }
    if (hobbies.includes(val)) {
      setHobbyInput('');
      return;
    }
    setHobbies(prev => [...prev, val]);
    setHobbyInput('');
    setHobbyError(null);
  }, [hobbyInput, hobbies, t]);

  const removeHobby = useCallback((index: number) => {
    setHobbies(prev => prev.filter((_, i) => i !== index));
  }, []);

  const buildProfilePayload = useCallback(
    (extra?: Partial<Profile>): Profile => {
      const base: Profile = {
        id: user?.id as string,
        username: username.trim() || null,
        age_group: ageGroup || null,
        gender: gender || null,
        hobbies: hobbies,
        character_group: profile?.character_group,
        pca_dim1: profile?.pca_dim1,
        pca_dim2: profile?.pca_dim2,
        pca_dim3: profile?.pca_dim3,
        pca_dim4: profile?.pca_dim4,
        b5_cipher: profile?.b5_cipher,
        b5_iv: profile?.b5_iv,
        avatar_url: avatarUrl ?? profile?.avatar_url,
        match_allow_elo: matchAllowElo,
        ...extra,
      };
      // Filter out undefined to prevent overwriting with null/default if data is missing from context
      // This creates a "partial" object effectively, but cast as Profile
      return Object.fromEntries(
        Object.entries(base).filter(([_, v]) => v !== undefined)
      ) as Profile;
    },
    [ageGroup, avatarUrl, gender, hobbies, matchAllowElo, profile, user?.id, username],
  );

  const saveProfile = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      let embedding: number[] | null = null;
      let hobbiesCipher: string | null = null;
      let hobbiesIv: string | null = null;

      // Only generate embedding and encrypt if hobbies are present
      if (hobbies.length > 0) {
        // 1. Embed
        // Minimal context to keep a single vector (avoid per-hobby matrix comparisons)
        const text = `interests: ${hobbies.join('; ')}`;
        const { data: embedData, error: embedError } = await supabaseClient.functions.invoke('embed', { body: { text } });
        if (!embedError && embedData?.embedding) {
          embedding = embedData.embedding;
        } else if (__DEV__) {
          console.warn('[settings] embed error', embedError);
        }

        // 2. Encrypt
        const cryptoResult = await encryptGenericRemote(hobbies);
        if (cryptoResult) {
          hobbiesCipher = cryptoResult.cipher;
          hobbiesIv = cryptoResult.iv;
        } else {
          // If encryption failed but we have hobbies, DO NOT save (or we lose data)
          console.error('[settings] hobby encryption failed');
          setUploadError('Failed to save hobbies. Please try again.');
          setSaving(false);
          return;
        }
      }
      
      // We purposefully don't send 'hobbies' plaintext to DB if we have cipher
      // Actually, we should clear it if we are encrypting.
      const payload = buildProfilePayload({ 
        match_allow_elo: matchAllowElo,
        hobby_embedding: embedding ? (JSON.stringify(embedding) as any) : null,
        hobbies_cipher: hobbiesCipher,
        hobbies_iv: hobbiesIv
      });
      
      // Remove 'hobbies' from payload as the column is dropped from DB
      delete (payload as any).hobbies;
      
      const { error } = await upsertProfile(payload);
      if (error) throw error;
      setSaveSuccess(true);
      await refreshProfile();
    } catch (err) {
      if (__DEV__) console.error('[settings] save failed', err);
      setUploadError('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }, [buildProfilePayload, matchAllowElo, user?.id, hobbies]);

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
      setUploadProgress(0);
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
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 1,
              allowsEditing: true,
              aspect: [1, 1],
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 1,
              allowsEditing: true,
              aspect: [1, 1],
            });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setUploadingAvatar(true);
      let timer: NodeJS.Timeout | null = null;
      setUploadProgress(5);
      timer = setInterval(() => {
        setUploadProgress((p) => (p < 90 ? p + 5 : p));
      }, 150);
      try {
        const { publicUrl } = await uploadAvatar(user.id, asset.uri, (asset as any).mimeType || asset.type);
        setAvatarUrl(publicUrl);
        await upsertProfile(buildProfilePayload({ avatar_url: publicUrl }));
        setUploadProgress(100);
      } catch (err: any) {
        setUploadError(err?.message ?? 'Upload failed');
      } finally {
        if (timer) clearInterval(timer);
        setUploadingAvatar(false);
        setTimeout(() => setUploadProgress(0), 400);
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
          <Pressable
            style={{ alignItems: 'center', marginBottom: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: toRgba(theme.colors['--border'], 0.2) }}
            onPress={() => setShowPublicProfile(true)}
          >
            <Text style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700' }}>{t('settings.viewPublicProfile') ?? 'View public profile'}</Text>
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 4 }}>
              {t('settings.viewPublicProfileHint') ?? 'See how others see your card'}
            </Text>
          </Pressable>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Image
              source={{ uri: getOptimizedImageUrl(avatarUrl || placeholderAvatarUrl, 320) }}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
            />
            {uploadingAvatar || uploadProgress > 0 ? (
              <View style={[styles.progressBar, { backgroundColor: toRgba(theme.colors['--border'], 0.3) }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${uploadProgress}%`, backgroundColor: toRgb(theme.colors['--brand-primary']) },
                  ]}
                />
              </View>
            ) : null}
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
          <View style={[styles.readonly, { 
            borderColor: toRgba(theme.colors['--border'], 0.12),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }]}>
            <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>
              {user?.email ?? '—'}
            </Text>
            {isVerified && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="checkmark-circle" size={16} color={toRgb(theme.colors['--accent-cyan'])} />
                <Text style={{ color: toRgb(theme.colors['--accent-cyan']), fontSize: 12, fontWeight: '600' }}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6, marginTop: 6 }}>{t('settings.ageGroup')}</Text>
          <Dropdown options={ageOptions} value={ageGroup} onChange={(v) => setAgeGroup(v as string)} placeholder={t('settings.ageGroup')} />
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6, marginTop: 6 }}>{t('settings.gender')}</Text>
          <Dropdown options={genderOptions} value={gender} onChange={(v) => setGender(v as string)} placeholder={t('settings.gender')} />
          <View style={{ height: 12 }} />
          <Button title={saving ? t('common.loading') : t('settings.saveProfile')} onPress={saveProfile} disabled={saving || !user?.id} />
          {saveSuccess ? (
            <Text style={{ color: toRgb(theme.colors['--accent-cyan']), marginTop: 6 }}>{t('settings.saveSuccess') ?? 'Saved successfully'}</Text>
          ) : null}
        </Accordion>

        <Accordion
          title={t('settings.accordion.hobbies')}
          open={sections.hobbies}
          onToggle={() => setSections((s) => ({ ...s, hobbies: !s.hobbies }))}
          icon="pricetags-outline"
        >
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 8 }}>
            {t('settings.hobbyPlaceholder')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, borderColor: toRgba(theme.colors['--border'], 0.12), color: toRgb(theme.colors['--text-primary']) }]}
              value={hobbyInput}
              onChangeText={setHobbyInput}
              placeholder={t('settings.hobbyPlaceholder')}
              placeholderTextColor={toRgb(theme.colors['--text-muted'])}
              onSubmitEditing={addHobby}
              returnKeyType="done"
            />
            <Button title={t('settings.hobbyAdd')} onPress={addHobby} variant="neutral" />
          </View>
          {hobbyError ? <Text style={{ color: toRgb(theme.colors['--danger']), marginBottom: 8 }}>{hobbyError}</Text> : null}
          {decryptingHobbies ? (
             <ActivityIndicator size="small" color={toRgb(theme.colors['--brand-primary'])} style={{ marginBottom: 12 }} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {hobbies.map((hobby, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: toRgb(hobbyColors[idx % hobbyColors.length]),
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>{hobby}</Text>
                  <Pressable onPress={() => removeHobby(idx)}>
                    <Ionicons name="close-circle" size={16} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: 12 }} />
          <Button title={saving ? t('common.loading') : t('settings.saveProfile')} onPress={saveProfile} disabled={saving || !user?.id} />
          {saveSuccess ? (
            <Text style={{ color: toRgb(theme.colors['--accent-cyan']), marginTop: 6 }}>{t('settings.saveSuccess') ?? 'Saved successfully'}</Text>
          ) : null}
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
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ color: toRgb(theme.colors['--danger']), marginTop: 8 }}>{t('settings.decryptError')}</Text>
              <Button title={t('common.retry')} variant="neutral" onPress={loadScores} />
            </View>
          )}
          {scoreState !== 'ready' && (
            <View style={{ marginTop: 12 }}>
              <Button title={t('common.retry')} variant="neutral" onPress={loadScores} />
            </View>
          )}
          <View style={{ height: 12 }} />
          <Button title={t('settings.retryQuiz')} variant="neutral" onPress={() => navigation.navigate('QuizIntro' as any)} />
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
      <ProfileDetailModal visible={showPublicProfile} onClose={() => setShowPublicProfile(false)} profile={publicProfileCard} />
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
  progressBar: { height: 6, width: '100%', borderRadius: 6, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 6 },
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
