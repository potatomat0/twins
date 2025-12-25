// Supabase client singleton
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const extra = (Constants?.expoConfig?.extra ?? {}) as any;
const SUPABASE_URL = extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const rawEmailVerificationRequired =
  extra.supabaseRequireEmailVerification ??
  process.env.EXPO_PUBLIC_SUPABASE_REQUIRE_EMAIL_VERIFICATION;
export const requiresEmailVerification =
  typeof rawEmailVerificationRequired === 'boolean'
    ? rawEmailVerificationRequired
    : `${rawEmailVerificationRequired ?? 'true'}`.toLowerCase() !== 'false';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] Missing config. Ensure app.json extra or EXPO_PUBLIC_ env vars are set.');
}

export const supabase = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: AsyncStorage as any,
  },
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
  avatar_url?: string | null;
  elo_rating?: number | null;
  match_allow_elo?: boolean | null;
  personality_fingerprint?: number | null;
  character_group?: string | null;
  pca_dim1?: number | null;
  pca_dim2?: number | null;
  pca_dim3?: number | null;
  pca_dim4?: number | null;
  b5_cipher?: string | null;
  b5_iv?: string | null;
  hobbies?: string[] | null;
  hobby_embedding?: string | null;
  hobbies_cipher?: string | null;
  hobbies_iv?: string | null;
};

export async function fetchProfile(id: string) {
  return supabase
    .from('profiles')
    .select(
      'id, username, age_group, gender, avatar_url, elo_rating, match_allow_elo, personality_fingerprint, character_group, pca_dim1, pca_dim2, pca_dim3, pca_dim4, b5_cipher, b5_iv, hobbies_cipher, hobbies_iv',
    )
    .eq('id', id)
    .maybeSingle();
}

export async function upsertProfile(profile: Profile) {
  // Clean payload: remove fields that don't exist in DB or shouldn't be written directly
  const payload = { ...profile };
  delete (payload as any).hobbies;

  // Requires RLS allowing owner id === auth.uid()
  return supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select(
      'id, username, age_group, gender, avatar_url, elo_rating, match_allow_elo, personality_fingerprint, character_group, pca_dim1, pca_dim2, pca_dim3, pca_dim4, b5_cipher, b5_iv, hobbies_cipher, hobbies_iv',
    )
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
  avatar_url: string | null;
  personality_fingerprint: number | null;
  character_group: string | null;
  email: string | null;
  email_confirmed_at: string | null;
};

export async function fetchMyProfile() {
  return supabase.from('my_profile').select('*').maybeSingle<MyProfile>();
}
