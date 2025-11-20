import { FACTORS, type Factor } from '@services/profileAnalyzer';

export type PcaFingerprint = [number, number, number, number];

const MEAN: Record<Factor, number> = {
  Extraversion: 0.6968074677391889,
  Agreeableness: 0.6723287115524996,
  Conscientiousness: 0.7339413345134549,
  'Emotional Stability': 0.7019984402438775,
  'Intellect/Imagination': 0.574399184761682,
};

const COMPONENTS: ReadonlyArray<ReadonlyArray<number>> = [
  [-0.2180412943906895, -0.4394034997412539, -0.08520712181270074, -0.47711527324537323, 0.724212207011149],
  [-0.3117689149624214, 0.6759383122168042, 0.3775570625284317, -0.5507753052872655, -0.00218388673574868],
  [0.714593176383529, 0.055294593280118265, 0.5917022377547896, 0.06753540151161957, 0.3628037094610858],
  [-0.13712625316926405, 0.5289535935768106, -0.3017073400631589, 0.5176376086048503, 0.5851738832550566],
];

function centerScores(scores: Record<Factor, number>): number[] {
  return FACTORS.map((factor) => scores[factor] - MEAN[factor]);
}

function project(vector: number[]): PcaFingerprint {
  return COMPONENTS.map((component) => component.reduce((sum, weight, index) => sum + weight * vector[index], 0)) as PcaFingerprint;
}

export async function preloadPcaEvaluator() {
  // no-op for the TypeScript encoder; left for API compatibility
}

export async function projectScoresToPca(scores: Record<Factor, number>): Promise<PcaFingerprint> {
  const centered = centerScores(scores);
  return project(centered);
}
