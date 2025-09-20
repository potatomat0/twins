// Scalable sound hook using expo-audio (SDK 54+)
// - Respects system silent mode (no override)
// - Supports mp3 and wav assets via require
// Usage: const pop = useSound('pop'); pop.play(); pop.seekTo(0);

import { useAudioPlayer } from 'expo-audio';

export type SoundKey = 'pop';

export const SOURCES: Record<SoundKey, any> = {
  pop: require('../assets/sound/pop.mp3'),
};

export function useSound(key: SoundKey) {
  const src = SOURCES[key];
  const player = useAudioPlayer(src);
  return player;
}

export default { useSound };
