import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0';

const modelName = 'Supabase/gte-small'; // Using a smaller model optimized for Edge

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Text required' }), { status: 400 });
    }

    // Initialize pipeline
    // NOTE: In production, caching logic or using a dedicated inference server is better
    // This downloads the model on cold starts, which might be slow.
    // For this prototype, we rely on Deno's caching or the library's handling.
    const extractor = await pipeline('feature-extraction', modelName);

    const output = await extractor(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);

    return new Response(JSON.stringify({ embedding }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[embed] error', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
