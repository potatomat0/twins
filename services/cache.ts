import AsyncStorage from '@react-native-async-storage/async-storage';

type CachePayload<T> = {
  timestamp: number;
  value: T;
};

export async function setCache<T>(key: string, value: T) {
  try {
    const payload: CachePayload<T> = { timestamp: Date.now(), value };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    if (__DEV__) console.warn('[cache] set error', key, err);
  }
}

export async function getCache<T>(key: string, ttlMs?: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload<T>;
    if (!parsed || typeof parsed.timestamp !== 'number') return null;
    if (ttlMs && Date.now() - parsed.timestamp > ttlMs) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch (err) {
    if (__DEV__) console.warn('[cache] get error', key, err);
    return null;
  }
}

export async function clearCache(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    if (__DEV__) console.warn('[cache] clear error', key, err);
  }
}
