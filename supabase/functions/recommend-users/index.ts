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
  elo_rating: number | null;
  match_allow_elo: boolean | null;
  hobby_embedding: string | null;
  hobbies_cipher: string | null;
  hobbies_iv: string | null;
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
  useElo?: boolean;
  useHobbies?: boolean;
};

type SimilarUser = {
  id: string;
  username: string | null;
  age_group: string | null;
  gender: string | null;
  character_group: string | null;
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
  const chunkSize = Math.max(10, Math.min(body.chunkSize ?? 400, 2000));
  const poolSizes = body.poolSizes && body.poolSizes.length > 0 ? body.poolSizes : [25, 50, 100, 200];

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
      .select('id, username, age_group, gender, character_group, pca_dim1, pca_dim2, pca_dim3, pca_dim4, elo_rating, match_allow_elo, hobby_embedding, hobbies_cipher, hobbies_iv')
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
    const shuffled = shuffle((candidates as ProfileRow[]) ?? []);
    const scored: SimilarUser[] = [];
    for (const c of shuffled) {
      const vec = buildVector(c);
      if (!vec) continue;
      if (matchedIds.has(c.id as string)) continue;
      
      const pcaSim = Math.max(0, Math.min(1, cosine(meVec, vec)));
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
          score = 0.6 * pcaSim + 0.15 * prox + 0.25 * hSim;
        } else {
          score = 0.7 * pcaSim + 0.3 * hSim;
        }
      }

      scored.push({
        id: c.id as string,
        username: c.username as string | null,
        age_group: c.age_group as string | null,
        gender: c.gender as string | null,
        character_group: c.character_group as string | null,
        similarity: score,
        elo_rating: c.elo_rating ?? null,
        score,
        hobby_score: hobbyScore,
        hobbies_cipher: c.hobbies_cipher,
        hobbies_iv: c.hobbies_iv
      });
    }

    const sorted = scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const pools = poolSizes.map((size) => ({
      size,
      users: finalResult(sorted, size),
      available: sorted.length >= size,
    }));

    // Helper for pool generation
    function finalResult(sortedUsers: SimilarUser[], size: number) {
        return sortedUsers.slice(0, size).map(s => ({ ...s, similarity: s.score ?? s.similarity, hobbies_cipher: s.hobbies_cipher, hobbies_iv: s.hobbies_iv }));
    }

    return json({
      requestId: reqId,
      elapsedMs: Date.now() - started,
      totalCandidates: scored.length,
      appliedFilters: filters,
      pools,
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
