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
  addThread: (thread: Thread) => void;
  handleRealtimeMessage: (message: any) => void;
  setThreads: (threads: Thread[]) => void;
  markRead: (matchId: string) => void;
};

export const useMessagesStore = create<MessagesState>((set, get) => ({
  threads: [],
  loading: false,
  initialized: false,

  initialize: async (userId: string) => {
    if (get().initialized) return;
    set({ loading: true });

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

      const sorted = threads.sort((a, b) => {
        if (!a.lastAt) return 1;
        if (!b.lastAt) return -1;
        return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
      });

      set({ threads: sorted, loading: false, initialized: true });

    } catch (err) {
      console.warn('[messagesStore] init error', err);
      set({ loading: false });
    }
  },

  reset: () => {
    set({ threads: [], initialized: false });
  },

  addThread: async (thread: Thread) => {
    // Note: thread passed here usually has null name/avatar if coming from RealtimeManager
    // We should fetch profile here if missing, or ensure caller did.
    // The RealtimeManager fetches profile before calling this.
    set((state) => {
        // Prevent duplicates
        if (state.threads.some(t => t.matchId === thread.matchId)) return {};
        
        return {
            threads: [thread, ...state.threads]
        };
    });
  },

  handleRealtimeMessage: (rec: any) => {
    const state = get();
    const existing = state.threads.find(t => t.matchId === rec.match_id);
    
    if (!existing) {
        // Thread missing (rare race condition or match synced later). 
        // Force refresh to pull it in.
        // We can't easily construct it without profile fetch, so re-init is safest.
        // But re-init is heavy. 
        // Let's assume RealtimeManager's handleNewMatch will fire soon or has fired.
        // If not, we might be out of sync.
        // A simple fetch of this single match would be better, but for now:
        console.warn('[messagesStore] Received message for unknown thread, refreshing...', rec.match_id);
        const currentUser = supabase.auth.getUser().then(({ data }) => {
             if (data.user?.id) get().initialize(data.user.id);
        });
        return;
    }
    
    set((state) => {
        const existing = state.threads.find(t => t.matchId === rec.match_id);
        if (!existing) return {}; 
        
        const updatedThread: Thread = {
            ...existing,
            lastMessage: rec.body ?? existing.lastMessage,
            lastAt: rec.created_at ?? existing.lastAt,
            hasUnread: rec.sender_id !== existing.peerId // If I am sender, it is read? No, sender_id IS peerId if incoming.
            // Wait, if I receive a message, sender_id IS the peer.
            // If sender_id === peerId, it is UNREAD (unless I am looking at it).
            // Logic: hasUnread = (rec.sender_id === peerId)
        };
        
        // Correct unread logic:
        // If the message sender is the peer, then I have an unread message.
        // If the message sender is ME, I do not have an unread message.
        // We don't have 'myId' easily here.
        // But we know 'peerId'.
        if (rec.sender_id === existing.peerId) {
            updatedThread.hasUnread = true;
        } else {
            updatedThread.hasUnread = false;
        }
        
        const others = state.threads.filter(t => t.matchId !== rec.match_id);
        const nextThreads = [updatedThread, ...others].sort((a, b) => {
            if (!a.lastAt) return 1;
            if (!b.lastAt) return -1;
            return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
        });
        
        return { threads: nextThreads };
    });
  },

  updateThread: (matchId, updates) => {
    set((state) => {
      const existing = state.threads.find(t => t.matchId === matchId);
      if (!existing) return {};
      
      const updated = { ...existing, ...updates };
      const others = state.threads.filter(t => t.matchId !== matchId);
      
      // Re-sort
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
