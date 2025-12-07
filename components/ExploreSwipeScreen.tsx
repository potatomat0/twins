import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator, Image, Pressable } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useTranslation } from '@context/LocaleContext';
import { useAuth } from '@context/AuthContext';
import supabase from '@services/supabase';
import Button from '@components/common/Button';

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

const placeholderAvatar = 'https://placekitten.com/320/320';

const ExploreSwipeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pool, setPool] = useState<SimilarUser[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = pool[index];
  const remaining = pool.length - index - 1;

  const fetchPool = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('recommend-users', {
        body: {
          userId: user.id,
          filters: { ageGroup: true, gender: true, characterGroup: true },
          chunkSize: 500,
          poolSizes: [200],
        },
      });
      if (fnErr) {
        setError(fnErr.message ?? 'Failed to load matches');
        return;
      }
      const payload = data as { pools?: Pool[]; error?: string };
      if (payload?.error) {
        setError(payload.error);
        return;
      }
      const users = payload?.pools?.[0]?.users ?? [];
      setPool(users);
      setIndex(0);
    } catch (e: any) {
      setError(e?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPool();
  }, [fetchPool]);

  const onSwipe = useCallback(
    (action: 'like' | 'skip') => {
      if (index < pool.length - 1) {
        setIndex((i) => i + 1);
      } else {
        // Try reloading when pool is exhausted
        fetchPool();
      }
    },
    [fetchPool, index, pool.length],
  );

  const similarityText = useMemo(() => {
    if (!current) return '';
    return `${(current.similarity * 100).toFixed(1)}% match`;
  }, [current]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <View style={{ padding: 16, flex: 1 }}>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>Explore</Text>
        <Text style={[styles.subtitle, { color: toRgb(theme.colors['--text-secondary']) }]}>
          Swipe through recommended users. Filters are applied for age/gender/archetype to keep it relevant.
        </Text>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={toRgb(theme.colors['--brand-primary'])} />
            <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 8 }}>Loading pool…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.center}>
            <Text style={{ color: toRgb(theme.colors['--danger']) }}>{error}</Text>
            <View style={{ height: 8 }} />
            <Button title="Retry" onPress={fetchPool} />
          </View>
        )}

        {!loading && !error && current && (
          <View
            style={[
              styles.card,
              { backgroundColor: toRgb(theme.colors['--surface']), borderColor: toRgba(theme.colors['--border'], 0.12) },
            ]}
          >
            <Image source={{ uri: placeholderAvatar }} style={styles.avatar} />
            <Text style={[styles.name, { color: toRgb(theme.colors['--text-primary']) }]}>{current.username ?? 'Unknown'}</Text>
            <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>
              {current.age_group ?? '—'} · {current.gender ?? '—'} · {current.character_group ?? '—'}
            </Text>
            <Text style={{ color: toRgb(theme.colors['--brand-primary']), marginTop: 6 }}>{similarityText}</Text>
            <Text style={{ color: toRgb(theme.colors['--text-muted']), marginTop: 6 }}>
              {remaining > 0 ? `${remaining} more in this pool` : 'End of pool, reloading soon'}
            </Text>
            <View style={styles.actions}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: toRgba(theme.colors['--danger'], 0.12) }]}
                onPress={() => onSwipe('skip')}
              >
                <Text style={{ color: toRgb(theme.colors['--danger']), fontWeight: '700' }}>Skip</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: toRgba(theme.colors['--brand-primary'], 0.15) }]}
                onPress={() => onSwipe('like')}
              >
                <Text style={{ color: toRgb(theme.colors['--brand-primary']), fontWeight: '700' }}>Like</Text>
              </Pressable>
            </View>
          </View>
        )}

        {!loading && !error && !current && (
          <View style={styles.center}>
            <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>No matches. Try reloading.</Text>
            <View style={{ height: 8 }} />
            <Button title="Reload" onPress={fetchPool} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default ExploreSwipeScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 12 },
  center: { alignItems: 'center', padding: 16 },
  card: { borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, gap: 6 },
  avatar: { width: '100%', height: 260, borderRadius: 12, marginBottom: 12, backgroundColor: '#ddd' },
  name: { fontSize: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionBtn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10 },
});
