import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useTranslation } from '@context/LocaleContext';
import Button from '@components/common/Button';
import { useAuth } from '@context/AuthContext';
import supabase from '@services/supabase';
import { placeholderAvatarUrl } from '@services/storage';
import { getCache, setCache } from '@services/cache';

type SimilarUser = {
  id: string;
  username: string | null;
  age_group: string | null;
  gender: string | null;
  character_group: string | null;
  avatar_url?: string | null;
  similarity: number;
};

type Pool = {
  size: number;
  users: SimilarUser[];
  available: boolean;
};

const ExploreScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [filters, setFilters] = useState({ ageGroup: false, gender: false, characterGroup: false });
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const useElo = profile?.match_allow_elo ?? true;

  const toggle = useCallback(
    (key: 'ageGroup' | 'gender' | 'characterGroup') => {
      setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [],
  );

  const fetchRecommendations = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('recommend-users', {
        body: {
          userId: user.id,
          filters,
          chunkSize: 400,
          poolSizes: [25, 50, 100],
          useElo,
        },
      });
      if (fnErr) {
        setError(fnErr.message ?? 'Failed to fetch recommendations');
        return;
      }
      const payload = data as { pools?: Pool[]; error?: string };
      if (payload?.error) {
        setError(payload.error);
        return;
      }
      const filtered = (payload?.pools ?? []).map((p) => ({
        ...p,
        users: (p.users ?? []).filter((u) => u.id !== user.id),
      }));
      setPools(filtered);
      await setCache(`pool:list:${user.id}:${useElo}:${JSON.stringify(filters)}`, filtered);
    } catch (e: any) {
      setError(e?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [filters, useElo, user?.id]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) return;
      const cached = await getCache<Pool[]>(`pool:list:${user.id}:${useElo}:${JSON.stringify(filters)}`, CACHE_TTL_MS);
      if (cached && active) setPools(cached);
    })();
    return () => {
      active = false;
    };
  }, [filters, useElo, user?.id]);

  const topPool = useMemo(() => pools.find((p) => p.users?.length), [pools]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>
          {t('dashboard.title', { username: user?.user_metadata?.username ?? 'Friend' })}
        </Text>
        <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>{t('explore.listSubtitle')}</Text>

        <View style={[styles.card, { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.12) }]}>
          <Text style={[styles.cardTitle, { color: toRgb(theme.colors['--text-primary']) }]}>{t('explore.filters')}</Text>
          {(['ageGroup', 'gender', 'characterGroup'] as const).map((key) => (
            <View key={key} style={styles.filterRow}>
              <Text style={{ color: toRgb(theme.colors['--text-secondary']), flex: 1 }}>
                {key === 'ageGroup'
                  ? t('explore.filterAge')
                  : key === 'gender'
                  ? t('explore.filterGender')
                  : t('explore.filterArchetype')}
              </Text>
              <Switch value={filters[key]} onValueChange={() => toggle(key)} />
            </View>
          ))}
          <Button title={loading ? t('common.loading') : t('explore.fetchMatches')} onPress={fetchRecommendations} disabled={loading || !user?.id} />
          {error ? <Text style={{ color: toRgb(theme.colors['--danger']), marginTop: 8 }}>{error}</Text> : null}
        </View>

        <View style={{ height: 16 }} />

        {loading && (
          <View style={{ alignItems: 'center', padding: 16 }}>
            <ActivityIndicator color={toRgb(theme.colors['--brand-primary'])} />
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 8 }}>{t('explore.loadingList')}</Text>
          </View>
        )}

        {!loading && topPool && topPool.users.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Text style={[styles.cardTitle, { color: toRgb(theme.colors['--text-primary']) }]}>
              {t('explore.topMatches', { count: topPool.users.length })}
            </Text>
            {topPool.users.map((u) => (
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
                  onPress={() => {}}
                >
                  <Text style={{ color: toRgb(theme.colors['--text-primary']) }}>{t('common.notice')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {!loading && (!topPool || topPool.users.length === 0) && !error ? (
          <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>{t('explore.noListMatches')}</Text>
        ) : null}
      </ScrollView>
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
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
});
