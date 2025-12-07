import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

type ProfileRow = {
  id: string;
  username: string | null;
  age_group: string | null;
  gender: string | null;
  character_group: string | null;
  pca_dim1: number | null;
  pca_dim2: number | null;
  pca_dim3: number | null;
  pca_dim4: number | null;
};

type Filters = {
  ageGroup?: boolean;
  gender?: boolean;
  characterGroup?: boolean;
};

type RequestBody = {
  userId: string;
  filters?: Filters;
  chunkSize?: number;
  poolSizes?: number[];
};

type SimilarUser = {
  id: string;
  username: string | null;
  age_group: string | null;
  gender: string | null;
  character_group: string | null;
  similarity: number;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL_REST');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[recommend-users] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...(init ?? {}),
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function buildVector(profile: ProfileRow): number[] | null {
  if (
    profile.pca_dim1 === null ||
    profile.pca_dim2 === null ||
    profile.pca_dim3 === null ||
    profile.pca_dim4 === null
  ) {
    return null;
  }
  return [profile.pca_dim1, profile.pca_dim2, profile.pca_dim3, profile.pca_dim4];
}

serve(async (req) => {
  const reqId = crypto.randomUUID();
  const started = Date.now();
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (!supabase) {
    return json({ error: 'Server not configured' }, { status: 500 });
  }
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const userId = body?.userId;
  if (!userId) {
    return json({ error: 'userId is required' }, { status: 400 });
  }

  const filters: Filters = body.filters ?? {};
  const chunkSize = Math.max(10, Math.min(body.chunkSize ?? 400, 2000));
  const poolSizes = body.poolSizes && body.poolSizes.length > 0 ? body.poolSizes : [25, 50, 100, 200];

  try {
    const { data: me, error: meErr } = await supabase
      .from('profiles')
      .select('id, username, age_group, gender, character_group, pca_dim1, pca_dim2, pca_dim3, pca_dim4')
      .eq('id', userId)
      .maybeSingle<ProfileRow>();
    if (meErr || !me) {
      console.error('[recommend-users]', reqId, 'fetch self error', meErr);
      return json({ error: 'User profile not found' }, { status: 404 });
    }
    const meVec = buildVector(me);
    if (!meVec) {
      return json({ error: 'User profile missing PCA data' }, { status: 400 });
    }

    let query = supabase
      .from('profiles')
      .select('id, username, age_group, gender, character_group, pca_dim1, pca_dim2, pca_dim3, pca_dim4')
      .neq('id', userId)
      .not('pca_dim1', 'is', null)
      .not('pca_dim2', 'is', null)
      .not('pca_dim3', 'is', null)
      .not('pca_dim4', 'is', null);

    if (filters.ageGroup && me.age_group) {
      query = query.eq('age_group', me.age_group);
    }
    if (filters.gender && me.gender) {
      query = query.eq('gender', me.gender);
    }
    if (filters.characterGroup && me.character_group) {
      query = query.eq('character_group', me.character_group);
    }

    // Fetch a manageable chunk; randomness applied in memory
    const { data: candidates, error: candErr } = await query.limit(chunkSize);
    if (candErr) {
      console.error('[recommend-users]', reqId, 'fetch candidates error', candErr);
      return json({ error: 'Failed to fetch candidates' }, { status: 500 });
    }
    const shuffled = shuffle(candidates ?? []);
    const scored: SimilarUser[] = [];
    for (const c of shuffled) {
      const vec = buildVector(c as ProfileRow);
      if (!vec) continue;
      const sim = cosine(meVec, vec);
      scored.push({
        id: c.id as string,
        username: c.username as string | null,
        age_group: c.age_group as string | null,
        gender: c.gender as string | null,
        character_group: c.character_group as string | null,
        similarity: Math.max(0, Math.min(1, sim)),
      });
    }

    const sorted = scored.sort((a, b) => b.similarity - a.similarity);
    const pools = poolSizes.map((size) => ({
      size,
      users: sorted.slice(0, size),
      available: sorted.length >= size,
    }));

    return json({
      requestId: reqId,
      elapsedMs: Date.now() - started,
      totalCandidates: scored.length,
      appliedFilters: filters,
      pools,
      sample: sorted.slice(0, 5),
    });
  } catch (error) {
    console.error('[recommend-users]', reqId, 'error', error);
    return json({ error: 'Internal error' }, { status: 500 });
  }
});
