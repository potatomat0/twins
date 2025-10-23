import { useCallback } from 'react';

type EvaluateFn = (inputs: number[]) => Promise<number[]>;

const notReadyError = new Error('PCA model is not integrated yet.');

export function useTensorflowModel(): {
  ready: boolean;
  loading: boolean;
  error: string | null;
  evaluate: EvaluateFn;
} {
  const evaluate = useCallback(async () => {
    throw notReadyError;
  }, []);

  return {
    ready: false,
    loading: false,
    error: 'PCA model is not integrated yet.',
    evaluate,
  };
}
