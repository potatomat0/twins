import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, FlatList, StyleSheet, Pressable, Image, RefreshControl } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useAuth } from '@context/AuthContext';
import { useTranslation } from '@context/LocaleContext';
import supabase from '@services/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

type Thread = {
  matchId: string;
  peerId: string;
  peerName: string | null;
  peerAvatar?: string | null;
  lastMessage: string | null;
  lastAt: string | null;
};

const MessagesScreen: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<any>();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadThreads = async () => {
    if (!user?.id) return;
    const { data: matchRows, error } = await supabase
      .from('matches')
      .select('id,user_a,user_b,created_at')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
    if (error) {
      if (__DEV__) console.warn('[messages] matches error', error);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const peers = (matchRows ?? []).map((m) => ({
      matchId: m.id as string,
      peerId: m.user_a === user.id ? (m.user_b as string) : (m.user_a as string),
    }));
    const profilesById: Record<string, { username: string | null; avatar_url: string | null }> = {};
    if (peers.length > 0) {
      const { data: profs, error: profErr } = await supabase
        .from('profile_lookup')
        .select('id,username,avatar_url')
        .in(
          'id',
          peers.map((p) => p.peerId),
        );
      if (profErr && __DEV__) console.warn('[messages] profile lookup error', profErr);
      (profs ?? []).forEach((p) => {
        profilesById[p.id] = { username: p.username ?? null, avatar_url: (p as any).avatar_url ?? null };
      });
      peers.forEach((p) => {
        if (!profilesById[p.peerId] && __DEV__) {
          console.warn('[messages] missing profile for peer', p.peerId);
        }
      });
    }
    const results: Thread[] = [];
    for (const p of peers) {
      const { data: msg } = await supabase
        .from('messages')
        .select('body,created_at')
        .eq('match_id', p.matchId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      results.push({
        matchId: p.matchId,
        peerId: p.peerId,
        peerName: profilesById[p.peerId]?.username ?? p.peerId,
        peerAvatar: profilesById[p.peerId]?.avatar_url ?? null,
        lastMessage: msg?.body ?? null,
        lastAt: msg?.created_at ?? null,
      });
    }
    setThreads(results);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    void loadThreads();
  }, [user?.id]);

  const sorted = useMemo(
    () =>
      threads.sort((a, b) => {
        if (!a.lastAt) return 1;
        if (!b.lastAt) return -1;
        return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      }),
    [threads],
  );

  const renderItem = ({ item }: { item: Thread }) => {
    return (
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: toRgb(theme.colors['--surface']),
            borderColor: toRgba(theme.colors['--border'], 0.12),
          },
        ]}
        onPress={() => {
          void Haptics.selectionAsync();
          nav.navigate('Chat', {
            matchId: item.matchId,
            peerId: item.peerId,
            peerName: item.peerName,
            peerAvatar: item.peerAvatar,
          });
        }}
      >
        <View style={styles.avatarWrap}>
          {item.peerAvatar ? (
            <Image source={{ uri: item.peerAvatar }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <Ionicons name="person-circle-outline" size={40} color={toRgb(theme.colors['--text-secondary'])} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700' }}>
            {item.peerName ?? t('messages.unknown')}
          </Text>
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 2 }} numberOfLines={1}>
            {item.lastMessage ?? t('messages.noMessages')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={toRgb(theme.colors['--text-muted'])} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <View style={{ padding: 16, flex: 1 }}>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{t('messages.title')}</Text>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>{t('common.loading')}</Text>
          </View>
        ) : sorted.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Ionicons name="chatbox-ellipses-outline" size={26} color={toRgb(theme.colors['--text-muted'])} />
            <Text style={{ color: toRgb(theme.colors['--text-muted']), marginTop: 8, textAlign: 'center' }}>
              {t('messages.empty')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(item) => item.matchId}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingVertical: 12 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void loadThreads();
                }}
                tintColor={toRgb(theme.colors['--brand-primary'])}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default MessagesScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatar: { width: 96, height: 96 },
});
