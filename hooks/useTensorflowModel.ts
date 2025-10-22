// Placeholder hook for future TensorFlow integration
import { useCallback, useEffect, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import '@tensorflow/tfjs-react-native';
import * as tf from '@tensorflow/tfjs';
import * as tflite from '@tensorflow/tfjs-tflite';
import modelAsset from '../assets/ml/pca_evaluator_4d.tflite';

type EvaluateFn = (inputs: number[]) => Promise<number[]>;

export function useTensorflowModel(): {
  ready: boolean;
  loading: boolean;
  error: string | null;
  evaluate: EvaluateFn;
} {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const modelRef = useRef<tflite.TFLiteModel | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        await tf.ready();
        if (tf.getBackend() !== 'rn-webgl') {
          try {
            await tf.setBackend('rn-webgl');
          } catch {
            await tf.setBackend('cpu');
          }
          await tf.ready();
        }
        const asset = Asset.fromModule(modelAsset);
        if (!asset.localUri) {
          await asset.downloadAsync();
        }
        if (!asset.localUri) {
          throw new Error('Unable to load PCA model asset');
        }
        const base64Model = await FileSystem.readAsStringAsync(asset.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const modelBinary = tf.util.encodeString(base64Model, 'base64');
        const loadedModel = await tflite.loadTFLiteModel(modelBinary);
        if (cancelled) {
          loadedModel.dispose?.();
          return;
        }
        modelRef.current = loadedModel;
        setReady(true);
        setError(null);
      } catch (e: any) {
        if (cancelled) return;
        console.warn('[TensorflowModel] load error', e);
        setError(e?.message ?? 'Failed to load PCA model');
        setReady(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      if (modelRef.current) {
        modelRef.current.dispose?.();
        modelRef.current = null;
      }
    };
  }, []);

  const evaluate: EvaluateFn = useCallback(
    async (inputs: number[]) => {
      if (!modelRef.current) {
        throw new Error('Model is not ready');
      }
      if (inputs.length !== 5) {
        throw new Error(`Expected 5 inputs, received ${inputs.length}`);
      }
      const clipped = inputs.map((v) => Math.max(0, Math.min(1, v)));
      const tensor = tf.tensor(clipped, [1, 5], 'float32');
      try {
        const output = modelRef.current.predict(tensor);
        if (!output || Array.isArray(output)) {
          throw new Error('Unexpected PCA model output');
        }
        const data = await output.data();
        return Array.from(data);
      } finally {
        tensor.dispose();
      }
    },
    [],
  );

  return { ready, loading, error, evaluate };
}
