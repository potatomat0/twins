import { QUESTIONS } from '../data/questions';
import { computeBigFiveScores, normalizeScoresToUnitRange, FACTORS } from '../services/profileAnalyzer';

type FactorScores = Record<(typeof FACTORS)[number], number>;

const ipynbDummyResponses: number[] = [
  3, 5, 1, 4, 2, 2, 2, 4, 2, 1, 1, 5, 4, 2, 3, 3, 4, 1, 4, 4, 4, 2, 1, 1, 2,
  3, 2, 1, 4, 1, 2, 5, 4, 4, 4, 4, 1, 1, 1, 3, 2, 1, 2, 4, 1, 3, 4, 4, 3, 2,
];

const ipynbExpectedScaled: FactorScores = {
  Extraversion: 0.425,
  Agreeableness: 0.275,
  Conscientiousness: 0.575,
  'Emotional Stability': 0.525,
  'Intellect/Imagination': 0.475,
};

const scenarios: Array<{
  label: string;
  responses: number[];
  expectedScaled: FactorScores;
}> = [
  {
    label: 'ipynb dummy responses',
    responses: ipynbDummyResponses,
    expectedScaled: ipynbExpectedScaled,
  },
  {
    label: 'neutral (all 3)',
    responses: Array(50).fill(3),
    expectedScaled: {
      Extraversion: 0.5,
      Agreeableness: 0.5,
      Conscientiousness: 0.5,
      'Emotional Stability': 0.5,
      'Intellect/Imagination': 0.5,
    },
  },
  {
    label: 'strongly agree (all 5)',
    responses: Array(50).fill(5),
    expectedScaled: {
      Extraversion: 0.5,
      Agreeableness: 0.6,
      Conscientiousness: 0.6,
      'Emotional Stability': 0.2,
      'Intellect/Imagination': 0.7,
    },
  },
  {
    label: 'strongly disagree (all 1)',
    responses: Array(50).fill(1),
    expectedScaled: {
      Extraversion: 0.5,
      Agreeableness: 0.4,
      Conscientiousness: 0.4,
      'Emotional Stability': 0.8,
      'Intellect/Imagination': 0.3,
    },
  },
];

const TOLERANCE = 1e-6;
const BASE_QUESTION_SET = QUESTIONS.slice(0, 50);

function assertClose(label: string, actual: number, expected: number) {
  if (Math.abs(actual - expected) > TOLERANCE) {
    throw new Error(`[FAIL] ${label}: expected ${expected}, got ${actual}`);
  }
}

function verifyScenario(label: string, responses: number[], expectedScaled: FactorScores) {
  console.log(`\n--- Verifying scenario: "${label}" ---`);
  if (responses.length !== 50) {
    throw new Error(`[FAIL] ${label}: expected 50 responses, received ${responses.length}`);
  }

  const responseMap = responses.reduce<Record<number, 1 | 2 | 3 | 4 | 5>>((acc, value, idx) => {
    if (value < 1 || value > 5) {
      throw new Error(`[FAIL] ${label}: response at index ${idx} is out of range: ${value}`);
    }
    acc[idx + 1] = value as 1 | 2 | 3 | 4 | 5;
    return acc;
  }, {});

  console.log('Step 1: Computing raw scores...');
  const { sums: raw, counts } = computeBigFiveScores(responseMap, BASE_QUESTION_SET);
  console.log('  Raw scores:', raw);
  console.log('  Item counts:', counts);

  console.log('Step 2: Normalizing scores to unit range...');
  const scaled = normalizeScoresToUnitRange(raw, counts);
  console.log('  Scaled scores:', scaled);


  console.log('Step 3: Comparing calculated scores to expected scores...');
  FACTORS.forEach((factor) => {
    const expected = expectedScaled[factor];
    if (expected === undefined) {
      throw new Error(`[FAIL] ${label}: missing expected value for ${factor}`);
    }
    const actual = Number(scaled[factor].toFixed(6));
    
    console.log(`  - [${factor}]`);
    console.log(`    - Comparing scaled: Actual=${actual}, Expected=${expected}`);
    assertClose(`${label} (${factor})`, actual, expected);

    const totalItems = counts[factor].total;
    const derivedRaw = expected * (totalItems * 4) + totalItems;
    console.log(`    - Comparing raw: Actual=${raw[factor]}, DerivedFromExpected=${derivedRaw}`);
    assertClose(`${label} raw (${factor})`, raw[factor], derivedRaw);
  });

  console.log(`--- [PASS] Scenario: "${label}" ---`);
}

function main() {
  scenarios.forEach(({ label, responses, expectedScaled }) => {
    verifyScenario(label, responses, expectedScaled);
  });
  console.log('\n✅ All scoring scenarios passed.');
}

main();
