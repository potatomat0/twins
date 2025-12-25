
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gkbcdqpkjxdjjgolvgeg.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYmNkcXBranhkampnb2x2Z2VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1NjU5NCwiZXhwIjoyMDcyOTMyNTk0fQ.Exxt1zhg8qnNv260sJPefLrwdFf-XqB4QtAdm2EotO8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function createSingleUser() {
  const email = `nlp_test_user_${Date.now()}@example.com`;
  const password = 'Matkhautwins1!';
  const hobbies = "Swimming, Coding, Anime";

  console.log(`Creating user ${email}...`);

  // 1. Create Auth
  const { data: u, error: uErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (uErr) {
    console.error('Auth create failed:', uErr);
    return;
  }
  const userId = u.user.id;
  console.log(`User created: ${userId}`);

  // 2. Generate Embedding (The Real Test)
  console.log('Generating embedding via Edge Function...');
  const { data: embedData, error: embedErr } = await supabase.functions.invoke('embed', {
    body: { text: hobbies }
  });

  if (embedErr) {
    console.error('❌ Embed FAILED:', embedErr);
    // Try to get logs via error message if available
    return;
  }

  if (!embedData?.embedding || embedData.embedding.length !== 384) {
     console.error('❌ Embed returned invalid data:', embedData);
     return;
  }

  console.log('✅ Embed SUCCESS! Vector length:', embedData.embedding.length);

  // 3. Save Profile
  console.log('Saving profile...');
  const { error: dbErr } = await supabase.from('profiles').upsert({
    id: userId,
    username: 'NLP_Tester',
    hobby_embedding: JSON.stringify(embedData.embedding),
    // ... skipping other fields for brevity ...
  });

  if (dbErr) {
    console.error('DB Upsert failed:', dbErr);
  } else {
    console.log('✅ Profile saved with AI embedding.');
  }
}

createSingleUser();
