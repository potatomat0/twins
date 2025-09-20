// Supabase client singleton
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = (Constants?.expoConfig?.extra ?? {}) as any;
const SUPABASE_URL = extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] Missing config. Ensure app.json extra or EXPO_PUBLIC_ env vars are set.');
}

export const supabase = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
  auth: { persistSession: false },
});

export default supabase;

// Auth helpers (recommended over table-based password checks)
export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string, metadata?: Record<string, any>) {
  return supabase.auth.signUp({ email, password, options: { data: metadata } });
}

export async function signOut() {
  return supabase.auth.signOut();
}

// Profiles helpers (public.profiles)
export async function getCurrentUser() {
  return supabase.auth.getUser();
}

export type Profile = {
  id: string;
  username?: string | null;
  age_group?: string | null;
  gender?: string | null;
  personality_fingerprint?: number | null;
  character_group?: string | null;
};

export async function fetchProfile(id: string) {
  return supabase
    .from('profiles')
    .select('id, username, age_group, gender, personality_fingerprint, character_group')
    .eq('id', id)
    .maybeSingle();
}

export async function upsertProfile(profile: Profile) {
  // Requires RLS allowing owner id === auth.uid()
  return supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select('id, username, age_group, gender, personality_fingerprint, character_group')
    .single();
}

// Email OTP helpers (for when email confirmation is enabled)
export async function resendEmailOtp(email: string) {
  // Triggers sending a new confirmation code to the email for signup
  return supabase.auth.resend({ type: 'signup', email });
}

export async function verifyEmailOtp(email: string, token: string) {
  // Confirms the signup using the code from the email
  return supabase.auth.verifyOtp({ type: 'signup', email, token });
}

// View: public.my_profile exposes email joined from auth.users for the current user
export type MyProfile = {
  id: string;
  username: string | null;
  age_group: string | null;
  gender: string | null;
  personality_fingerprint: number | null;
  character_group: string | null;
  email: string | null;
};

export async function fetchMyProfile() {
  return supabase.from('my_profile').select('*').maybeSingle<MyProfile>();
}
