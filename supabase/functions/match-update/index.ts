import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL_REST');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const K_FACTOR = 24;

type ProfileRow = {
  id: string;
  elo_rating: number | null;
  match_allow_elo: boolean | null;
};

type RequestBody = {
  actorId: string;
  targetId: string;
  outcome: 'like' | 'skip';
};

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...(init ?? {}),
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

function expectedScore(rA: number, rB: number) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function updateRatings(rA: number, rB: number, outcome: 'like' | 'skip', k = K_FACTOR) {
  const Sa = outcome === 'like' ? 1 : 0;
  const Ea = expectedScore(rA, rB);
  const Eb = expectedScore(rB, rA);
  const newA = rA + k * (Sa - Ea);
  const newB = rB + k * ((1 - Sa) - Eb);
  return { newA, newB };
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[match-update] Missing SUPABASE_URL or SERVICE_KEY');
}

const supabase = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  if (!supabase) return json({ error: 'Server not configured' }, { status: 500 });

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { actorId, targetId, outcome } = body ?? {};
  if (!actorId || !targetId || !outcome) return json({ error: 'actorId, targetId and outcome are required' }, { status: 400 });
  if (actorId === targetId) return json({ error: 'actor and target must differ' }, { status: 400 });
  if (outcome !== 'like' && outcome !== 'skip') return json({ error: 'Invalid outcome' }, { status: 400 });

  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, elo_rating, match_allow_elo')
    .in('id', [actorId, targetId])
    .returns<ProfileRow[]>();
  if (profErr) return json({ error: 'Failed to load profiles', details: profErr.message }, { status: 500 });
  if (!profiles || profiles.length !== 2) return json({ error: 'Profiles not found' }, { status: 404 });

  const actor = profiles.find((p) => p.id === actorId)!;
  const target = profiles.find((p) => p.id === targetId)!;
  const allowElo = (actor.match_allow_elo ?? true) && (target.match_allow_elo ?? true);
  const rA = actor.elo_rating ?? 1200;
  const rB = target.elo_rating ?? 1200;

  let newA = rA;
  let newB = rB;
  if (allowElo) {
    const updated = updateRatings(rA, rB, outcome);
    newA = updated.newA;
    newB = updated.newB;
    const { error: upErr } = await supabase
      .from('profiles')
      .upsert([
        { id: actorId, elo_rating: newA },
        { id: targetId, elo_rating: newB },
      ]);
    if (upErr) {
      console.error('[match-update] upsert elo error', upErr);
    }
  }

  // Log event
  const { error: logErr } = await supabase.from('match_events').insert({
    actor_id: actorId,
    target_id: targetId,
    outcome,
  });
  if (logErr) {
    console.error('[match-update] log event error', logErr);
  }

  console.log(
    `[match-update] actor ${actorId} (${rA.toFixed(2)} -> ${newA.toFixed(2)}) ` +
      `target ${targetId} (${rB.toFixed(2)} -> ${newB.toFixed(2)}) outcome=${outcome} allowElo=${allowElo}`,
  );

  return json({
    eloUpdated: allowElo,
    actor: { id: actorId, elo: newA },
    target: { id: targetId, elo: newB },
  });
});
