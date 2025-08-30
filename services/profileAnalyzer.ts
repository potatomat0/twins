import { QUESTIONS } from '@data/questions';

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
export function computeBigFiveScores(answers: AnswerMap): Record<Factor, number> {
  const sums: Record<Factor, number> = {
    'Extraversion': 0,
    'Agreeableness': 0,
    'Conscientiousness': 0,
    'Emotional Stability': 0,
    'Intellect/Imagination': 0,
  };

  for (const q of QUESTIONS) {
    const resp = answers[q.Item_Number];
    if (!resp) continue;
    const value = q.Direction === '+' ? resp : (6 - resp) as 1 | 2 | 3 | 4 | 5;
    sums[q.Factor_Name] += value;
  }
  return sums;
}

// Convert raw sums (min 10, max 50 per factor) to 0-100 scale.
export function normalizeScoresTo100(sums: Record<Factor, number>): Record<Factor, number> {
  const out = { ...sums } as Record<Factor, number>;
  for (const f of FACTORS) {
    const v = sums[f];
    const pct = ((v - 10) / 40) * 100; // 10 items per factor
    out[f] = Math.max(0, Math.min(100, Math.round(pct)));
  }
  return out;
}

export function topFactors(sums: Record<Factor, number>, n = 3): { factor: Factor; value: number }[] {
  return Object.entries(sums)
    .map(([factor, value]) => ({ factor: factor as Factor, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

