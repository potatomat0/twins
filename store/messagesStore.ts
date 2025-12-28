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
  currentUserId: string | null;
  
  initialize: (userId: string, force?: boolean, silent?: boolean) => Promise<void>;
  reset: () => void;
  updateThread: (matchId: string, updates: Partial<Thread>) => void;
  addThread: (thread: Thread) => void;
  handleRealtimeMessage: (message: any) => void;
  setThreads: (threads: Thread[]) => void;
  markRead: (matchId: string) => void;
};

let subscription: ReturnType<typeof supabase.channel> | null = null;

export const useMessagesStore = create<MessagesState>((set, get) => ({
  threads: [],
  loading: false,
  initialized: false,
  currentUserId: null,

  initialize: async (userId: string, force = false, silent = false) => {
    if (!force && get().initialized && get().currentUserId === userId) return;
    if (!silent) set({ loading: true, currentUserId: userId });
    else set({ currentUserId: userId });

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
        createdAt: m.created_at
      }));

      // 2. Fetch Profiles
      const profilesById: Record<string, { username: string | null; avatar_url: string | null }> = {};
      if (peers.length > 0) {
        const { data: profs } = await supabase
          .rpc('get_profile_lookup', { ids: peers.map((p) => p.peerId) });
        (profs as any[] ?? []).forEach((p: { id: string; username: string | null; avatar_url: string | null }) => {
          profilesById[p.id] = { username: p.username ?? null, avatar_url: p.avatar_url ?? null };
        });
      }

      // 3. Fetch Last Messages (Parallel)
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
          // If no message, use match creation time for sorting
          lastAt: msg?.created_at ?? p.createdAt ?? null,
          hasUnread,
        });
      }));

      // Merge with any optimistic realtime threads that may have arrived during init
      set((state) => {
        const mergedMap = new Map<string, Thread>();

        const mergeThread = (incoming: Thread) => {
          const existing = mergedMap.get(incoming.matchId) ?? state.threads.find((t) => t.matchId === incoming.matchId);
          if (!existing) {
            mergedMap.set(incoming.matchId, incoming);
            return;
          }

          const newer =
            !existing.lastAt || (incoming.lastAt && new Date(incoming.lastAt).getTime() >= new Date(existing.lastAt).getTime())
              ? incoming
              : existing;

          mergedMap.set(incoming.matchId, {
            ...existing,
            ...newer,
            peerName: newer.peerName ?? existing.peerName,
            peerAvatar: newer.peerAvatar ?? existing.peerAvatar,
            hasUnread: existing.hasUnread || newer.hasUnread,
          });
        };

        threads.forEach(mergeThread);
        state.threads.forEach(mergeThread);

        const merged = Array.from(mergedMap.values()).sort((a, b) => {
          if (!a.lastAt) return 1;
          if (!b.lastAt) return -1;
          return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
        });

        return { threads: merged, loading: silent ? state.loading : false, initialized: true, currentUserId: userId };
      });

    } catch (err) {
      console.warn('[messagesStore] init error', err);
      if (!silent) set({ loading: false });
    }
  },

  reset: () => {
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
    set({ threads: [], initialized: false, currentUserId: null });
  },

  updateThread: (matchId, updates) => {
    set((state) => {
      const existing = state.threads.find(t => t.matchId === matchId);
      if (!existing) return {};
      
      const updated = { ...existing, ...updates };
      const others = state.threads.filter(t => t.matchId !== matchId);
      
      const nextThreads = [updated, ...others].sort((a, b) => {
         if (!a.lastAt) return 1;
         if (!b.lastAt) return -1;
         return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      });
      return { threads: nextThreads };
    });
  },
  
  addThread: (thread: Thread) => {
    set((state) => {
        const existing = state.threads.find(t => t.matchId === thread.matchId);
        if (existing) {
          // Upgrade existing skeleton with richer data if available
          if (__DEV__) {
            console.log('[messagesStore] upgrading thread', thread.matchId, {
              incoming: { lastAt: thread.lastAt, lastMessage: thread.lastMessage, peerName: thread.peerName },
              existing: { lastAt: existing.lastAt, lastMessage: existing.lastMessage, peerName: existing.peerName },
            });
          }
          const updated: Thread = {
            ...existing,
            ...thread,
            peerName: thread.peerName ?? existing.peerName,
            peerAvatar: thread.peerAvatar ?? existing.peerAvatar,
            hasUnread: existing.hasUnread || thread.hasUnread,
          };
          const others = state.threads.filter(t => t.matchId !== thread.matchId);
          const next = [updated, ...others].sort((a, b) => {
            if (!a.lastAt) return 1;
            if (!b.lastAt) return -1;
            return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
          });
          return { threads: next };
        }
        if (__DEV__) {
          console.log('[messagesStore] adding new thread', thread.matchId, {
            peerId: thread.peerId,
            peerName: thread.peerName,
            lastAt: thread.lastAt,
          });
        }
        return {
            threads: [thread, ...state.threads]
        };
    });
  },

  handleRealtimeMessage: (rec: any) => {
    const state = get();
    const existing = state.threads.find(t => t.matchId === rec.match_id);
    
    if (!existing) {
        console.warn('[messagesStore] Received message for unknown thread, refreshing...', rec.match_id);
        if (state.currentUserId) {
             void state.initialize(state.currentUserId, true, true); // silent refresh to avoid spinner
        }
        return;
    }
    
    if (__DEV__) {
      console.log('[messagesStore] realtime message', rec.match_id, {
        body: rec.body,
        sender: rec.sender_id,
        at: rec.created_at,
      });
    }

    set((state) => {
        const existing = state.threads.find(t => t.matchId === rec.match_id);
        if (!existing) return {}; 
        
        const isMyMessage = rec.sender_id === state.currentUserId;
        const hasUnread = !isMyMessage; 

        const updatedThread: Thread = {
            ...existing,
            lastMessage: rec.body ?? existing.lastMessage,
            lastAt: rec.created_at ?? existing.lastAt,
            hasUnread: hasUnread
        };
        
        const others = state.threads.filter(t => t.matchId !== rec.match_id);
        const nextThreads = [updatedThread, ...others].sort((a, b) => {
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
