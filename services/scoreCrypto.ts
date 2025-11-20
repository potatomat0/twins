import supabase from './supabase';

export type ScoresPayload = Record<string, number>;
export type EncryptResult = { cipher: string; iv: string };

export async function encryptScoresRemote(scores: ScoresPayload): Promise<EncryptResult | null> {
  if (!scores || Object.keys(scores).length === 0) {
    return null;
  }
  const { data, error } = await supabase.functions.invoke('score-crypto', {
    body: { mode: 'encrypt', scores },
  });
  if (error) {
    throw new Error(error.message ?? 'Failed to encrypt scores');
  }
  if (!data) return null;
  const payload = typeof data === 'string' ? safeJsonParse(data) : data;
  const { cipher, iv } = (payload ?? {}) as any;
  if (!cipher || !iv) {
    return null;
  }
  return { cipher, iv };
}

export async function decryptScoresRemote(cipher: string, iv: string): Promise<ScoresPayload | null> {
  if (!cipher || !iv) return null;
  const { data, error } = await supabase.functions.invoke('score-crypto', {
    body: { mode: 'decrypt', payload: cipher, iv },
  });
  if (error) {
    throw new Error(error.message ?? 'Failed to decrypt scores');
  }
  const parsed = typeof data === 'string' ? safeJsonParse(data) : data;
  return ((parsed as any)?.scores as ScoresPayload) ?? null;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
