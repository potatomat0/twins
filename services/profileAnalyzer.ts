import { QUESTIONS, type Question } from '@data/questions';

export type AnswerMap = Record<number, 1 | 2 | 3 | 4 | 5>;

export const FACTORS = [
  'Extraversion',
  'Agreeableness',
  'Conscientiousness',
  'Emotional Stability',
  'Intellect/Imagination',
] as const;
export type Factor = (typeof FACTORS)[number];

// Compute raw sums per factor using IPIP-50 rules (+ keyed: as-is, - keyed: reverse score)
type FactorCounts = Record<Factor, { total: number; positive: number; negative: number }>;

function createEmptySums(): Record<Factor, number> {
  return {
    Extraversion: 0,
    Agreeableness: 0,
    Conscientiousness: 0,
    'Emotional Stability': 0,
    'Intellect/Imagination': 0,
  };
}

function createEmptyCounts(): FactorCounts {
  return {
    Extraversion: { total: 0, positive: 0, negative: 0 },
    Agreeableness: { total: 0, positive: 0, negative: 0 },
    Conscientiousness: { total: 0, positive: 0, negative: 0 },
    'Emotional Stability': { total: 0, positive: 0, negative: 0 },
    'Intellect/Imagination': { total: 0, positive: 0, negative: 0 },
  };
}

export function computeBigFiveScores(answers: AnswerMap, activeQuestions: Question[]): {
  sums: Record<Factor, number>;
  counts: FactorCounts;
} {
  const sums = createEmptySums();
  const counts = createEmptyCounts();

  const questionsToProcess = activeQuestions.length > 0 ? activeQuestions : QUESTIONS;

  for (const q of questionsToProcess) {
    counts[q.Factor_Name].total += 1;
    if (q.Direction === '+') counts[q.Factor_Name].positive += 1;
    else counts[q.Factor_Name].negative += 1;

    const resp = answers[q.Item_Number];
    if (!resp) continue;
    const value = q.Direction === '+' ? resp : (6 - resp) as 1 | 2 | 3 | 4 | 5;
    sums[q.Factor_Name] += value;
  }

  return { sums, counts };
}

// Convert raw sums to 0-1 scale based on the number of questions per factor.
export function normalizeScoresToUnitRange(
  sums: Record<Factor, number>,
  counts: FactorCounts,
): Record<Factor, number> {
  const out = { ...sums } as Record<Factor, number>;
  for (const f of FACTORS) {
    const total = counts[f].total;
    if (total === 0) {
      out[f] = 0;
      continue;
    }
    const min = total * 1;
    const max = total * 5;
    const v = sums[f];
    const scaled = (v - min) / (max - min || 1);
    out[f] = Math.max(0, Math.min(1, scaled));
  }
  return out;
}

export function topFactors(sums: Record<Factor, number>, n = 3): { factor: Factor; value: number }[] {
  return Object.entries(sums)
    .map(([factor, value]) => ({ factor: factor as Factor, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}
