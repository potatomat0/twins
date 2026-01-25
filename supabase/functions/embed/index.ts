import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Jina embeddings (preferred; works on free tier)
const JINA_TOKEN = Deno.env.get('JINA_API_KEY');
const JINA_MODEL = Deno.env.get('JINA_EMBED_MODEL') ?? 'jina-embeddings-v3';
const JINA_URL = 'https://api.jina.ai/v1/embeddings';
const TARGET_DIM = Number(Deno.env.get('EMBED_DIM') ?? '384');

// Supabase AI fallback (requires AI key / paid tier)
const EMBED_URL =
  Deno.env.get('SUPABASE_AI_EMBED_URL') ??
  'https://api.supabase.com/v1/ai/embeddings';

// Prefer a dedicated embed key to avoid the SUPABASE_* prefix restriction on secrets.
// Fallbacks retained for convenience.
const API_KEY =
  Deno.env.get('EMBED_API_KEY') ||
  Deno.env.get('SUPABASE_AI_KEY') ||
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  Deno.env.get('SUPABASE_SERVICE_KEY');

const MODEL = 'gte-small';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL_REST');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_PUBLIC_KEY');
const supabaseAuth =
  SUPABASE_URL && ANON_KEY
    ? createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
    : null;

function extractBearer(req: Request) {
  const header = req.headers.get('Authorization') ?? '';
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  if (!supabaseAuth) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 });
  }
  const token = extractBearer(req);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const { data: authData, error: authErr } = await supabaseAuth.auth.getUser(token);
  if (authErr || !authData?.user?.id) {
    console.error('[embed] auth error', authErr);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  if (!JINA_TOKEN && !API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing embedding key. Set JINA_API_KEY (preferred) or EMBED_API_KEY for Supabase AI.' }),
      { status: 500 },
    );
  }

  try {
    const body = await req.json();
    const input = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!input) {
      return new Response(JSON.stringify({ error: 'Text required' }), { status: 400 });
    }

    // 1) Jina path if token is present
    if (JINA_TOKEN) {
      console.log('[embed] calling Jina model:', JINA_MODEL);
      const resp = await fetch(JINA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${JINA_TOKEN}`,
        },
        body: JSON.stringify({
          input: [input],
          model: JINA_MODEL,
          dimensions: TARGET_DIM > 0 ? TARGET_DIM : undefined,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('[embed] Jina API error', {
          status: resp.status,
          statusText: resp.statusText,
          errText,
          url: JINA_URL,
        });
        return new Response(
          JSON.stringify({ error: 'Embedding request failed', details: errText, status: resp.status }),
          { status: resp.status >= 500 ? 502 : resp.status },
        );
      }

      const json = await resp.json();
      const embedding = json?.data?.[0]?.embedding;
      if (!embedding || !Array.isArray(embedding)) {
        console.error('[embed] invalid Jina response structure', {
          json: JSON.stringify(json).slice(0, 200),
        });
        return new Response(
          JSON.stringify({ error: 'Invalid embedding response format', received: typeof json }),
          { status: 502 },
        );
      }

      console.log('[embed] Jina success, embedding length:', (embedding as number[]).length);
      return new Response(JSON.stringify({ embedding }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2) Supabase AI fallback
    const resp = await fetch(EMBED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        apikey: API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        input,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[embed] upstream error (supabase)', { status: resp.status, errText });
      return new Response(JSON.stringify({ error: 'Embedding request failed', details: errText }), {
        status: resp.status,
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
