import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

if (!SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL in .env');
}

const EDGE_BASE = `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`;

async function callEdge(name: string, payload: unknown) {
  const url = `${EDGE_BASE}/${name}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  return {
    status: res.status,
    ok: res.ok,
    body: text.slice(0, 300),
  };
}

async function run() {
  console.log('=== EDGE INFERENCE PROBE (Base URL + Payload Only) ===');
  console.log(`Target: ${EDGE_BASE}`);
  console.log('Scenario: attacker only knows edge base URL and payload shape.');

  const recommendPayload = {
    userId: '00000000-0000-0000-0000-000000000000',
    filters: { ageGroups: ['18-24'], genders: ['Male', 'Female'] },
    offset: 0,
    pageSize: 5,
    useElo: true,
    useHobbies: true,
  };

  const rec = await callEdge('recommend-users', recommendPayload);
  console.log('[recommend-users] status:', rec.status, 'ok:', rec.ok);
  console.log('[recommend-users] body:', rec.body || '(empty)');

  const embedPayload = { text: 'Hiking, Anime' };
  const embed = await callEdge('embed', embedPayload);
  console.log('[embed] status:', embed.status, 'ok:', embed.ok);
  console.log('[embed] body:', embed.body || '(empty)');

  console.log('Expectation: requests should be rejected without auth.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
