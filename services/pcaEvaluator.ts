import { FACTORS, type Factor } from '@services/profileAnalyzer';

export type PcaFingerprint = [number, number, number, number];

type EvaluationStrategy = (scores: Record<Factor, number>) => PcaFingerprint;

let loadedStrategy: EvaluationStrategy | null = null;

function ensureLinearProjection(): EvaluationStrategy {
  // TODO: replace with TensorFlow Lite inference once expo-tflite (or equivalent) is integrated.
  // For now, this placeholder keeps the API stable.
  return (_scores) => {
    throw new Error('PCA evaluator not yet implemented.');
  };
}

export async function preloadPcaEvaluator() {
  if (!loadedStrategy) {
    loadedStrategy = ensureLinearProjection();
  }
}

export async function projectScoresToPca(scores: Record<Factor, number>): Promise<PcaFingerprint> {
  if (!loadedStrategy) {
    loadedStrategy = ensureLinearProjection();
  }
  return loadedStrategy(scores);
}
