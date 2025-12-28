import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, SectionList, Pressable, RefreshControl } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useTranslation } from '@context/LocaleContext';
import { useAuth } from '@context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import ProfileDetailModal, { ProfileDetail } from '@components/ProfileDetailModal';
import NotificationModal from '@components/common/NotificationModal';
import supabase from '@services/supabase';
import { useNavigation } from '@react-navigation/native';
import { useNotificationStore, NotificationRecord } from '@store/notificationStore';

// Simplified user info interface from notification payload
type NotificationActor = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  age_group?: string | null;
  gender?: string | null;
  character_group?: string | null;
};

const iconForType = (type: NotificationRecord['type']) => {
  if (type === 'mutual') return 'sparkles-outline';
  if (type === 'message') return 'chatbubble-ellipses-outline';
  return 'heart-outline';
};

const labelForType = (
  t: ReturnType<typeof useTranslation>['t'],
  type: NotificationRecord['type'],
  actorName?: string | null,
) => {
  if (type === 'mutual') return t('notifications.mutual');
  if (type === 'message') return t('notifications.messageFrom', { name: actorName || t('messages.unknown') });
  return t('notifications.like');
};

const MatchesScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markRead = useNotificationStore((s) => s.markRead);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const loading = useNotificationStore((s) => s.loading);
  const init = useNotificationStore((s) => s.initialize);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [profileDetail, setProfileDetail] = useState<ProfileDetail | null>(null);
  const [currentNotification, setCurrentNotification] = useState<NotificationRecord | null>(null);
  const [actioning, setActioning] = useState(false);
  
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchData, setMatchData] = useState<{ id: string; username: string; avatar_url: string } | null>(null);

  const sections = useMemo(() => {
    const unread = notifications.filter((n) => !n.read);
    const read = notifications.filter((n) => n.read);
    const res: { title: string; data: NotificationRecord[] }[] = [];
    if (unread.length > 0) res.push({ title: t('notifications.unread'), data: unread });
    if (read.length > 0) res.push({ title: t('notifications.read'), data: read });
    return res;
  }, [notifications, t]);

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

  const openChat = async (peerId: string, peerName?: string | null, peerAvatar?: string | null, notificationId?: string) => {
    if (!user?.id) return;
    
    // Optimistic navigation if we already know a match was just created
    if (!notificationId && matchData && matchData.id === peerId) {
        // We might need the match ID. If we don't have it, we fetch it.
        const match = await findMatch(peerId);
        if (match) {
            navigation.navigate('Chat', {
              matchId: match.id,
              peerId: peerId,
              peerName: peerName ?? null,
              peerAvatar: peerAvatar ?? null,
            });
            return;
        }
    }

    const match = await findMatch(peerId);
    if (!match) {
      if (__DEV__) console.warn('[matches] no match found for chat');
      return;
    }
    
    if (notificationId) {
      void markRead([notificationId]);
    }
    setModalVisible(false);
    setMatchModalVisible(false);
    
    navigation.navigate('Chat', {
      matchId: match.id,
      peerId: peerId,
      peerName: peerName ?? null,
      peerAvatar: peerAvatar ?? null,
      notificationId: notificationId ?? null,
    });
  };

  const handleAction = async (action: 'like' | 'skip') => {
    if (!user?.id || !profileDetail || !currentNotification) return;
    
    // OPTIMISTIC UPDATE: Close modal immediately
    setModalVisible(false);
    
    // If it's a 'like' on a 'like' notification, it's a match!
    // Show match modal immediately
    if (action === 'like' && currentNotification.type === 'like') {
        setMatchData({
             id: profileDetail.id,
             username: profileDetail.username ?? 'Friend',
             avatar_url: profileDetail.avatar_url ?? '',
        });
        setMatchModalVisible(true);
        // Optimistically remove the 'like' notification as it will be replaced by 'mutual'
        removeNotification(currentNotification.id);
    } else {
        // Otherwise just mark read
        void markRead([currentNotification.id]);
    }

    setActioning(true); // Maybe not needed if UI is already closed? Keep for internal state safety.

    try {
      // Fire and forget (or rather, fire and log)
      const { data, error } = await supabase.functions.invoke('match-update', {
        body: {
          actorId: user.id,
          targetId: profileDetail.id,
          outcome: action,
        },
      });
      
      if (error) {
        console.warn('[MatchesScreen] match-update error', error);
        // TODO: Revert UI state if critical failure?
      } else {
          // If we weren't sure it was a match (e.g. from Explore), we would handle 'mutualCreated' here.
          // But for Notifications context, we know the context.
      }
    } catch (err) {
      console.warn('[MatchesScreen] match-update exception', err);
    } finally {
      setActioning(false);
    }
  };

  const loadProfileAndOpen = async (actor: NotificationActor, notification: NotificationRecord) => {
    setCurrentNotification(notification);
    
    // Pre-fill with available info
    const initialProfile: ProfileDetail = {
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
    };
    setProfileDetail(initialProfile);
    setModalVisible(true);

    // Fetch full details via Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('get-profile-details', {
        body: { userId: user?.id, targetId: actor.id }
      });

      if (error) {
        console.warn('[MatchesScreen] get-profile-details error', error);
        return;
      }

      if (data) {
        setProfileDetail({
          ...initialProfile,
          id: data.id,
          username: data.username ?? initialProfile.username,
          age_group: data.age_group ?? initialProfile.age_group,
          gender: data.gender ?? initialProfile.gender,
          character_group: data.character_group ?? initialProfile.character_group,
          avatar_url: data.avatar_url ?? initialProfile.avatar_url,
          hobbies_cipher: data.hobbies_cipher,
          hobbies_iv: data.hobbies_iv,
          pca_dim1: data.pca_dim1,
          pca_dim2: data.pca_dim2,
          pca_dim3: data.pca_dim3,
          pca_dim4: data.pca_dim4,
        });
      }
    } catch (err) {
      console.warn('[MatchesScreen] get-profile-details exception', err);
    }
  };

  const renderItem = ({ item }: { item: NotificationRecord }) => {
    const isUnread = !item.read;
    const actor: NotificationActor | null = item.payload?.actor ?? null;
    
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
          if (!actor) return;
          
          if (item.type === 'message') {
            // Open chat and mark the notification as read
            void markRead([item.id]);
            void openChat(actor.id, actor.username, actor.avatar_url, item.id);
          } else {
            // For like/mutual, mark read when opening details
            if (isUnread) {
               void markRead([item.id]);
            }
            void loadProfileAndOpen(actor, item);
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
            {labelForType(t, item.type, actor?.username ?? actor?.id ?? null)}
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

  const notificationType = currentNotification?.type;

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
                  if (user?.id) void init(user.id);
                }}
                tintColor={toRgb(theme.colors['--brand-primary'])}
              />
            }
          />
        )}
      </View>

      <ProfileDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        profile={profileDetail}
        currentUserHobbies={[]} // We could pass current user hobbies if available in AuthContext
        onLike={notificationType === 'like' ? () => handleAction('like') : undefined}
        onSkip={notificationType === 'like' ? () => handleAction('skip') : undefined}
        onMessage={notificationType === 'mutual' ? () => {
             if (profileDetail) void openChat(profileDetail.id, profileDetail.username, profileDetail.avatar_url);
        } : undefined}
      />

      <NotificationModal
        visible={matchModalVisible}
        title={t('notifications.matchNew')}
        message={t('notifications.mutual')}
        primaryText={t('common.goToChat')}
        onPrimary={() => {
          if (matchData) {
            void openChat(matchData.id, matchData.username, matchData.avatar_url);
          }
        }}
        secondaryText={t('common.dismiss')}
        onSecondary={() => setMatchModalVisible(false)}
        onRequestClose={() => setMatchModalVisible(false)}
        primaryVariant="accent"
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
