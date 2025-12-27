import { create } from 'zustand';
import supabase from '@services/supabase';

export type Thread = {
  matchId: string;
  peerId: string;
  peerName: string | null;
  peerAvatar?: string | null;
  lastMessage: string | null;
  lastAt: string | null;
  hasUnread: boolean;
};

type MessagesState = {
  threads: Thread[];
  loading: boolean;
  initialized: boolean;
  
  initialize: (userId: string) => Promise<void>;
  reset: () => void;
  updateThread: (matchId: string, updates: Partial<Thread>) => void;
  setThreads: (threads: Thread[]) => void;
  markRead: (matchId: string) => void;
};

let subscription: ReturnType<typeof supabase.channel> | null = null;

export const useMessagesStore = create<MessagesState>((set, get) => ({
  threads: [],
  loading: false,
  initialized: false,

  initialize: async (userId: string) => {
    if (get().initialized) return;
    set({ loading: true });

    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }

    try {
      // 1. Fetch Matches
      const { data: matchRows, error } = await supabase
        .from('matches')
        .select('id,user_a,user_b,created_at')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);
        
      if (error) throw error;

      const peers = (matchRows ?? []).map((m) => ({
        matchId: m.id as string,
        peerId: m.user_a === userId ? (m.user_b as string) : (m.user_a as string),
      }));

      // 2. Fetch Profiles
      const profilesById: Record<string, { username: string | null; avatar_url: string | null }> = {};
      if (peers.length > 0) {
        const { data: profs } = await supabase
          .from('profile_lookup')
          .select('id,username,avatar_url')
          .in('id', peers.map((p) => p.peerId));
        (profs ?? []).forEach((p) => {
          profilesById[p.id] = { username: p.username ?? null, avatar_url: (p as any).avatar_url ?? null };
        });
      }

      // 3. Fetch Last Messages (Parallel)
      // Note: A smarter query would be a joined view, but keeping existing logic structure for safety
      // Improved: Use a single RPC if available, or just map.
      const threads: Thread[] = [];
      await Promise.all(peers.map(async (p) => {
        const { data: msg } = await supabase
          .from('messages')
          .select('body,created_at,sender_id,status')
          .eq('match_id', p.matchId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        const hasUnread = msg?.sender_id !== userId && msg?.status !== 'seen';
        
        threads.push({
          matchId: p.matchId,
          peerId: p.peerId,
          peerName: profilesById[p.peerId]?.username ?? 'Unknown',
          peerAvatar: profilesById[p.peerId]?.avatar_url ?? null,
          lastMessage: msg?.body ?? null,
          lastAt: msg?.created_at ?? null,
          hasUnread,
        });
      }));

      const sorted = threads.sort((a, b) => {
        if (!a.lastAt) return 1;
        if (!b.lastAt) return -1;
        return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      });

      set({ threads: sorted, loading: false, initialized: true });

      // Subscribe to all matches
      const matchIds = peers.map(p => p.matchId);
      if (matchIds.length === 0) return;

      subscription = supabase
        .channel(`messages-store-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const rec = payload.new as any;
            if (!rec?.match_id || !matchIds.includes(rec.match_id)) return;
            
            set((state) => {
              const existing = state.threads.find(t => t.matchId === rec.match_id);
              if (!existing) return {}; // Should not happen if we fetched all matches
              
              const updatedThread: Thread = {
                ...existing,
                lastMessage: rec.body ?? existing.lastMessage,
                lastAt: rec.created_at ?? existing.lastAt,
                hasUnread: rec.sender_id !== userId
              };
              
              const others = state.threads.filter(t => t.matchId !== rec.match_id);
              const nextThreads = [updatedThread, ...others].sort((a, b) => {
                 if (!a.lastAt) return 1;
                 if (!b.lastAt) return -1;
                 return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
              });
              
              return { threads: nextThreads };
            });
          }
        )
        .subscribe();

    } catch (err) {
      console.warn('[messagesStore] init error', err);
      set({ loading: false });
    }
  },

  reset: () => {
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
    set({ threads: [], initialized: false });
  },

  updateThread: (matchId, updates) => {
    set((state) => {
      const existing = state.threads.find(t => t.matchId === matchId);
      if (!existing) return {};
      
      const updated = { ...existing, ...updates };
      const others = state.threads.filter(t => t.matchId !== matchId);
      
      // Re-sort if date changed
      const nextThreads = [updated, ...others].sort((a, b) => {
         if (!a.lastAt) return 1;
         if (!b.lastAt) return -1;
         return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      });
      return { threads: nextThreads };
    });
  },
  
  markRead: (matchId: string) => {
    set((state) => {
      const existing = state.threads.find(t => t.matchId === matchId);
      if (!existing || !existing.hasUnread) return {};
      
      const updated = { ...existing, hasUnread: false };
      const others = state.threads.filter(t => t.matchId !== matchId);
      
      // Keep sort order
      const nextThreads = [updated, ...others].sort((a, b) => {
         if (!a.lastAt) return 1;
         if (!b.lastAt) return -1;
         return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      });
      return { threads: nextThreads };
    });
  },
  
  setThreads: (threads) => set({ threads }),
}));
