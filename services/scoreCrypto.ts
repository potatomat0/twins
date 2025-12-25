import supabase from './supabase';

export type ScoresPayload = Record<string, number>;
export type EncryptResult = { cipher: string; iv: string };

export async function encryptScoresRemote(scores: Record<string, number>) {
  try {
    const { data, error } = await supabase.functions.invoke('score-crypto', {
      body: { mode: 'encrypt', scores },
    });
    if (error || !data?.cipher || !data?.iv) {
      console.warn('[scoreCrypto] encrypt error', error);
      return null;
    }
    return { cipher: data.cipher, iv: data.iv };
  } catch (err) {
    console.warn('[scoreCrypto] encrypt exception', err);
    return null;
  }
}

export async function decryptScoresRemote(cipher: string, iv: string) {
  try {
    const { data, error } = await supabase.functions.invoke('score-crypto', {
      body: { mode: 'decrypt', payload: cipher, iv },
    });
    if (error || !data?.scores) {
      // The edge function returns { scores: ... } for decrypt mode if successful
      // If we generalized it, it might return { payload: ... } or just the object.
      // Let's check how the edge function behaves.
      // Current edge function: return json({ scores }, { status: 200 });
      // We didn't change the response format for 'decrypt' in previous step, only 'encrypt'.
      // Wait, let's verify if we need to update 'decrypt' response in edge function too?
      console.warn('[scoreCrypto] decrypt error', error);
      return null;
    }
    return data.scores;
  } catch (err) {
    console.warn('[scoreCrypto] decrypt exception', err);
    return null;
  }
}

export async function encryptGenericRemote(payload: unknown) {
  try {
    const { data, error } = await supabase.functions.invoke('score-crypto', {
      body: { mode: 'encrypt', payload },
    });
    if (error || !data?.cipher || !data?.iv) {
      console.warn('[scoreCrypto] encryptGeneric error', error);
      return null;
    }
    return { cipher: data.cipher as string, iv: data.iv as string };
  } catch (err) {
    console.warn('[scoreCrypto] encryptGeneric exception', err);
    return null;
  }
}

export async function decryptGenericRemote<T = any>(cipher: string, iv: string): Promise<T | null> {
  try {
    const { data, error } = await supabase.functions.invoke('score-crypto', {
      body: { mode: 'decrypt', payload: cipher, iv },
    });
    // The edge function currently returns { scores: ... } hardcoded in the response json({ scores }).
    // We need to update the edge function to return { payload: ... } or just the data?
    // Let's update the edge function to return { payload: decoded } instead of { scores: decoded } for generic support.
    
    // For now, if we assume the edge function will be updated:
    if (error || (!data?.payload && !data?.scores)) {
       return null;
    }
    return (data.payload ?? data.scores) as T;
  } catch (err) {
    console.warn('[scoreCrypto] decryptGeneric exception', err);
    return null;
  }
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
