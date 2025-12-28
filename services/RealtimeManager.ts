import supabase from '@services/supabase';
import { useMessagesStore } from '@store/messagesStore';
import { useNotificationStore, NotificationRecord } from '@store/notificationStore';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

class RealtimeManager {
  private channels: Map<string, ReturnType<typeof supabase.channel>> = new Map();
  private userId: string | null = null;
  private soundObject: Audio.Sound | null = null;

  constructor() {
    this.preloadSound();
  }

  private async preloadSound() {
    try {
        const { sound } = await Audio.Sound.createAsync(
            require('../assets/sound/pop.mp3')
        );
        this.soundObject = sound;
    } catch (e) {
        // Ignore sound errors
    }
  }

  private async playPop() {
    try {
        if (this.soundObject) {
            await this.soundObject.replayAsync();
        } else {
            // Try loading on fly if failed previously
            const { sound } = await Audio.Sound.createAsync(
                require('../assets/sound/pop.mp3')
            );
            this.soundObject = sound;
            await sound.playAsync();
        }
    } catch (e) {
        // Ignore
    }
  }

  connect(userId: string) {
    if (this.userId === userId) {
        console.log('[RealtimeManager] Already connected for', userId);
        return; 
    }
    this.disconnect(); // Clean up old connections
    this.userId = userId;

    console.log('[RealtimeManager] Connecting for user:', userId);

    this.subscribeToNotifications(userId);
    this.subscribeToMatches(userId);
    this.subscribeToMessages(userId);
  }

  disconnect() {
    console.log('[RealtimeManager] Disconnecting...');
    this.channels.forEach((channel) => supabase.removeChannel(channel));
    this.channels.clear();
    this.userId = null;
  }

  private subscribeToNotifications(userId: string) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const record = payload.new as NotificationRecord;
          console.log('[RealtimeManager] New notification:', record);
          useNotificationStore.getState().addNotification(record);
          
          // Feedback
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          void this.playPop();
        }
      )
      .subscribe();
    this.channels.set('notifications', channel);
  }

  private subscribeToMatches(userId: string) {
    // Listen for new matches where user is A or B
    // Note: We use a single channel with two listeners? Or simply listen to all matches and filter client-side if row level security allows?
    // RLS ensures we only receive rows we are allowed to see.
    // So `filter` isn't strictly necessary for security, but good for noise reduction if RLS is open.
    // However, Supabase Realtime sometimes misses events if filters are too complex or if `new` payload doesn't perfectly match.
    // Let's rely on RLS-filtered stream without additional filters if possible, or keep explicit filters.
    // We stick to explicit filters to be safe.
    
    const channel = supabase
      .channel(`matches:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `user_a=eq.${userId}` },
        (payload) => this.handleNewMatch(payload.new, userId)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `user_b=eq.${userId}` },
        (payload) => this.handleNewMatch(payload.new, userId)
      )
      .subscribe((status) => {
        console.log(`[RealtimeManager] Matches channel status: ${status}`);
      });
    this.channels.set('matches', channel);
  }

  private async handleNewMatch(matchRecord: any, userId: string) {
    console.log('[RealtimeManager] Handling new match for user:', userId, matchRecord);
    
    // Feedback for match
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void this.playPop();

    // Determine peer ID
    const peerId = matchRecord.user_a === userId ? matchRecord.user_b : matchRecord.user_a;
    
    // Optimistically add empty thread to message store
    try {
        // Use the secure RPC to get basic info
        const { data, error } = await supabase.rpc('get_profile_lookup', { ids: [peerId] }).maybeSingle<{ id: string; username: string | null; avatar_url: string | null }>();
        
        if (error) {
             console.error('[RealtimeManager] Profile lookup failed', error);
        }

        const threadBase = {
            matchId: matchRecord.id,
            peerId: peerId,
            lastMessage: null,
            lastAt: matchRecord.created_at, // Use match creation time for sort
            hasUnread: false
        };

        if (data) {
            useMessagesStore.getState().addThread({
                ...threadBase,
                peerName: data.username,
                peerAvatar: data.avatar_url,
            });
            console.log('[RealtimeManager] Added new thread for', peerId);
        } else {
             console.warn('[RealtimeManager] No profile data found for', peerId, 'Adding skeleton thread');
             useMessagesStore.getState().addThread({
                ...threadBase,
                peerName: 'New Match', // Placeholder
                peerAvatar: null
             });
        }
    } catch (e) {
        console.error('[RealtimeManager] Failed to fetch profile for new match', e);
    }
  }

  private subscribeToMessages(userId: string) {
    // We can listen to ALL messages where sender or receiver is userId
    // However, RLS usually restricts us to seeing rows we are part of.
    // Ideally we filter by match_id, but we don't want to open 100 channels.
    // "postgres_changes" with filter `receiver_id=eq.${userId}` is efficient for INCOMING.
    // For outgoing (to sync multi-device), we listen to `sender_id=eq.${userId}`.
    
    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
        (payload) => {
            console.log('[RealtimeManager] Incoming message:', payload.new);
            useMessagesStore.getState().handleRealtimeMessage(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` },
        (payload) => {
            // Self-sent message (from another device?), update store
            useMessagesStore.getState().handleRealtimeMessage(payload.new);
        }
      )
      .subscribe();
      
    this.channels.set('messages', channel);
  }
}

export const realtimeManager = new RealtimeManager();
