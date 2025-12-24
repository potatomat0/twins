import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL_REST');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

type NotifyBody = {
  recipientId: string;
  actorId?: string | null;
  type: 'like' | 'mutual' | 'message';
  payload?: Record<string, unknown>;
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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[notify] Missing SUPABASE_URL or SERVICE KEY');
}

const supabase = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  if (!supabase) return json({ error: 'Server not configured' }, { status: 500 });

  let body: NotifyBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { recipientId, actorId = null, type, payload } = body ?? {};
  if (!recipientId || !type) return json({ error: 'recipientId and type are required' }, { status: 400 });
  if (type !== 'like' && type !== 'mutual' && type !== 'message') {
    return json({ error: 'Invalid type' }, { status: 400 });
  }

  // Deduplicate message notifications by actor/recipient (keep latest only)
  if (type === 'message' && actorId) {
    const { error: delError, count } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .eq('recipient_id', recipientId)
      .eq('actor_id', actorId)
      .eq('type', 'message');
    
    if (delError) {
      console.error('[notify] delete error', delError);
    } else if (count && count > 0) {
      console.log('[notify] deleted duplicates', count);
    }
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: recipientId,
      actor_id: actorId,
      type,
      payload: payload ?? {},
    })
    .select('id, created_at')
    .single();

  if (error) {
    console.error('[notify] insert error', error);
    return json({ error: 'Insert failed', details: error.message }, { status: 500 });
  }

  console.log('[notify] inserted', { recipientId, actorId, type, notificationId: data?.id });

  return json({ ok: true, notificationId: data?.id, createdAt: data?.created_at });
});
