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
    set((state) => {
        const existing = state.threads.find(t => t.matchId === rec.match_id);
        
        // If we don't have the thread (rare race condition if match arrived same time),
        // we ideally should fetch it. For now, we assume addThread handles the match creation event.
        if (!existing) return {}; 
        
        const myId = supabase.auth.getUser(); // Synchronous check not avail here easily without async
        // We can infer "me" if we passed it, but easier logic:
        // hasUnread if receiver_id is ME (which implies sender_id is NOT me)
        // But we don't store 'me' in store.
        // Simplified: The caller (RealtimeManager) passes raw record. 
        // We assume we are the receiver if we didn't send it? 
        // Actually, RealtimeManager subscribes to receiver_id=eq.userId. So it IS for me.
        // Wait, self-sent messages (sender_id=eq.userId) also triggers.
        
        // Let's assume we rely on the client to know "me" or pass it. 
        // Or simply: hasUnread = rec.status !== 'seen' (and we trust logic elsewhere).
        // Actually, if I sent it, it's read.
        
        const updatedThread: Thread = {
            ...existing,
            lastMessage: rec.body ?? existing.lastMessage,
            lastAt: rec.created_at ?? existing.lastAt,
            hasUnread: true // Pending verification of sender?
            // Fix: We need to know if I am sender.
        };
        
        // Quick fix: Check if we are receiver.
        // We don't have userId here easily. 
        // Let's defer to the caller to set hasUnread? Or check payload structure.
        // If we are listening to `receiver_id=me`, then it IS unread.
        // If `sender_id=me`, it is NOT unread.
        
        // Let's make handleRealtimeMessage accept an optional 'isIncoming' flag
        return {};
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
