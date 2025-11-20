import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

type Scores = Record<string, number>;

function toBytes(str: string) {
  return new TextEncoder().encode(str);
}

function fromBase64(b64: string) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function toBase64(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  arr.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

async function importKey() {
  const secret = Deno.env.get('B5_ENCRYPTION_KEY');
  if (!secret) {
    throw new Error('Missing B5_ENCRYPTION_KEY secret');
  }
  const keyBytes = fromBase64(secret);
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encrypt(scores: Scores) {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = toBytes(JSON.stringify(scores));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
  return { cipher: toBase64(cipher), iv: toBase64(iv) };
}

async function decrypt(cipherText: string, ivB64: string) {
  const key = await importKey();
  const cipherBytes = fromBase64(cipherText);
  const iv = fromBase64(ivB64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
  const decoded = new TextDecoder().decode(plain);
  return JSON.parse(decoded);
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }
    const body = await req.json();
    const mode = body?.mode;
    if (mode === 'encrypt') {
      const scores = body?.scores;
      if (!scores || typeof scores !== 'object') {
        return new Response(JSON.stringify({ error: 'scores required' }), { status: 400 });
      }
      const result = await encrypt(scores);
      return new Response(JSON.stringify(result), { status: 200 });
    }
    if (mode === 'decrypt') {
      const { payload, iv } = body ?? {};
      if (!payload || !iv) {
        return new Response(JSON.stringify({ error: 'payload and iv required' }), { status: 400 });
      }
      const scores = await decrypt(payload, iv);
      return new Response(JSON.stringify({ scores }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: 'mode must be encrypt or decrypt' }), { status: 400 });
  } catch (error) {
    console.error('[score-crypto] error', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
