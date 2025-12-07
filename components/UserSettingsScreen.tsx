import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useTranslation } from '@context/LocaleContext';
import { useAuth } from '@context/AuthContext';
import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import { decryptScoresRemote } from '@services/scoreCrypto';
import RadarChart from '@components/charts/RadarChart';
import { FACTOR_LABEL_KEYS } from '@data/factors';
import { upsertProfile } from '@services/supabase';
import { useNavigation } from '@react-navigation/native';

const AGE_VALUES = ['<18', '18-24', '25-35', '35-44', '45+'] as const;
const AGE_KEYS = ['under18', 'range18_24', 'range25_35', 'range35_44', 'range45_plus'] as const;
const GENDER_VALUES = ['Male', 'Female', 'Non-Binary', 'Prefer Not To Say'] as const;
const GENDER_KEYS = ['male', 'female', 'nonBinary', 'preferNot'] as const;

const UserSettingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, profile } = useAuth();

  const [username, setUsername] = useState(profile?.username ?? user?.user_metadata?.username ?? '');
  const [ageGroup, setAgeGroup] = useState(profile?.age_group ?? '');
  const [gender, setGender] = useState(profile?.gender ?? '');
  const [saving, setSaving] = useState(false);

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

  const saveProfile = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await upsertProfile({
        id: user.id,
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
      });
    } finally {
      setSaving(false);
    }
  }, [ageGroup, gender, profile, user?.id, username]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{t('dashboard.title', { username })}</Text>
        <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>Manage your profile and results.</Text>

        <View style={[styles.card, { borderColor: toRgba(theme.colors['--border'], 0.12), backgroundColor: toRgb(theme.colors['--surface']) }]}>
          <Text style={[styles.cardTitle, { color: toRgb(theme.colors['--text-primary']) }]}>Profile</Text>
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6 }}>Display name</Text>
          <TextInput
            style={[styles.input, { borderColor: toRgba(theme.colors['--border'], 0.12), color: toRgb(theme.colors['--text-primary']) }]}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter display name"
            placeholderTextColor={toRgb(theme.colors['--text-muted'])}
          />
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6 }}>Email (read-only)</Text>
          <Text style={[styles.readonly, { color: toRgb(theme.colors['--text-secondary']), borderColor: toRgba(theme.colors['--border'], 0.12) }]}>
            {user?.email ?? '—'}
          </Text>
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6, marginTop: 6 }}>Age group</Text>
          <Dropdown options={ageOptions} value={ageGroup} onChange={(v) => setAgeGroup(v as string)} placeholder="Select age group" />
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginBottom: 6, marginTop: 6 }}>Gender</Text>
          <Dropdown options={genderOptions} value={gender} onChange={(v) => setGender(v as string)} placeholder="Select gender" />
          <View style={{ height: 12 }} />
          <Button title={saving ? 'Saving...' : 'Save profile'} onPress={saveProfile} disabled={saving || !user?.id} />
        </View>

        <View style={{ height: 16 }} />

        <View style={[styles.card, { borderColor: toRgba(theme.colors['--border'], 0.12), backgroundColor: toRgb(theme.colors['--surface']) }]}>
          <Text style={[styles.cardTitle, { color: toRgb(theme.colors['--text-primary']) }]}>My graph</Text>
          {scoreState === 'loading' && (
            <View style={{ alignItems: 'center', padding: 12 }}>
              <ActivityIndicator color={toRgb(theme.colors['--brand-primary'])} />
              <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 8 }}>Decrypting scores...</Text>
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
            <Text style={{ color: toRgb(theme.colors['--danger']), marginTop: 8 }}>Could not load your scores.</Text>
          )}
        </View>

        <View style={{ height: 16 }} />
        <Button title="Re-try personality quiz" variant="neutral" onPress={() => navigation.navigate('QuizIntro' as any)} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default UserSettingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 12 },
  card: { borderRadius: 12, padding: 12, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  readonly: { borderWidth: 1, borderRadius: 10, padding: 12 },
});
