import React, { useMemo, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, SectionList, Pressable, RefreshControl } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useTranslation } from '@context/LocaleContext';
import { useAuth } from '@context/AuthContext';
import useNotifications, { NotificationRecord } from '@hooks/useNotifications';
import Ionicons from '@expo/vector-icons/Ionicons';
import UserInfoModal, { UserInfo } from '@components/UserInfoModal';
import ProfileDetailModal, { ProfileDetail } from '@components/ProfileDetailModal';
import supabase from '@services/supabase';
import { useNavigation } from '@react-navigation/native';

const iconForType = (type: NotificationRecord['type']) => {
  if (type === 'mutual') return 'sparkles-outline';
  if (type === 'message') return 'chatbubble-ellipses-outline';
  return 'heart-outline';
};

const labelForType = (t: ReturnType<typeof useTranslation>['t'], type: NotificationRecord['type']) => {
  if (type === 'mutual') return t('notifications.mutual');
  if (type === 'message') return t('notifications.message');
  return t('notifications.like');
};

const MatchesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { notifications, unreadCount, markRead, reload, loading } = useNotifications(user?.id, { enabled: true, limit: 50 });
  const [modalUser, setModalUser] = useState<UserInfo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalNotificationId, setModalNotificationId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<NotificationRecord['type'] | null>(null);
  const [canMessage, setCanMessage] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [profileDetail, setProfileDetail] = useState<ProfileDetail | null>(null);
  const [profileDetailVisible, setProfileDetailVisible] = useState(false);

  const sections = useMemo(() => {
    const unread = notifications.filter((n) => !n.read);
    const read = notifications.filter((n) => n.read);
    const res: { title: string; data: NotificationRecord[] }[] = [];
    if (unread.length > 0) res.push({ title: t('notifications.unread'), data: unread });
    if (read.length > 0) res.push({ title: t('notifications.read'), data: read });
    return res;
  }, [notifications, t]);

  const handleAction = async (action: 'like' | 'skip') => {
    if (!user?.id || !modalUser) return;
    setActioning(true);
    try {
      const { data, error } = await supabase.functions.invoke('match-update', {
        body: {
          actorId: user.id,
          targetId: modalUser.id,
          outcome: action,
        },
      });
      if (__DEV__) {
        if (error) console.warn('[match-update][matches] error', error);
        else console.log('[match-update][matches] ok', data);
      }
      if (error) {
        setActioning(false);
        return;
      }
      if (modalNotificationId) {
        markRead([modalNotificationId]);
      }

      // If mutual created (or already exists), open chat after like
      if (action === 'like') {
        const { mutualCreated } = (data as any) ?? {};
        const match = await findMatch(modalUser.id);
        setCanMessage(!!match);
        if (mutualCreated || match) {
          void openChat(modalUser);
        }
      }
    } catch (err) {
      if (__DEV__) console.warn('[match-update][matches] exception', err);
    } finally {
      setActioning(false);
      setModalVisible(false);
    }
  };

  const findMatch = async (peerId: string) => {
    if (!user?.id) return null;
    const { data, error } = await supabase
      .from('matches')
      .select('id,user_a,user_b')
      .or(`and(user_a.eq.${user.id},user_b.eq.${peerId}),and(user_a.eq.${peerId},user_b.eq.${user.id})`)
      .maybeSingle();
    if (error) {
      if (__DEV__) console.warn('[matches] fetch match error', error);
      return null;
    }
    return data;
  };

  const openChat = async (actor: UserInfo, notificationId?: string) => {
    if (!user?.id) return;
    const data = await findMatch(actor.id);
    if (!data) {
      if (__DEV__) console.warn('[matches] no match found for chat');
      setCanMessage(false);
      return;
    }
    setModalVisible(false);
    navigation.navigate('Chat', {
      matchId: data.id,
      peerId: actor.id,
      peerName: actor.username ?? null,
      peerAvatar: actor.avatar_url ?? null,
    });
    if (notificationId) {
      markRead([notificationId]);
    }
  };

  const openProfileDetail = async (actor: UserInfo) => {
    setProfileDetailVisible(true);
    setProfileDetail({
      id: actor.id,
      username: actor.username ?? null,
      age_group: actor.age_group ?? null,
      gender: actor.gender ?? null,
      character_group: actor.character_group ?? null,
      avatar_url: actor.avatar_url ?? null,
      hobbies: null,
      hobbies_cipher: null,
      hobbies_iv: null,
      hobby_embedding: null,
      pca_dim1: null,
      pca_dim2: null,
      pca_dim3: null,
      pca_dim4: null,
    });
    const { data, error } = await supabase
      .from('profile_lookup')
      .select('id,username,avatar_url')
      .eq('id', actor.id)
      .maybeSingle();
    if (error && __DEV__) console.warn('[matches] profile lookup error', error);
    if (data) {
      setProfileDetail({
        id: data.id,
        username: data.username ?? actor.username ?? null,
        age_group: actor.age_group ?? null,
        gender: actor.gender ?? null,
        character_group: actor.character_group ?? null,
        avatar_url: (data as any).avatar_url ?? actor.avatar_url ?? null,
        hobbies: [],
        hobbies_cipher: null,
        hobbies_iv: null,
        hobby_embedding: null,
        pca_dim1: null,
        pca_dim2: null,
        pca_dim3: null,
        pca_dim4: null,
      });
    }
    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('id,username,age_group,gender,character_group,avatar_url,hobbies,hobbies_cipher,hobbies_iv,pca_dim1,pca_dim2,pca_dim3,pca_dim4')
      .eq('id', actor.id)
      .maybeSingle();
    if (profErr && __DEV__) console.warn('[matches] profiles fetch error', profErr);
    if (prof) {
      setProfileDetail({
        id: prof.id,
        username: (prof as any).username ?? actor.username ?? null,
        age_group: ((prof as any).age_group ?? null) as string | null,
        gender: ((prof as any).gender ?? null) as string | null,
        character_group: ((prof as any).character_group ?? null) as string | null,
        avatar_url: ((prof as any).avatar_url ?? actor.avatar_url ?? null) as string | null,
        hobbies: (prof as any).hobbies ?? [],
        hobbies_cipher: (prof as any).hobbies_cipher ?? null,
        hobbies_iv: (prof as any).hobbies_iv ?? null,
        hobby_embedding: null,
        pca_dim1: (prof as any).pca_dim1 ?? null,
        pca_dim2: (prof as any).pca_dim2 ?? null,
        pca_dim3: (prof as any).pca_dim3 ?? null,
        pca_dim4: (prof as any).pca_dim4 ?? null,
      });
    }
  };

  const renderItem = ({ item }: { item: NotificationRecord }) => {
    const isUnread = !item.read;
    const actor: UserInfo | null = item.payload?.actor ?? null;
    return (
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: toRgb(theme.colors['--surface']),
            borderColor: toRgba(theme.colors['--border'], 0.12),
            opacity: isUnread ? 1 : 0.85,
          },
        ]}
        onPress={() => {
          // Only mark read when user takes an action; viewing alone should not mark read
          if (actor) {
            if (isUnread) {
              markRead([item.id]);
            }
            if (item.type === 'message') {
              void openChat(actor, item.id);
              return;
            }
            setModalUser(actor);
            setModalVisible(true);
            setModalNotificationId(item.id);
            setModalType(item.type);
            // determine if message button should show
            void (async () => {
              const match = await findMatch(actor.id);
              setCanMessage(!!match);
            })();
            void openProfileDetail(actor);
          }
        }}
      >
        <Ionicons
          name={iconForType(item.type) as any}
          size={22}
          color={item.type === 'mutual' ? toRgb(theme.colors['--accent-cyan']) : toRgb(theme.colors['--brand-primary'])}
          style={{ marginRight: 10 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700' }}>
            {labelForType(t, item.type)}
          </Text>
          <Text style={{ color: toRgb(theme.colors['--text-secondary']), fontSize: 12 }}>
            {item.payload?.message ?? t('notifications.generic')}
          </Text>
        </View>
        {isUnread ? (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: toRgb(theme.colors['--accent-cyan']),
            }}
          />
        ) : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <View style={{ padding: 16, flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{t('notifications.title')}</Text>
            <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>
              {unreadCount > 0 ? t('notifications.unreadCount', { count: unreadCount }) : t('notifications.emptyHint')}
            </Text>
          </View>
        </View>

        {sections.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: toRgb(theme.colors['--text-muted']), textAlign: 'center' }}>{t('notifications.empty')}</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderSectionHeader={({ section }) =>
              section.title === t('notifications.read') ? (
                <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                  <View style={{ height: 1, width: '100%', backgroundColor: toRgba(theme.colors['--border'], 0.2) }} />
                  <Text style={{ marginTop: 4, color: toRgb(theme.colors['--text-muted']), fontSize: 12 }}>{section.title}</Text>
                </View>
              ) : section.title === t('notifications.unread') ? (
                <View style={{ paddingVertical: 6 }}>
                  <Text style={{ color: toRgb(theme.colors['--text-secondary']), fontWeight: '600' }}>{section.title}</Text>
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={() => {
                  void reload();
                }}
                tintColor={toRgb(theme.colors['--brand-primary'])}
              />
            }
          />
        )}
      </View>
      <UserInfoModal
        visible={modalVisible}
        user={modalUser}
        onClose={() => setModalVisible(false)}
        onLike={() => handleAction('like')}
        onSkip={() => handleAction('skip')}
        showActions={modalType !== 'mutual'}
        onMessage={modalType === 'mutual' && canMessage ? (u) => openChat(u, modalNotificationId ?? undefined) : undefined}
        onViewProfile={(u) => void openProfileDetail(u)}
      />
      <ProfileDetailModal
        visible={profileDetailVisible}
        onClose={() => setProfileDetailVisible(false)}
        profile={profileDetail}
        currentUserHobbies={[]}
      />
      {actioning ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' }}>
          <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>{t('common.loading')}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default MatchesScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
});
