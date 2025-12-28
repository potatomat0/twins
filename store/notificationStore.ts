import { create } from 'zustand';
import supabase from '@services/supabase';

export type NotificationRecord = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: 'like' | 'mutual' | 'message';
  payload: any;
  read: boolean;
  created_at: string;
};

type NotificationState = {
  notifications: NotificationRecord[];
  unreadCount: number;
  loading: boolean;
  initialized: boolean;
  currentUserId: string | null;
  
  initialize: (userId: string) => Promise<void>;
  refresh: (userId: string, opts?: { silent?: boolean }) => Promise<void>;
  reset: () => void;
  markRead: (ids: string[]) => Promise<void>;
  markMessagesFromActorRead: (actorId: string) => Promise<void>;
  addNotification: (notification: NotificationRecord) => void;
  removeNotification: (id: string) => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  initialized: false,
  currentUserId: null,

  initialize: async (userId: string) => {
    if (get().initialized && get().currentUserId === userId) return;
    await get().refresh(userId);
  },

  refresh: async (userId: string, opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) set({ loading: true });

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const fetched = (data as NotificationRecord[]) ?? [];
      set((state) => {
        const mergedMap = new Map<string, NotificationRecord>();
        // Keep any realtime notifications that landed during fetch
        state.notifications.forEach((n) => mergedMap.set(n.id, n));
        fetched.forEach((n) => {
          const existing = mergedMap.get(n.id);
          if (!existing) {
            mergedMap.set(n.id, n);
          } else {
            mergedMap.set(n.id, { ...existing, ...n, read: n.read && existing.read });
          }
        });
        let merged = Array.from(mergedMap.values());

        // Dedup message notifications to 1 per sender (keep latest)
        const latestMessageByActor = new Map<string, NotificationRecord>();
        merged.forEach((n) => {
          if (n.type === 'message' && n.actor_id) {
            const prev = latestMessageByActor.get(n.actor_id);
            if (!prev || new Date(n.created_at).getTime() > new Date(prev.created_at).getTime()) {
              latestMessageByActor.set(n.actor_id, n);
            }
          }
        });
        if (latestMessageByActor.size > 0) {
          merged = merged.filter((n) => n.type !== 'message' || !n.actor_id || latestMessageByActor.get(n.actor_id) === n);
        }

        merged = merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return {
          notifications: merged,
          unreadCount: merged.filter((n) => !n.read).length,
          loading: silent ? state.loading : false,
          initialized: true,
          currentUserId: userId,
        };
      });

    } catch (err) {
      console.warn('[notificationStore] init error', err);
      if (!silent) set({ loading: false });
    }
  },

  reset: () => {
    set({ notifications: [], unreadCount: 0, initialized: false, currentUserId: null });
  },

  markRead: async (ids: string[]) => {
    if (!ids.length) return;
    
    // Optimistic update
    set((state) => {
      const nextNotifications = state.notifications.map((n) => 
        ids.includes(n.id) ? { ...n, read: true } : n
      );
      return {
        notifications: nextNotifications,
        unreadCount: nextNotifications.filter((n) => !n.read).length,
      };
    });

    try {
      const { error } = await supabase.from('notifications').update({ read: true }).in('id', ids);
      if (error) throw error;
    } catch (err) {
      console.warn('[notificationStore] markRead error', err);
      // Revert if needed? Usually distinct enough not to worry for read status
    }
  },

  markMessagesFromActorRead: async (actorId: string) => {
    const ids = get()
      .notifications
      .filter((n) => n.type === 'message' && n.actor_id === actorId && !n.read)
      .map((n) => n.id);
    if (!ids.length) return;
    await get().markRead(ids);
  },

  removeNotification: (id: string) => {
    set((state) => {
      const nextNotifications = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: nextNotifications,
        unreadCount: nextNotifications.filter((n) => !n.read).length,
      };
    });
  },

  addNotification: (notification: NotificationRecord) => {
    set((state) => {
      // Dedupe rule:
      // - For generic notifications: dedupe by ID.
      // - For message notifications: keep only ONE per sender (actor_id), always the latest, and revive to unread.
      const isMessage = notification.type === 'message' && !!notification.actor_id;

      if (__DEV__) {
        console.log('[notificationStore] addNotification', {
          id: notification.id,
          type: notification.type,
          created_at: notification.created_at,
          actor: notification.actor_id,
        });
      }

      const existingSameId = state.notifications.find((n) => n.id === notification.id);

      let nextList = state.notifications;

      if (isMessage) {
        // Drop any older message notification from the same sender
        nextList = state.notifications.filter(
          (n) => !(n.type === 'message' && n.actor_id === notification.actor_id),
        );
        // Force unread on incoming/updated message and keep the latest payload/message text
        notification = { ...notification, read: false };
      } else if (existingSameId) {
        // Replace same-ID notification (UPDATE) for non-message types
        nextList = state.notifications.filter((n) => n.id !== notification.id);
      }

      const next = [notification, ...nextList].slice(0, 50);
      return {
        notifications: next,
        unreadCount: next.filter((n) => !n.read).length,
      };
    });
  },
}));
