import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import supabase from '@services/supabase';
import { useAuth } from '@context/AuthContext';

export type SimilarUser = {
  id: string;
  username: string | null;
  age_group: string | null;
  gender: string | null;
  character_group: string | null;
  avatar_url?: string | null;
  similarity: number;
  elo_rating?: number | null;
  score?: number;
  hobby_score?: number;
  hobbies_cipher?: string | null;
  hobbies_iv?: string | null;
};

export type Filters = {
  ageGroups: string[];
  genders: string[];
  archetype: 'most' | 'least';
};

type RecommendationState = {
  deck: SimilarUser[];
  loading: boolean;
  initialLoading: boolean;
  hasMore: boolean;
  exhausted: boolean;
  filters: Filters;
  useHobbies: boolean;
  setFilters: (f: Filters) => void;
  setUseHobbies: (v: boolean) => void;
  loadMore: () => Promise<void>;
  removeCard: (userId: string) => void;
  reset: () => Promise<void>;
};

const RecommendationContext = createContext<RecommendationState | null>(null);

export const RecommendationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [deck, setDeck] = useState<SimilarUser[]>([]);
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [filters, setFilters] = useState<Filters>({ ageGroups: [], genders: [], archetype: 'most' });
  const [useHobbies, setUseHobbies] = useState(false);

  const useElo = profile?.match_allow_elo ?? true;
  const hasEnoughHobbies = !!profile?.hobbies_cipher;

  const loadMore = useCallback(async (resetState = false) => {
    if (!user?.id) return;
    if (!resetState && (loading || exhausted)) return;

    setLoading(true);
    try {
      const currentOffset = resetState ? 0 : deck.length;
      const currentExclude = resetState ? [] : Array.from(shownIds);

      const { data, error: fnErr } = await supabase.functions.invoke('recommend-users', {
        body: {
          userId: user.id,
          filters,
          offset: currentOffset,
          pageSize: 20,
          excludeIds: currentExclude,
          useElo,
          useHobbies: useHobbies && hasEnoughHobbies,
        },
      });
      if (fnErr) throw fnErr;
      const users = (data?.users ?? []) as SimilarUser[];
      
      if (resetState) {
        setDeck(users);
        setShownIds(new Set(users.map((u) => u.id)));
      } else {
        setDeck((prev) => [...prev, ...users]);
        setShownIds((prev) => {
          const next = new Set(prev);
          users.forEach((u) => next.add(u.id));
          return next;
        });
      }
      
      setHasMore(data?.hasMore ?? false);
      setExhausted(data?.exhausted ?? false);
    } catch (err) {
      console.error('[recommendations] loadMore error', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [user?.id, loading, exhausted, deck.length, filters, useElo, useHobbies, hasEnoughHobbies, shownIds]);

  const removeCard = useCallback(
    (userId: string) => {
      setDeck((prev) => {
        const next = prev.filter((u) => u.id !== userId);
        return next;
      });
      if (deck.length <= 5 && hasMore && !loading) {
        void loadMore();
      }
    },
    [deck.length, hasMore, loading, loadMore],
  );

  const reset = useCallback(async () => {
    setInitialLoading(true);
    await loadMore(true);
  }, [loadMore]);

  useEffect(() => {
    if (!user?.id) return;
    // Initial load
    void reset();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialLoading) {
      void reset();
    }
  }, [filters, useHobbies]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(
    () => ({
      deck,
      loading,
      initialLoading,
      hasMore,
      exhausted,
      filters,
      useHobbies,
      setFilters,
      setUseHobbies,
      loadMore,
      removeCard,
      reset,
    }),
    [deck, loading, initialLoading, hasMore, exhausted, filters, useHobbies, loadMore, removeCard, reset],
  );

  return <RecommendationContext.Provider value={value}>{children}</RecommendationContext.Provider>;
};

export const useRecommendations = () => {
  const ctx = useContext(RecommendationContext);
  if (!ctx) throw new Error('useRecommendations must be used within RecommendationProvider');
  return ctx;
};
