import { QUESTIONS, type Question } from '@data/questions';
import { computeBigFiveScores, normalizeScoresToUnitRange, FACTORS, type Factor } from '@services/profileAnalyzer';
import { projectScoresToPca } from '@services/pcaEvaluator';

const TOTAL_ACTIVE_QUESTIONS = 25;

type FactorPools = Record<Factor, { positive: Question[]; negative: Question[] }>;

function buildFactorPools(): FactorPools {
  const pools = {} as FactorPools;
  for (const factor of FACTORS) {
    pools[factor] = { positive: [], negative: [] };
  }
  for (const q of QUESTIONS) {
    const pool = pools[q.Factor_Name];
    if (q.Direction === '+') pool.positive.push(q);
    else pool.negative.push(q);
  }
  return pools;
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pullRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  const index = Math.floor(Math.random() * items.length);
  return items.splice(index, 1)[0];
}

function generateQuestionSet(): Question[] {
  const pools = buildFactorPools();
  const workingPools: FactorPools = {} as FactorPools;
  for (const factor of FACTORS) {
    workingPools[factor] = {
      positive: [...pools[factor].positive],
      negative: [...pools[factor].negative],
    };
  }

  const perTrait = Math.round(TOTAL_ACTIVE_QUESTIONS / FACTORS.length);
  const basePerDirection = Math.floor(perTrait / 2);
  const remainderPerTrait = perTrait - basePerDirection * 2;
  let extraDirection: '+' | '-' = '+';
  const chosen: Question[] = [];

  for (const factor of FACTORS) {
    const pool = workingPools[factor];
    const factorSelection: Question[] = [];

    for (let i = 0; i < basePerDirection; i += 1) {
      const pos = pullRandom(pool.positive);
      if (pos) factorSelection.push(pos);
      const neg = pullRandom(pool.negative);
      if (neg) factorSelection.push(neg);
    }

    for (let r = 0; r < remainderPerTrait; r += 1) {
      const wantPositive = extraDirection === '+';
      let pick = wantPositive ? pullRandom(pool.positive) : pullRandom(pool.negative);
      if (!pick) {
        pick = wantPositive ? pullRandom(pool.negative) : pullRandom(pool.positive);
      }
      if (!pick) {
        pick = pullRandom(pool.positive.length ? pool.positive : pool.negative);
      }
      if (pick) {
        factorSelection.push(pick);
        extraDirection = extraDirection === '+' ? '-' : '+';
      }
    }

    chosen.push(...factorSelection);
  }

  if (chosen.length < TOTAL_ACTIVE_QUESTIONS) {
    const selectedIds = new Set(chosen.map((q) => q.Item_Number));
    const remaining = shuffleArray(QUESTIONS.filter((q) => !selectedIds.has(q.Item_Number)));
    for (const q of remaining) {
      chosen.push(q);
      if (chosen.length >= TOTAL_ACTIVE_QUESTIONS) break;
    }
  }

  return shuffleArray(chosen.slice(0, TOTAL_ACTIVE_QUESTIONS));
}

function simulateLikertAnswer(itemNumber: number): 1 | 2 | 3 | 4 | 5 {
  // Deterministic pseudo-random choice from 1..5 based on question id.
  return (((itemNumber * 7) % 5) + 1) as 1 | 2 | 3 | 4 | 5;
}

async function run() {
  const questionSet = generateQuestionSet();
  const answers: Record<number, 1 | 2 | 3 | 4 | 5> = {};
  for (const q of questionSet) {
    answers[q.Item_Number] = simulateLikertAnswer(q.Item_Number);
  }

  const { sums, counts } = computeBigFiveScores(answers, questionSet);
  const normalized = normalizeScoresToUnitRange(sums, counts);
  const pca = await projectScoresToPca(normalized);

  console.log('Question IDs (25):', questionSet.map((q) => q.Item_Number));
  console.log('Answers:', questionSet.map((q) => `${q.Item_Number}:${answers[q.Item_Number]}`));
  console.log('Raw sums:', sums);
  console.log('Counts:', counts);
  console.log('Normalized (0-1):', normalized);
  console.log('PCA-4:', pca);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
