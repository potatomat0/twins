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
  
  initialize: (userId: string) => Promise<void>;
  reset: () => void;
  markRead: (ids: string[]) => Promise<void>;
  addNotification: (notification: NotificationRecord) => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  initialized: false,

  initialize: async (userId: string) => {
    if (get().initialized) return;
    set({ loading: true });

    try {
      // Initial fetch
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifications = (data as NotificationRecord[]) ?? [];
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
        loading: false,
        initialized: true,
      });

    } catch (err) {
      console.warn('[notificationStore] init error', err);
      set({ loading: false });
    }
  },

  reset: () => {
    set({ notifications: [], unreadCount: 0, initialized: false });
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

  addNotification: (notification: NotificationRecord) => {
    set((state) => {
      // Dedupe by ID just in case
      if (state.notifications.some((n) => n.id === notification.id)) return {};
      
      const next = [notification, ...state.notifications].slice(0, 50);
      return {
        notifications: next,
        unreadCount: next.filter((n) => !n.read).length,
      };
    });
  },
}));
