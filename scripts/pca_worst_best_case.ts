import { QUESTIONS, type Question } from '@data/questions';
import { getQuestionText } from '@data/questionTexts';
import { computeBigFiveScores, normalizeScoresToUnitRange, FACTORS, type Factor } from '@services/profileAnalyzer';
import { projectScoresToPca } from '@services/pcaEvaluator';

const TOTAL_ACTIVE_QUESTIONS = 25;
const RNG_SEED = 1337;

type Likert = 1 | 2 | 3 | 4 | 5;

type Scenario = {
  name: string;
  answersA: Record<number, Likert>;
  answersB: Record<number, Likert>;
};

type FactorPools = Record<Factor, { positive: Question[]; negative: Question[] }>;

type Rng = () => number;

function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

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

function shuffleArray<T>(items: T[], rnd: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pullRandom<T>(items: T[], rnd: Rng): T | undefined {
  if (items.length === 0) return undefined;
  const index = Math.floor(rnd() * items.length);
  return items.splice(index, 1)[0];
}

function generateQuestionSet(rnd: Rng): Question[] {
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
      const pos = pullRandom(pool.positive, rnd);
      if (pos) factorSelection.push(pos);
      const neg = pullRandom(pool.negative, rnd);
      if (neg) factorSelection.push(neg);
    }

    for (let r = 0; r < remainderPerTrait; r += 1) {
      const wantPositive = extraDirection === '+';
      let pick = wantPositive ? pullRandom(pool.positive, rnd) : pullRandom(pool.negative, rnd);
      if (!pick) {
        pick = wantPositive ? pullRandom(pool.negative, rnd) : pullRandom(pool.positive, rnd);
      }
      if (!pick) {
        pick = pullRandom(pool.positive.length ? pool.positive : pool.negative, rnd);
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
    const remaining = shuffleArray(QUESTIONS.filter((q) => !selectedIds.has(q.Item_Number)), rnd);
    for (const q of remaining) {
      chosen.push(q);
      if (chosen.length >= TOTAL_ACTIVE_QUESTIONS) break;
    }
  }

  return shuffleArray(chosen.slice(0, TOTAL_ACTIVE_QUESTIONS), rnd);
}

function invertLikert(value: Likert): Likert {
  return (6 - value) as Likert;
}

function answersFromPattern(questionSet: Question[], pattern: Likert[]): Record<number, Likert> {
  const answers: Record<number, Likert> = {};
  for (let i = 0; i < questionSet.length; i += 1) {
    const q = questionSet[i];
    answers[q.Item_Number] = pattern[i % pattern.length];
  }
  return answers;
}

function answersFromKeyedExtremes(questionSet: Question[], highForPositive: boolean): Record<number, Likert> {
  const answers: Record<number, Likert> = {};
  for (const q of questionSet) {
    if (q.Direction === '+') {
      answers[q.Item_Number] = (highForPositive ? 5 : 1) as Likert;
    } else {
      answers[q.Item_Number] = (highForPositive ? 1 : 5) as Likert;
    }
  }
  return answers;
}

function invertAnswers(answers: Record<number, Likert>): Record<number, Likert> {
  const out: Record<number, Likert> = {};
  for (const key of Object.keys(answers)) {
    const id = Number(key);
    out[id] = invertLikert(answers[id]);
  }
  return out;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function trueNormalizeCosine(value: number): number {
  return clamp01((value + 1) / 2);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function formatScores(label: string, scores: Record<Factor, number>) {
  const parts = FACTORS.map((factor) => `${factor}=${scores[factor].toFixed(4)}`);
  console.log(`${label} ${parts.join(' | ')}`);
}

function clampLikert(value: number): Likert {
  return Math.max(1, Math.min(5, value)) as Likert;
}

function answersFromUniform(questionSet: Question[], value: Likert): Record<number, Likert> {
  const answers: Record<number, Likert> = {};
  for (const q of questionSet) {
    answers[q.Item_Number] = value;
  }
  return answers;
}

function shiftAnswers(answers: Record<number, Likert>, delta: number): Record<number, Likert> {
  const out: Record<number, Likert> = {};
  for (const key of Object.keys(answers)) {
    const id = Number(key);
    out[id] = clampLikert(answers[id] + delta);
  }
  return out;
}

function invertEveryNth(questionSet: Question[], answers: Record<number, Likert>, step: number): Record<number, Likert> {
  const out: Record<number, Likert> = { ...answers };
  for (let i = 0; i < questionSet.length; i += 1) {
    if ((i + 1) % step === 0) {
      const id = questionSet[i].Item_Number;
      out[id] = invertLikert(out[id]);
    }
  }
  return out;
}

function formatFirstAnswers(
  questionSet: Question[],
  answersA: Record<number, Likert>,
  answersB: Record<number, Likert>,
  count = 5,
) {
  const items = questionSet.slice(0, count).map((q) => `${q.Item_Number}:${answersA[q.Item_Number]}/${answersB[q.Item_Number]}`);
  console.log(`  Sampled Answers (QID:A/B): ${items.join(', ')}`);
}

async function evaluateScenario(name: string, questionSet: Question[], answersA: Record<number, Likert>, answersB: Record<number, Likert>) {
  const { sums: sumsA, counts: countsA } = computeBigFiveScores(answersA, questionSet);
  const { sums: sumsB, counts: countsB } = computeBigFiveScores(answersB, questionSet);

  const normalizedA = normalizeScoresToUnitRange(sumsA, countsA);
  const normalizedB = normalizeScoresToUnitRange(sumsB, countsB);

  const pcaA = await projectScoresToPca(normalizedA);
  const pcaB = await projectScoresToPca(normalizedB);

  const sim = cosine(pcaA, pcaB);
  const clampedSim = clamp01(sim);
  const trueNormalizedSim = trueNormalizeCosine(sim);

  console.log(`\n-----------------------------------------`);
  console.log(`SCENARIO: ${name}`);
  console.log(`-----------------------------------------`);
  formatFirstAnswers(questionSet, answersA, answersB);

  console.log('\n  (1) Big Five Scores (Normalized 0-1)');
  formatScores('    A:', normalizedA);
  formatScores('    B:', normalizedB);

  console.log('\n  (2) PCA-4 Projections');
  console.log(`    A PCA: [${pcaA.map((v) => v.toFixed(4)).join(', ')}]`);
  console.log(`    B PCA: [${pcaB.map((v) => v.toFixed(4)).join(', ')}]`);

  console.log('\n  (3) Similarity Result');
  console.log(`    Cosine Similarity:            ${sim.toFixed(6)}`);
  console.log(`    Clamped Similarity (0-1):     ${clampedSim.toFixed(6)}`);
  console.log(`    True Normalized Sim. (0-1):   ${trueNormalizedSim.toFixed(6)}`);
  console.log(`-----------------------------------------`);
}

async function run() {
  console.log('--- PCA Worst/Best Case Scenario Analysis ---');
  const rnd = createRng(RNG_SEED);
  const questionSet = generateQuestionSet(rnd);

  console.log(`\nGenerated Question Set (25 questions). First 5:`);
  questionSet.slice(0, 5).forEach((q, i) => {
    console.log(`  ${i + 1}. (ID: ${q.Item_Number}) "${getQuestionText('en', q.Item_Number)}"`);
  });

  console.log('\n--- Defining Answer Scenarios ---');

  const patternA = answersFromPattern(questionSet, [5, 4, 3, 2]);
  const patternB = answersFromPattern(questionSet, [5, 4, 3, 2]);
  const oppositePatternB = invertAnswers(patternA);
  const shiftedPatternB = shiftAnswers(patternA, -1);
  const partialInvertB = invertEveryNth(questionSet, patternA, 3);

  const maxKeyed = answersFromKeyedExtremes(questionSet, true);
  const minKeyed = answersFromKeyedExtremes(questionSet, false);
  const uniformMid = answersFromUniform(questionSet, 3);
  const uniformHigh = answersFromUniform(questionSet, 4);

  console.log('Scenarios defined. Running evaluations...');

  const scenarios: Scenario[] = [
    {
      name: 'Same pattern (5,4,3,2) vs (5,4,3,2)',
      answersA: patternA,
      answersB: patternB,
    },
    {
      name: 'Opposite pattern (A vs 6-A by item)',
      answersA: patternA,
      answersB: oppositePatternB,
    },
    {
      name: 'Shifted pattern (5,4,3,2) vs (4,3,2,1)',
      answersA: patternA,
      answersB: shiftedPatternB,
    },
    {
      name: 'Partial inversion (every 3rd answer inverted)',
      answersA: patternA,
      answersB: partialInvertB,
    },
    {
      name: 'Keyed extremes (max vs min by direction)',
      answersA: maxKeyed,
      answersB: minKeyed,
    },
    {
      name: 'Uniform mid (all 3s) vs uniform high (all 4s)',
      answersA: uniformMid,
      answersB: uniformHigh,
    },
  ];

  for (const scenario of scenarios) {
    await evaluateScenario(scenario.name, questionSet, scenario.answersA, scenario.answersB);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
