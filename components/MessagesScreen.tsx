import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, FlatList, StyleSheet, Pressable, Image, RefreshControl } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { toRgb, toRgba } from '@themes/index';
import { useAuth } from '@context/AuthContext';
import { useTranslation } from '@context/LocaleContext';
import supabase from '@services/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ProfileDetailModal, { ProfileDetail } from '@components/ProfileDetailModal';
import { useMessagesStore, Thread } from '@store/messagesStore';

const MessagesScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<any>();
  
  const threads = useMessagesStore((s) => s.threads);
  const loading = useMessagesStore((s) => s.loading);
  const initMessages = useMessagesStore((s) => s.initialize);
  
  const [refreshing, setRefreshing] = useState(false);
  const [modalProfile, setModalProfile] = useState<ProfileDetail | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);

  // Initialize/Refresh logic moved to store, triggered here or globally
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        // We rely on the store's subscription for real-time updates.
        // But we can trigger a refresh if needed.
        // For now, let's trust the subscription established in AppNavigator.
      }
    }, [user?.id]),
  );

  const openProfile = async (item: Thread) => {
    void Haptics.selectionAsync();
    setActiveThread(item);
    
    // Initial optimistic state from thread item
    const initialProfile: ProfileDetail = {
      id: item.peerId,
      username: item.peerName ?? null,
      age_group: null,
      gender: null,
      character_group: null,
      avatar_url: item.peerAvatar ?? null,
      hobbies: [],
      hobbies_cipher: null,
      hobbies_iv: null,
      hobby_embedding: null,
      pca_dim1: null,
      pca_dim2: null,
      pca_dim3: null,
      pca_dim4: null,
    };
    
    setModalProfile(initialProfile);
    setModalVisible(true);

    try {
      const { data, error } = await supabase.functions.invoke('get-profile-details', {
        body: { userId: user?.id, targetId: item.peerId }
      });

      if (error) {
        console.warn('[MessagesScreen] get-profile-details error', error);
        return;
      }

      if (data) {
        setModalProfile({
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
      console.warn('[MessagesScreen] get-profile-details exception', err);
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
          onPress={() => openProfile(item)}
          accessibilityRole="button"
          accessibilityLabel={t('messages.viewProfile')}
        >
          {item.peerAvatar ? (
            <Image source={{ uri: item.peerAvatar }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <Ionicons name="person-circle-outline" size={40} color={toRgb(theme.colors['--text-secondary'])} />
          )}
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => openChat(item)}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
             <Text style={{ color: toRgb(theme.colors['--text-primary']), fontWeight: '700' }}>
               {item.peerName ?? t('messages.unknown')}
             </Text>
             {item.lastAt && (
               <Text style={{ color: toRgb(theme.colors['--text-muted']), fontSize: 10 }}>
                 {new Date(item.lastAt).toLocaleDateString()}
               </Text>
             )}
          </View>
          <Text 
            style={{ 
              color: item.hasUnread ? toRgb(theme.colors['--text-primary']) : toRgb(theme.colors['--text-secondary']), 
              marginTop: 2,
              fontWeight: item.hasUnread ? '700' : '400' 
            }} 
            numberOfLines={1}
          >
            {item.lastMessage ?? t('messages.noMessages')}
          </Text>
        </Pressable>
        {item.hasUnread && (
           <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: toRgb(theme.colors['--accent-cyan']), marginLeft: 8}} />
        )}
        <Ionicons name="chevron-forward" size={18} color={toRgb(theme.colors['--text-muted'])} style={{marginLeft: 4}}/>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: toRgb(theme.colors['--bg']) }]}>
      <View style={{ padding: 16, flex: 1 }}>
        <Text style={[styles.title, { color: toRgb(theme.colors['--text-primary']) }]}>{t('messages.title')}</Text>
        {loading && threads.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: toRgb(theme.colors['--text-secondary']) }}>{t('common.loading')}</Text>
          </View>
        ) : threads.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Ionicons name="chatbox-ellipses-outline" size={26} color={toRgb(theme.colors['--text-muted'])} />
            <Text style={{ color: toRgb(theme.colors['--text-muted']), marginTop: 8, textAlign: 'center' }}>
              {t('messages.empty')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={threads}
            keyExtractor={(item) => item.matchId}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingVertical: 12 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  if (user?.id) await initMessages(user.id);
                  setRefreshing(false);
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
          currentUserHobbies={profile?.hobbies ?? []}
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
    width: 60, // Reduced from 80 for sleeker look in list
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatar: { width: 60, height: 60 },
});