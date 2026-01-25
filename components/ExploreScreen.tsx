import React, { useMemo, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useTranslation } from '@context/LocaleContext';
import Button from '@components/common/Button';
import { useAuth } from '@context/AuthContext';
import { placeholderAvatarUrl } from '@services/storage';
import { useRecommendations, SimilarUser } from '@context/RecommendationContext';
import ProfileDetailModal from './ProfileDetailModal';
import haptics from '@services/haptics';
import Ionicons from '@expo/vector-icons/Ionicons';

const ExploreScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { deck, loading, initialLoading, errorMessage, filters, useHobbies, setFilters, setUseHobbies, reset } = useRecommendations();
  const hasEnoughHobbies = !!profile?.hobbies_cipher;

  const [selectedUser, setSelectedUser] = useState<SimilarUser | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openProfileModal = useCallback((u: SimilarUser) => {
    haptics.light();
    setSelectedUser(u);
    setModalVisible(true);
  }, []);

  const genderOptions = ['All', 'Male', 'Female', 'Non-Binary'] as const;
  const ageOptions = ['18-24', '25-35', '36-45', '46-60', '60+'] as const;

  const genderLabel = (g: (typeof genderOptions)[number]) => {
    if (g === 'All') return t('explore.genderAll');
    if (g === 'Male') return t('registration.options.genders.male');
    if (g === 'Female') return t('registration.options.genders.female');
    return t('registration.options.genders.nonBinary');
  };

  const ageLabel = (a: string) => {
    if (a === 'All') return t('explore.ageAll');
    switch (a) {
      case '18-24':
        return t('registration.options.ageGroups.range18_24');
      case '25-35':
        return t('registration.options.ageGroups.range25_35');
      case '36-45':
        return t('registration.options.ageGroups.range35_44');
      case '46-60':
        return t('registration.options.ageGroups.range45_plus');
      default:
        return a;
    }
  };

  const applyFilter = (type: 'gender' | 'age', value: string) => {
    if (type === 'gender') {
      setFilters({ ...filters, genders: value === 'All' ? [] : [value] });
    } else {
      setFilters({ ...filters, ageGroups: value === 'All' ? [] : [value] });
    }
  };

  const applyArchetype = (val: 'most' | 'least') => {
    setFilters({ ...filters, archetype: val });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>
          {t('dashboard.title', { username: user?.user_metadata?.username ?? 'Friend' })}
        </Text>
        <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>{t('explore.listSubtitle')}</Text>

        <View style={[styles.card, { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.12) }]}>
          <Text style={[styles.cardTitle, { color: toRgb(theme.colors['--text-primary']) }]}>{t('explore.filters')}</Text>
          
          <View style={styles.filterRow}>
             <View style={{ flex: 1 }}>
                <Text style={{ color: hasEnoughHobbies ? toRgb(theme.colors['--text-secondary']) : toRgb(theme.colors['--text-muted']) }}>
                  {t('explore.useHobbies')}
                </Text>
                 <Text style={{ color: toRgb(theme.colors['--text-muted']), fontSize: 11 }}>
                  {t('explore.useHobbiesHint')}
                </Text>
             </View>
             <Switch value={useHobbies} onValueChange={setUseHobbies} disabled={!hasEnoughHobbies} />
          </View>

          <Text style={[styles.cardTitle, { color: toRgb(theme.colors['--text-primary']), marginTop: 12 }]}>
            {t('explore.filterGender')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {genderOptions.map((g) => {
              const isActive = filters.genders?.length === 0 ? g === 'All' : filters.genders?.includes(g);
              return (
              <Pressable
                key={g}
                onPress={() => applyFilter('gender', g)}
                style={[
                  styles.chip,
                  {
                    borderColor: isActive ? toRgb(theme.colors['--brand-primary']) : toRgba(theme.colors['--border'], 0.3),
                    backgroundColor: isActive ? toRgba(theme.colors['--brand-primary'], 0.12) : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    color: isActive ? toRgb(theme.colors['--brand-primary']) : toRgb(theme.colors['--text-secondary']),
                    fontWeight: '600',
                  }}
                >
                  {genderLabel(g)}
                </Text>
              </Pressable>
              );
            })}
          </View>

          <Text style={[styles.cardTitle, { color: toRgb(theme.colors['--text-primary']), marginTop: 12 }]}>
            {t('explore.filterAge')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['All', ...ageOptions].map((a) => {
              const isActive = filters.ageGroups?.length === 0 ? a === 'All' : filters.ageGroups?.includes(a);
              return (
              <Pressable
                key={a}
                onPress={() => applyFilter('age', a)}
                style={[
                  styles.chip,
                  {
                    borderColor: isActive ? toRgb(theme.colors['--brand-primary']) : toRgba(theme.colors['--border'], 0.3),
                    backgroundColor: isActive ? toRgba(theme.colors['--brand-primary'], 0.12) : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    color: isActive ? toRgb(theme.colors['--brand-primary']) : toRgb(theme.colors['--text-secondary']),
                    fontWeight: '600',
                  }}
                >
                  {ageLabel(a)}
                </Text>
              </Pressable>
              );
            })}
          </View>

          <Text style={[styles.cardTitle, { color: toRgb(theme.colors['--text-primary']), marginTop: 12 }]}>
            {t('explore.filterArchetype')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {(['most', 'least'] as const).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => applyArchetype(opt)}
                style={[
                  styles.chip,
                  {
                    borderColor: filters.archetype === opt ? toRgb(theme.colors['--brand-primary']) : toRgba(theme.colors['--border'], 0.3),
                    backgroundColor: filters.archetype === opt ? toRgba(theme.colors['--brand-primary'], 0.12) : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    color: filters.archetype === opt ? toRgb(theme.colors['--brand-primary']) : toRgb(theme.colors['--text-secondary']),
                    fontWeight: '600',
                  }}
                >
                  {opt === 'most' ? t('explore.archetypeMost') : t('explore.archetypeLeast')}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 8 }}>{t('explore.filterNote')}</Text>
          <View style={{ height: 8 }} />
          <Button title={loading ? t('common.loading') : t('explore.applyFilters')} onPress={reset} disabled={loading || !user?.id} />
        </View>

        <View style={{ height: 16 }} />

        {initialLoading && (
          <View style={{ alignItems: 'center', padding: 16 }}>
            <ActivityIndicator color={toRgb(theme.colors['--brand-primary'])} />
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 8 }}>{t('explore.loadingList')}</Text>
          </View>
        )}

        {!initialLoading && errorMessage ? (
          <View style={[styles.errorCard, { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.12) }]}>
            <Text style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '600', marginBottom: 6 }}>
              {t('alerts.genericError')}
            </Text>
            <Button title={t('explore.retry')} onPress={reset} />
          </View>
        ) : null}

        {!initialLoading && deck.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Text style={[styles.cardTitle, { color: toRgb(theme.colors['--text-primary']) }]}>
              {t('explore.topMatches', { count: deck.length })}
            </Text>
            {deck.map((u) => (
              <View
                key={u.id}
                style={[
                  styles.userCard,
                  { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.12) },
                ]}
              >
                <Image source={{ uri: u.avatar_url || placeholderAvatarUrl }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700' }}>
                    {u.username ?? 'Unknown'}
                  </Text>
                  <Text style={{ color: toRgb(theme.colors['--text-secondary']), fontSize: 12 }}>
                    {u.age_group ?? '—'} · {u.gender ?? '—'} · {u.character_group ?? '—'}
                  </Text>
                  <Text style={{ color: toRgb(theme.colors['--brand-primary']), marginTop: 4 }}>
                    {t('explore.matchLabel', { percent: (u.similarity * 100).toFixed(1) })}
                  </Text>
                </View>
                <Pressable
                  style={[styles.actionBtn, { borderColor: toRgba(theme.colors['--border'], 0.2) }]}
                  onPress={() => openProfileModal(u)}
                >
                  <Ionicons name="eye-outline" size={20} color={toRgb(theme.colors['--text-primary'])} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {!initialLoading && deck.length === 0 && !errorMessage ? (
          <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>{t('explore.noListMatches')}</Text>
        ) : null}
      </ScrollView>

      <ProfileDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        profile={selectedUser ? { ...selectedUser, match_percentage: selectedUser.similarity * 100 } : null}
        currentUserHobbies={profile?.hobbies ?? []}
      />
    </SafeAreaView>
  );
};

export default ExploreScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 12 },
  card: { borderRadius: 12, padding: 12, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  errorCard: { borderRadius: 12, padding: 12, borderWidth: 1 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
});
