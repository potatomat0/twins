import supabase from '@services/supabase';
import { useMessagesStore } from '@store/messagesStore';
import { useNotificationStore, NotificationRecord } from '@store/notificationStore';

class RealtimeManager {
  private channels: Map<string, ReturnType<typeof supabase.channel>> = new Map();
  private userId: string | null = null;

  connect(userId: string) {
    if (this.userId === userId) return; // Already connected
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
        }
      )
      .subscribe();
    this.channels.set('notifications', channel);
  }

  private subscribeToMatches(userId: string) {
    // Listen for new matches where user is A or B
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
      .subscribe();
    this.channels.set('matches', channel);
  }

  private async handleNewMatch(matchRecord: any, userId: string) {
    console.log('[RealtimeManager] New match detected:', matchRecord);
    const peerId = matchRecord.user_a === userId ? matchRecord.user_b : matchRecord.user_a;
    
    // Optimistically add empty thread to message store
    // We need profile info for the thread list
    try {
        const { data } = await supabase.rpc('get_profile_lookup', { ids: [peerId] }).maybeSingle();
        if (data) {
            useMessagesStore.getState().addThread({
                matchId: matchRecord.id,
                peerId: peerId,
                peerName: data.username,
                peerAvatar: (data as any).avatar_url,
                lastMessage: null,
                lastAt: matchRecord.created_at, // Use match creation time for sort
                hasUnread: false
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
