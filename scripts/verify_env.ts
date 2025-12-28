import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log('Attempting login with test user...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'similar_a@example.com',
    password: 'Test1234!',
  });

  if (error) {
    console.error('Login failed:', error.message);
    // Try creating a dummy client just to check connectivity
    console.log('Checking health via anon connection...');
    const { count, error: countErr } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (countErr) {
        // Expected RLS error maybe, or connection error
        console.log('Connection check result:', countErr.message);
    } else {
        console.log('Connection OK (Profiles count accessible?):', count);
    }
  } else {
    console.log('✅ Login successful!');
    console.log('User ID:', data.user.id);
    console.log('Session active.');
  }
}

main();
