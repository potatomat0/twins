import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

type ProfileRow = {
  id: string;
  username: string | null;
  age_group: string | null;
  gender: string | null;
  character_group: string | null;
  avatar_url: string | null;
  pca_dim1: number | null;
  pca_dim2: number | null;
  pca_dim3: number | null;
  pca_dim4: number | null;
  elo_rating: number | null;
  match_allow_elo: boolean | null;
  hobby_embedding: string | null;
  hobbies_cipher: string | null;
  hobbies_iv: string | null;
};

type Filters = {
  ageGroups?: string[];
  genders?: string[];
  archetype?: 'most' | 'least'; // most similar (default) or least similar
};

type RequestBody = {
  userId: string;
  filters?: Filters;
  // Pagination
  offset?: number;
  pageSize?: number;
  // Optionally exclude already shown ids (client-managed dedupe)
  excludeIds?: string[];
  useElo?: boolean;
  useHobbies?: boolean;
};

type SimilarUser = {
  id: string;
  username: string | null;
  age_group: string | null;
  gender: string | null;
  character_group: string | null;
  avatar_url?: string | null;
  similarity: number;
  elo_rating?: number | null;
  score?: number;
  hobby_score?: number;
  hobbies_cipher?: string | null;
  hobbies_iv?: string | null;
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

function eloProximity(rA: number, rB: number, sigma = 400) {
  const diff = Math.abs(rA - rB);
  return Math.exp(-diff / sigma);
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
  } catch (e) {
    console.error('[recommend-users]', reqId, 'json parse error', e);
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const userId = body?.userId;
  if (!userId) {
    console.error('[recommend-users]', reqId, 'missing userId');
    return json({ error: 'userId is required' }, { status: 400 });
  }

  const filters: Filters = body.filters ?? {};
  const useElo = body.useElo ?? true;
  const useHobbies = body.useHobbies ?? false;
  const offset = Math.max(0, body.offset ?? 0);
  const pageSize = Math.max(10, Math.min(body.pageSize ?? 25, 100));
  const excludeIds = new Set<string>(body.excludeIds ?? []);
  // Fetch enough to cover the requested window; cap to keep memory sane
  const chunkSize = Math.max(pageSize + offset, 400);
  const cappedChunkSize = Math.min(chunkSize, 2000);

  try {
    const { data: me, error: meErr } = await supabase
      .from('profiles')
      .select('id, username, age_group, gender, character_group, pca_dim1, pca_dim2, pca_dim3, pca_dim4, elo_rating, match_allow_elo, hobby_embedding, hobbies_cipher, hobbies_iv')
      .eq('id', userId)
      .maybeSingle<ProfileRow>();
    if (meErr || !me) {
      console.error('[recommend-users]', reqId, 'fetch self error', meErr);
      return json({ error: 'User profile not found' }, { status: 404 });
    }
    const meVec = buildVector(me);
    if (!meVec) {
      console.error('[recommend-users]', reqId, 'missing pca data for user', userId, 'pca_dim1=', me.pca_dim1);
      return json({ error: 'User profile missing PCA data' }, { status: 400 });
    }
    const meElo = me.elo_rating ?? 1200;
    const allowElo = useElo && (me.match_allow_elo ?? true);
    
    // Parse hobby embedding if needed
    let meHobbyVec: number[] | null = null;
    if (useHobbies && me.hobby_embedding) {
      try {
        meHobbyVec = JSON.parse(me.hobby_embedding);
      } catch {
        // ignore
      }
    }

    // Fetch matches to exclude already-matched users
    const { data: matchRows, error: matchErr } = await supabase
      .from('matches')
      .select('user_a, user_b')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);
    const matchedIds = new Set<string>();
    if (matchRows) {
      for (const m of matchRows) {
        if (m.user_a === userId) matchedIds.add(m.user_b as string);
        else if (m.user_b === userId) matchedIds.add(m.user_a as string);
      }
    }
    if (matchErr) {
      console.error('[recommend-users]', reqId, 'match fetch error', matchErr);
    }

    let query = supabase
      .from('profiles')
      .select('id, username, age_group, gender, character_group, avatar_url, pca_dim1, pca_dim2, pca_dim3, pca_dim4, elo_rating, match_allow_elo, hobby_embedding, hobbies_cipher, hobbies_iv')
      .neq('id', userId)
      .not('pca_dim1', 'is', null)
      .not('pca_dim2', 'is', null)
      .not('pca_dim3', 'is', null)
      .not('pca_dim4', 'is', null);

    if (filters.ageGroups && filters.ageGroups.length > 0) {
      query = query.in('age_group', filters.ageGroups);
    }
    if (filters.genders && filters.genders.length > 0) {
      query = query.in('gender', filters.genders);
    }

    // Fetch a manageable chunk; randomness applied in memory
    const { data: candidates, error: candErr } = await query.limit(chunkSize);
    if (candErr) {
      console.error('[recommend-users]', reqId, 'fetch candidates error', candErr);
      return json({ error: 'Failed to fetch candidates' }, { status: 500 });
    }
    const shuffled = (candidates as ProfileRow[]) ?? [];
    const scored: SimilarUser[] = [];
    for (const c of shuffled) {
      const vec = buildVector(c);
      if (!vec) continue;
      if (matchedIds.has(c.id as string)) continue;
      if (excludeIds.has(c.id as string)) continue;
      
      let pcaSim = Math.max(0, Math.min(1, cosine(meVec, vec)));
      if (filters.archetype === 'least') {
        pcaSim = Math.max(0, Math.min(1, 1 - pcaSim));
      }
      let score = pcaSim;
      let eloScore = 0;
      let hobbyScore = 0;

      if (!useHobbies) {
        if (allowElo) {
          const cElo = c.elo_rating ?? 1200;
          const prox = eloProximity(meElo, cElo);
          score = 0.8 * pcaSim + 0.2 * prox;
        } else {
          score = pcaSim;
        }
      } else {
        // Hobbies ENABLED
        let hSim = 0.5; // Default neutral
        if (meHobbyVec && c.hobby_embedding) {
           let cHobbyVec: number[] | null = null;
           try {
              cHobbyVec = JSON.parse(c.hobby_embedding);
           } catch {}
           if (cHobbyVec) {
              hSim = Math.max(0, Math.min(1, cosine(meHobbyVec, cHobbyVec)));
           }
        }
        hobbyScore = hSim;

        if (allowElo) {
          const cElo = c.elo_rating ?? 1200;
          const prox = eloProximity(meElo, cElo);
          eloScore = prox;
          // Increase hobby weight: PCA 50%, ELO 20%, Hobbies 30%
          score = 0.5 * pcaSim + 0.2 * prox + 0.3 * hSim;
        } else {
          // Without ELO: PCA 55%, Hobbies 45%
          score = 0.55 * pcaSim + 0.45 * hSim;
        }
      }

      scored.push({
        id: c.id as string,
        username: c.username as string | null,
        age_group: c.age_group as string | null,
        gender: c.gender as string | null,
        character_group: c.character_group as string | null,
        avatar_url: c.avatar_url as string | null,
        similarity: score,
        elo_rating: c.elo_rating ?? null,
        score,
        hobby_score: hobbyScore,
        hobbies_cipher: c.hobbies_cipher,
        hobbies_iv: c.hobbies_iv
      });
    }

    const sorted = scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const page = sorted.slice(offset, offset + pageSize).map((s) => ({
      ...s,
      similarity: s.score ?? s.similarity,
      hobbies_cipher: s.hobbies_cipher,
      hobbies_iv: s.hobbies_iv,
    }));
    const total = sorted.length;
    const hasMore = offset + pageSize < total;
    const exhausted = total === 0;

    return json({
      requestId: reqId,
      elapsedMs: Date.now() - started,
      totalCandidates: total,
      appliedFilters: filters,
      users: page,
      hasMore,
      exhausted,
      sample: sorted.slice(0, 5),
      usedElo: allowElo,
      usedHobbies: useHobbies,
      excludedMatches: matchedIds.size,
    });
  } catch (error) {
    console.error('[recommend-users]', reqId, 'error', error);
    return json({ error: 'Internal error' }, { status: 500 });
  }
});
