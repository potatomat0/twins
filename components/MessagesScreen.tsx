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
import ProfileDetailModal, { ProfileDetail } from '@components/ProfileDetailModal';

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
  const [modalProfile, setModalProfile] = useState<ProfileDetail | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);

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

  const sorted = useMemo(() => {
    return [...threads].sort((a, b) => {
      if (!a.lastAt) return 1;
      if (!b.lastAt) return -1;
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
    });
  }, [threads]);

  const openProfile = async (item: Thread) => {
    void Haptics.selectionAsync();
    setActiveThread(item);
    setModalProfile({
      id: item.peerId,
      username: item.peerName ?? null,
      age_group: null,
      gender: null,
      character_group: null,
      avatar_url: item.peerAvatar ?? null,
      hobbies: [],
      hobby_embedding: null,
      pca_dim1: null,
      pca_dim2: null,
      pca_dim3: null,
      pca_dim4: null,
    });
    setModalVisible(true);

    const { data, error } = await supabase
      .from('profile_lookup')
      .select('id,username,age_group,gender,character_group,avatar_url,hobbies,hobbies_cipher,hobbies_iv,pca_dim1,pca_dim2,pca_dim3,pca_dim4')
      .eq('id', item.peerId)
      .maybeSingle();
    if (error) {
      if (__DEV__) console.warn('[messages] profile lookup error', error);
      return;
    }
    if (data) {
      setModalProfile({
        id: data.id,
        username: data.username ?? item.peerName ?? null,
        age_group: data.age_group ?? null,
        gender: data.gender ?? null,
        character_group: data.character_group ?? null,
        avatar_url: data.avatar_url ?? item.peerAvatar ?? null,
        hobbies: (data as any).hobbies ?? null,
        hobbies_cipher: (data as any).hobbies_cipher ?? null,
        hobbies_iv: (data as any).hobbies_iv ?? null,
        hobby_embedding: null,
        pca_dim1: (data as any).pca_dim1 ?? null,
        pca_dim2: (data as any).pca_dim2 ?? null,
        pca_dim3: (data as any).pca_dim3 ?? null,
        pca_dim4: (data as any).pca_dim4 ?? null,
      });
    }
  };

  const openChat = (item: Thread) => {
    void Haptics.selectionAsync();
    nav.navigate('Chat', {
      matchId: item.matchId,
      peerId: item.peerId,
      peerName: item.peerName,
      peerAvatar: item.peerAvatar,
    });
  };

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
        onPress={() => openChat(item)}
      >
        <Pressable
          style={styles.avatarWrap}
          onPress={() => openChat(item)}
          onLongPress={() => openProfile(item)}
          delayLongPress={120}
        >
          {item.peerAvatar ? (
            <Image source={{ uri: item.peerAvatar }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <Ionicons name="person-circle-outline" size={40} color={toRgb(theme.colors['--text-secondary'])} />
          )}
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => openChat(item)}>
          <Text style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700' }}>
            {item.peerName ?? t('messages.unknown')}
          </Text>
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), marginTop: 2 }} numberOfLines={1}>
            {item.lastMessage ?? t('messages.noMessages')}
          </Text>
        </Pressable>
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
      {modalProfile ? (
        <ProfileDetailModal
          visible={modalVisible}
          onClose={() => {
            void Haptics.selectionAsync();
            setModalVisible(false);
          }}
          profile={modalProfile}
          currentUserHobbies={[]}
          onMessage={() => {
            setModalVisible(false);
            nav.navigate('Chat', {
              matchId: activeThread?.matchId ?? modalProfile.id,
              peerId: modalProfile.id,
              peerName: modalProfile.username ?? modalProfile.id,
              peerAvatar: modalProfile.avatar_url ?? undefined,
            } as any);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default MessagesScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatar: { width: 80, height: 80 },
});
