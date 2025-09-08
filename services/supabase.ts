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

export async function ensureUser(email: string, username?: string) {
  if (!email) return { ok: false, reason: 'missing-email' } as const;
  try {
    const { data, error } = await supabase
      .from('User')
      .select('id, email')
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error } as const;
    if (data?.id) return { ok: true, created: false, id: data.id } as const;
    const insert = { email, username: username ?? null } as any;
    const { data: created, error: e2 } = await supabase
      .from('User')
      .insert(insert)
      .select('id')
      .single();
    if (e2) return { ok: false, error: e2 } as const;
    return { ok: true, created: true, id: created?.id } as const;
  } catch (e) {
    return { ok: false, error: e } as const;
  }
}
