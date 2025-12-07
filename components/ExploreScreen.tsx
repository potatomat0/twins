import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useTranslation } from '@context/LocaleContext';
import Button from '@components/common/Button';
import { useAuth } from '@context/AuthContext';
import supabase from '@services/supabase';

type SimilarUser = {
  id: string;
  username: string | null;
  age_group: string | null;
  gender: string | null;
  character_group: string | null;
  similarity: number;
};

type Pool = {
  size: number;
  users: SimilarUser[];
  available: boolean;
};

const placeholderAvatar = 'https://placekitten.com/160/160';

const ExploreScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [filters, setFilters] = useState({ ageGroup: true, gender: true, characterGroup: true });
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setPools(payload?.pools ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [filters, user?.id]);

  const topPool = useMemo(() => pools.find((p) => p.users?.length), [pools]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>
          {t('dashboard.title', { username: user?.user_metadata?.username ?? 'Friend' })}
        </Text>
        <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>
          Swipe-ready recommendations based on your PCA fingerprint.
        </Text>

        <View style={[styles.card, { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.12) }]}>
          <Text style={[styles.cardTitle, { color: toRgb(theme.colors['--text-primary']) }]}>Filters</Text>
          {(['ageGroup', 'gender', 'characterGroup'] as const).map((key) => (
            <View key={key} style={styles.filterRow}>
              <Text style={{ color: toRgb(theme.colors['--text-secondary']), flex: 1 }}>
                {key === 'ageGroup' ? 'Age group' : key === 'gender' ? 'Gender' : 'Archetype'}
              </Text>
              <Switch value={filters[key]} onValueChange={() => toggle(key)} />
            </View>
          ))}
          <Button title={loading ? 'Loading...' : 'Fetch matches'} onPress={fetchRecommendations} disabled={loading || !user?.id} />
          {error ? <Text style={{ color: toRgb(theme.colors['--danger']), marginTop: 8 }}>{error}</Text> : null}
        </View>

        <View style={{ height: 16 }} />

        {loading && (
          <View style={{ alignItems: 'center', padding: 16 }}>
            <ActivityIndicator color={toRgb(theme.colors['--brand-primary'])} />
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 8 }}>Building your pool...</Text>
          </View>
        )}

        {!loading && topPool && topPool.users.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Text style={[styles.cardTitle, { color: toRgb(theme.colors['--text-primary']) }]}>
              Top {topPool.users.length} matches
            </Text>
            {topPool.users.map((u) => (
              <View
                key={u.id}
                style={[
                  styles.userCard,
                  { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.12) },
                ]}
              >
                <Image source={{ uri: placeholderAvatar }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700' }}>
                    {u.username ?? 'Unknown'}
                  </Text>
                  <Text style={{ color: toRgb(theme.colors['--text-secondary']), fontSize: 12 }}>
                    {u.age_group ?? '—'} · {u.gender ?? '—'} · {u.character_group ?? '—'}
                  </Text>
                  <Text style={{ color: toRgb(theme.colors['--brand-primary']), marginTop: 4 }}>
                    {(u.similarity * 100).toFixed(1)}% match
                  </Text>
                </View>
                <Pressable
                  style={[styles.actionBtn, { borderColor: toRgba(theme.colors['--border'], 0.2) }]}
                  onPress={() => {}}
                >
                  <Text style={{ color: toRgb(theme.colors['--text-primary']) }}>Details</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {!loading && (!topPool || topPool.users.length === 0) && !error ? (
          <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>No matches yet. Adjust filters and try again.</Text>
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
