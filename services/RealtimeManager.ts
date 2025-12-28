import supabase from '@services/supabase';
import { useMessagesStore } from '@store/messagesStore';
import { useNotificationStore, NotificationRecord } from '@store/notificationStore';
import * as Haptics from 'expo-haptics';

class RealtimeManager {
  private channels: Map<string, ReturnType<typeof supabase.channel>> = new Map();
  private userId: string | null = null;
  private onPlaySound: (() => void) | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // No-op
  }

  setPlaySoundCallback(fn: () => void) {
    this.onPlaySound = fn;
  }

  private triggerFeedback() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    this.onPlaySound?.();
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
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
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

          this.triggerFeedback();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const record = payload.new as NotificationRecord;
          console.log('[RealtimeManager] Notification updated:', record);
          useNotificationStore.getState().addNotification(record);
          this.triggerFeedback();
        },
      )
      .subscribe((status) => {
        if (__DEV__) console.log('[RealtimeManager] notifications channel status', status);
      });
    this.channels.set('notifications', channel);
  }

  private subscribeToMatches(userId: string) {
    const channel = supabase
      .channel(`matches:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload) => {
          const rec = payload.new as { id: string; user_a: string; user_b: string; created_at: string };
          console.log('[RealtimeManager] Match INSERT received:', rec);
          if (rec.user_a === userId || rec.user_b === userId) {
            this.handleNewMatch(rec, userId);
          }
        },
      )
      .subscribe((status) => {
        console.log(`[RealtimeManager] Matches channel status: ${status}`);
      });
    this.channels.set('matches', channel);
  }

  private async handleNewMatch(matchRecord: any, userId: string) {
    console.log('[RealtimeManager] Handling new match for user:', userId, matchRecord);

    this.triggerFeedback();

    const peerId = matchRecord.user_a === userId ? matchRecord.user_b : matchRecord.user_a;

    try {
      const { data, error } = await supabase
        .rpc('get_profile_lookup', { ids: [peerId] })
        .maybeSingle<{ id: string; username: string | null; avatar_url: string | null }>();

      if (error) {
        console.error('[RealtimeManager] Profile lookup failed', error);
      }

      const threadBase = {
        matchId: matchRecord.id,
        peerId,
        lastMessage: null,
        lastAt: matchRecord.created_at,
        hasUnread: false,
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
          peerName: 'New Match',
          peerAvatar: null,
        });
      }
    } catch (e) {
      console.error('[RealtimeManager] Failed to fetch profile for new match', e);
    }
  }

  private subscribeToMessages(userId: string) {
    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
        (payload) => {
          console.log('[RealtimeManager] Incoming message:', payload.new);
          useMessagesStore.getState().handleRealtimeMessage(payload.new);
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` },
        (payload) => {
          useMessagesStore.getState().handleRealtimeMessage(payload.new);
        },
      )
      .subscribe((status) => {
        if (__DEV__) console.log('[RealtimeManager] messages channel status', status);
      });

    this.channels.set('messages', channel);
  }
}

export const realtimeManager = new RealtimeManager();
