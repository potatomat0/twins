import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const EMBED_URL = 'https://api.supa.ai/v1/embeddings';
const API_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const MODEL = 'gte-small';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing service role key' }), { status: 500 });
  }

  try {
    const body = await req.json();
    const input = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!input) {
      return new Response(JSON.stringify({ error: 'Text required' }), { status: 400 });
    }

    const resp = await fetch(EMBED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[embed] upstream error', resp.status, errText);
      return new Response(JSON.stringify({ error: 'Embedding request failed', details: errText }), {
        status: 502,
      });
    }

    const json = await resp.json();
    const embedding = json?.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      console.error('[embed] invalid embedding response', json);
      return new Response(JSON.stringify({ error: 'Invalid embedding response' }), { status: 502 });
    }

    return new Response(JSON.stringify({ embedding }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[embed] exception', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), { status: 500 });
  }
});
