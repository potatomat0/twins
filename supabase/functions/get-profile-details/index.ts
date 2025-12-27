import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL_REST');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[get-profile-details] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
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

serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (!supabase) {
    return json({ error: 'Server not configured' }, { status: 500 });
  }

  let body: { userId: string; targetId: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, targetId } = body ?? {};
  if (!userId || !targetId) {
    return json({ error: 'userId and targetId are required' }, { status: 400 });
  }

  try {
    // 1. Check permission:
    // User can see profile if:
    // - Self
    // - Match exists
    // - Target liked user (pending incoming like)
    // - User liked target (pending outgoing like - maybe?)
    // Let's implement robust check.

    if (userId === targetId) {
      // Self lookup - allowed
    } else {
      // Check match or pending like
      // "Match" is mutual like.
      // "Pending incoming" is target liked userId.
      const { data: checks, error: checkErr } = await supabase
        .from('match_events')
        .select('outcome')
        .eq('actor_id', targetId)
        .eq('target_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const { data: matches, error: matchErr } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user_a.eq.${userId},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${userId})`)
        .maybeSingle();

      const isMatched = !!matches;
      const isPendingIncoming = checks?.outcome === 'like';

      if (!isMatched && !isPendingIncoming) {
        // Not authorized to see full details (specifically hobbies)
        // Or maybe we allow basic info?
        // Explore screen allows seeing anyone in the deck.
        // But for direct lookup by ID, we should be strict or lenient?
        // "reuse explore swipe screen's logic": Explore uses SERVICE KEY to fetch candidates.
        // It filters out matches.
        // If we want to show profile for "Someone liked you", we MUST allow it.
        // If we want to show profile for "Message", we MUST allow it.
        // If we want to show profile for random lookup? Maybe not.
        
        // Let's allow it if authorized.
        // Wait, if I tap on a "Like" notification, I am "userId", liker is "targetId".
        // checks.outcome === 'like' will be TRUE. So authorized.
        
        // What if I tap on a "Match" notification? isMatched is TRUE. Authorized.
        
        return json({ error: 'Not authorized to view full profile' }, { status: 403 });
      }
    }

    // 2. Fetch Profile Details
    // Selecting same columns as recommend-users to ensure consistency (and avatars!)
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, username, age_group, gender, character_group, avatar_url, pca_dim1, pca_dim2, pca_dim3, pca_dim4, elo_rating, match_allow_elo, hobbies_cipher, hobbies_iv')
      .eq('id', targetId)
      .single();

    if (profErr || !profile) {
      console.error('[get-profile-details] fetch error', profErr);
      return json({ error: 'Profile not found' }, { status: 404 });
    }

    return json(profile);

  } catch (error) {
    console.error('[get-profile-details] internal error', error);
    return json({ error: 'Internal error' }, { status: 500 });
  }
});
