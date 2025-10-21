import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';

const imageAssets = [
  require('../assets/images/twins-connector.png.png'),
  require('../assets/images/twins-creator.png.png'),
  require('../assets/images/twins-explorer.png.png'),
  require('../assets/images/twins-guardian.png.png'),
  require('../assets/images/twins-strategist.png.png'),
];

const MIN_LOADING_DURATION_MS = 600;

export function useAppResources() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const start = Date.now();
      try {
        await Asset.loadAsync(imageAssets);
      } catch (error) {
        if (__DEV__) {
          console.warn('[splash] Failed to preload assets', error);
        }
      } finally {
        const elapsed = Date.now() - start;
        const remaining = Math.max(MIN_LOADING_DURATION_MS - elapsed, 0);

        setTimeout(() => {
          if (mounted) {
            setReady(true);
          }
        }, remaining);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return ready;
}

