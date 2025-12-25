import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gkbcdqpkjxdjjgolvgeg.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYmNkcXBranhkampnb2x2Z2VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1NjU5NCwiZXhwIjoyMDcyOTMyNTk0fQ.Exxt1zhg8qnNv260sJPefLrwdFf-XqB4QtAdm2EotO8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testVectors() {
  const email1 = 'vector_test_a@example.com';
  const email2 = 'vector_test_b@example.com';
  const hobbyText = 'Reading, Swimming, Art';

  console.log(`Creating test users with hobbies: "${hobbyText}"`);

  // 1. Create Users
  const { data: u1 } = await supabase.auth.admin.createUser({ email: email1, password: 'Matkhautwins1!', email_confirm: true });
  const { data: u2 } = await supabase.auth.admin.createUser({ email: email2, password: 'Matkhautwins1!', email_confirm: true });

  const id1 = u1?.user?.id;
  const id2 = u2?.user?.id;

  if (!id1 || !id2) {
      console.log('User creation failed (might already exist), fetching IDs...');
      const { data: list } = await supabase.auth.admin.listUsers();
      const user1 = list.users.find(u => u.email === email1);
      const user2 = list.users.find(u => u.email === email2);
      if (user1 && user2) {
          await runComparison(user1.id, user2.id, hobbyText);
      } else {
          console.error('Could not get IDs');
      }
      return;
  }

  await runComparison(id1, id2, hobbyText);
}

async function runComparison(id1: string, id2: string, text: string) {
    console.log(`Generating embedding for User A (${id1})...`);
    const { data: embed1, error: err1 } = await supabase.functions.invoke('embed', { body: { text } });
    if (err1) console.error('Embed A error:', err1);

    console.log(`Generating embedding for User B (${id2})...`);
    const { data: embed2, error: err2 } = await supabase.functions.invoke('embed', { body: { text } });
    if (err2) console.error('Embed B error:', err2);

    const vec1 = embed1?.embedding;
    const vec2 = embed2?.embedding;

    if (!vec1 || !vec2) {
        console.error('Missing vector data');
        return;
    }

    console.log('\n--- Vector Analysis ---');
    console.log(`Vector A length: ${vec1.length}`);
    console.log(`Vector B length: ${vec2.length}`);
    console.log(`Vector A [0..4]: ${JSON.stringify(vec1.slice(0, 5))}`);
    console.log(`Vector B [0..4]: ${JSON.stringify(vec2.slice(0, 5))}`);

    // Cosine Similarity
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < vec1.length; i++) {
        dot += vec1[i] * vec2[i];
        na += vec1[i] * vec1[i];
        nb += vec2[i] * vec2[i];
    }
    const sim = dot / (Math.sqrt(na) * Math.sqrt(nb));
    console.log(`\nCosine Similarity: ${sim.toFixed(6)}`);

    if (sim > 0.9999) {
        console.log('✅ SUCCESS: Vectors are identical. Model is deterministic.');
    } else {
        console.log('❌ FAILURE: Vectors differ. Model is non-deterministic or mismatch occurred.');
    }

    // Upsert to DB to test persistence
    console.log('\nSaving to DB...');
    await supabase.from('profiles').upsert({ id: id1, hobby_embedding: JSON.stringify(vec1) });
    await supabase.from('profiles').upsert({ id: id2, hobby_embedding: JSON.stringify(vec2) });
    console.log('Saved.');
}

testVectors();
