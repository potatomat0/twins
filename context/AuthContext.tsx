import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import supabase, { fetchProfile, type Profile } from '@services/supabase';

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (targetUser: User | null) => {
    if (!targetUser?.id) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await fetchProfile(targetUser.id);
      if (error) {
        if (__DEV__) console.warn('[auth] profile fetch error', error);
        setProfile(null);
      } else {
        setProfile((data as Profile) ?? null);
      }
    } catch (err) {
      if (__DEV__) console.warn('[auth] profile fetch exception', err);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error) {
          if (__DEV__) console.warn('[auth] getSession error', error);
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          setSession(data.session ?? null);
          setUser(data.session?.user ?? null);
          await loadProfile(data.session?.user ?? null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);
      void loadProfile(currentUser);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription?.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      if (__DEV__) console.warn('[auth] signOut error', error);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      loading,
      signOut,
      refreshProfile,
    }),
    [user, profile, session, loading, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
