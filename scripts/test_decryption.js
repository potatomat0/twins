
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gkbcdqpkjxdjjgolvgeg.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYmNkcXBranhkampnb2x2Z2VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1NjU5NCwiZXhwIjoyMDcyOTMyNTk0fQ.Exxt1zhg8qnNv260sJPefLrwdFf-XqB4QtAdm2EotO8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testDecryption() {
  console.log('Fetching mock user 01...');
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, hobbies_cipher, hobbies_iv')
    .eq('username', 'MockUser01')
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return;
  }

  console.log('Profile found:', { 
    id: profile.id, 
    username: profile.username, 
    hasCipher: !!profile.hobbies_cipher, 
    hasIv: !!profile.hobbies_iv 
  });

  if (!profile.hobbies_cipher || !profile.hobbies_iv) {
    console.log('No hobby data to decrypt.');
    return;
  }

  console.log('Attempting to decrypt via Edge Function...');
  const { data: decrypted, error: decryptError } = await supabase.functions.invoke('score-crypto', {
    body: {
      mode: 'decrypt',
      payload: profile.hobbies_cipher,
      iv: profile.hobbies_iv
    }
  });

  if (decryptError) {
    console.error('Decryption error:', decryptError);
    // Try raw fetch if invoke fails
    const res = await fetch(`${SUPABASE_URL}/functions/v1/score-crypto`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            mode: 'decrypt',
            payload: profile.hobbies_cipher,
            iv: profile.hobbies_iv
        })
    });
    const txt = await res.text();
    console.log('Raw fetch response:', txt);
  } else {
    console.log('Decrypted Hobbies:', decrypted);
  }
}

testDecryption();
