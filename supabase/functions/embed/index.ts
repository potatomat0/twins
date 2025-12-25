import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Deterministic mock embedding generator
// This allows the app flow (save hobbies, match users) to be fully tested
// without crashing the limited Edge Runtime with heavy ML models.
function mockEmbed(text: string): number[] {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    const rng = () => {
        var t = hash += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    const vec: number[] = [];
    for (let i = 0; i < 384; i++) {
        vec.push(rng() * 2 - 1); // -1 to 1
    }
    // Normalize
    const mag = Math.sqrt(vec.reduce((sum, v) => sum + v*v, 0));
    return vec.map(v => v / mag);
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { text } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ error: 'Text required' }), { status: 400 });
    }

    const embedding = mockEmbed(text.toLowerCase().trim());

    return new Response(JSON.stringify({ embedding }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});