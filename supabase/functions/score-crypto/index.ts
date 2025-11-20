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

function summarizeScores(scores: Scores | undefined | null) {
  if (!scores) return 'none';
  const keys = Object.keys(scores);
  return `${keys.length} keys`;
}

function requestId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

async function importKey(reqId: string) {
  const secret = Deno.env.get('B5_ENCRYPTION_KEY');
  if (!secret) {
    console.error(`[score-crypto] [${reqId}] Missing B5_ENCRYPTION_KEY secret`);
    throw new Error('Missing B5_ENCRYPTION_KEY secret');
  }
  const keyBytes = fromBase64(secret);
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encrypt(scores: Scores, reqId: string) {
  const key = await importKey(reqId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = toBytes(JSON.stringify(scores));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
  return { cipher: toBase64(cipher), iv: toBase64(iv) };
}

async function decrypt(cipherText: string, ivB64: string, reqId: string) {
  const key = await importKey(reqId);
  const cipherBytes = fromBase64(cipherText);
  const iv = fromBase64(ivB64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
  const decoded = new TextDecoder().decode(plain);
  return JSON.parse(decoded);
}

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...(init ?? {}),
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

serve(async (req) => {
  const reqId = requestId();
  const started = Date.now();
  console.log(`[score-crypto] [${reqId}] incoming ${req.method}`);
  try {
    if (req.method !== 'POST') {
      console.warn(`[score-crypto] [${reqId}] rejected non-POST`);
      return json({ error: 'Method not allowed' }, { status: 405 });
    }
    const body = await req.json();
    const mode = body?.mode;
    console.log(`[score-crypto] [${reqId}] mode=${mode}`);
    if (mode === 'encrypt') {
      const scores = body?.scores;
      if (!scores || typeof scores !== 'object') {
        console.warn(`[score-crypto] [${reqId}] encrypt missing scores: ${typeof scores}`);
        return json({ error: 'scores required' }, { status: 400 });
      }
      console.log(`[score-crypto] [${reqId}] encrypt payload summary: ${summarizeScores(scores)}`);
      const result = await encrypt(scores, reqId);
      console.log(`[score-crypto] [${reqId}] encrypt success (${Date.now() - started}ms)`);
      return json(result, { status: 200 });
    }
    if (mode === 'decrypt') {
      const { payload, iv } = body ?? {};
      if (!payload || !iv) {
        console.warn(`[score-crypto] [${reqId}] decrypt missing payload/iv`);
        return json({ error: 'payload and iv required' }, { status: 400 });
      }
      console.log(`[score-crypto] [${reqId}] decrypt payload length=${payload?.length ?? 0}`);
      const scores = await decrypt(payload, iv, reqId);
      console.log(`[score-crypto] [${reqId}] decrypt success (${Date.now() - started}ms)`);
      return json({ scores }, { status: 200 });
    }
    console.warn(`[score-crypto] [${reqId}] invalid mode`);
    return json({ error: 'mode must be encrypt or decrypt' }, { status: 400 });
  } catch (error) {
    console.error(`[score-crypto] [${reqId}] error`, error);
    return json({ error: 'Internal error' }, { status: 500 });
  }
});
