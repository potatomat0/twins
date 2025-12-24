import { useEffect, useMemo, useRef, useState } from 'react';
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

type Options = {
  enabled?: boolean;
  limit?: number;
};

export function useNotifications(userId: string | null | undefined, opts: Options = {}) {
  const enabled = opts.enabled !== false;
  const limit = opts.limit ?? 50;
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    if (!userId || !enabled) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!error && data) {
      setNotifications(data as NotificationRecord[]);
    }
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    void reload();
  }, [userId, enabled, limit]);

  // Realtime subscribe
  useEffect(() => {
    if (!userId || !enabled) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const record = payload.new as NotificationRecord;
          setNotifications((prev) => [record, ...prev].slice(0, limit));
        },
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId, enabled, limit]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await supabase.from('notifications').update({ read: true }).in('id', ids);
    if (!error) {
      setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    }
  };

  return { notifications, unreadCount, markRead, reload, loading };
}

export default useNotifications;
