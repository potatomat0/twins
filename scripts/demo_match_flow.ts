import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import { QUESTIONS, type Question } from '@data/questions';
import { computeBigFiveScores, normalizeScoresToUnitRange, FACTORS, type Factor } from '@services/profileAnalyzer';
import { projectScoresToPca } from '@services/pcaEvaluator';

dotenv.config();

const TOTAL_ACTIVE_QUESTIONS = 25;
const ELO_SIGMA = 400;
const PASSWORD = 'Matkhautwins1!';
const DEMO_GROUP = { age_group: 'Demo', gender: 'Demo' };

type FactorPools = Record<Factor, { positive: Question[]; negative: Question[] }>;
type AnswerMap = Record<number, 1 | 2 | 3 | 4 | 5>;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing SUPABASE env vars. Check .env for EXPO_PUBLIC_SUPABASE_URL (or SUPABASE_URL), ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY), and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY).',
  );
}

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function createRng(seed: number) {
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

function shuffleArray<T>(items: T[], rnd: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pullRandom<T>(items: T[], rnd: () => number): T | undefined {
  if (items.length === 0) return undefined;
  const index = Math.floor(rnd() * items.length);
  return items.splice(index, 1)[0];
}

function generateQuestionSet(rnd: () => number): Question[] {
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

function simulateLikertAnswer(itemNumber: number, seed: number): 1 | 2 | 3 | 4 | 5 {
  return (((itemNumber * 7 + seed * 11) % 5) + 1) as 1 | 2 | 3 | 4 | 5;
}

function cosine(a: number[], b: number[]) {
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

async function callEdge<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabaseAnon.functions.invoke(name, { body });
  if (error) {
    throw new Error(`[edge:${name}] ${error.message}`);
  }
  return data as T;
}

async function ensureUser(email: string, username: string) {
  const findExisting = async () => {
    const perPage = 1000;
    let page = 1;
    while (true) {
      const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (listErr) {
        throw new Error(`listUsers failed: ${listErr.message}`);
      }
      const match = users.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
      if (match) return match.id;
      if (users.users.length < perPage) break;
      page += 1;
    }
    return null;
  };

  const existingId = await findExisting();
  if (existingId) return existingId;

  const { data: profileMatch } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (profileMatch?.id) return profileMatch.id as string;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data?.user) {
    if (error?.message?.toLowerCase().includes('already been registered')) {
      const retryId = await findExisting();
      if (retryId) return retryId;
      const { data: retryProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      if (retryProfile?.id) return retryProfile.id as string;
    }
    throw new Error(`createUser failed: ${error?.message ?? 'unknown'}`);
  }
  return data.user.id;
}

async function buildUser(seed: number, name: string, email: string, elo: number, hobbies: string[]) {
  const rnd = createRng(seed);
  const questionSet = generateQuestionSet(rnd);
  const answers: AnswerMap = {};
  for (const q of questionSet) {
    answers[q.Item_Number] = simulateLikertAnswer(q.Item_Number, seed);
  }

  const { sums, counts } = computeBigFiveScores(answers, questionSet);
  const normalized = normalizeScoresToUnitRange(sums, counts);
  const pca = await projectScoresToPca(normalized);

  const scoreCrypto = await callEdge<{ cipher: string; iv: string }>('score-crypto', {
    mode: 'encrypt',
    scores: normalized,
  });
  const hobbyCrypto = await callEdge<{ cipher: string; iv: string }>('score-crypto', {
    mode: 'encrypt',
    payload: hobbies,
  });
  const embedRes = await callEdge<{ embedding: number[] }>('embed', {
    text: hobbies.join(', '),
  });

  return {
    name,
    email,
    elo,
    hobbies,
    questionSet,
    answers,
    sums,
    normalized,
    pca,
    scoreCrypto,
    hobbyCrypto,
    hobbyEmbedding: embedRes.embedding,
  };
}

async function upsertProfile(userId: string, payload: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from('profiles').upsert({ id: userId, ...payload });
  if (error) throw new Error(`profile upsert failed: ${error.message}`);
}

async function run() {
  const userA = await buildUser(
    101,
    'mockuserA',
    'mockUserA@example.com',
    1200,
    ['Hiking', 'Photography', 'Indie music'],
  );
  const userB = await buildUser(
    202,
    'mockuserB',
    'mockuserB@example.com',
    1400,
    ['Hiking', 'Travel', 'Cooking'],
  );

  const userAId = await ensureUser(userA.email, userA.name);
  const userBId = await ensureUser(userB.email, userB.name);

  await upsertProfile(userAId, {
    username: userA.name,
    age_group: DEMO_GROUP.age_group,
    gender: DEMO_GROUP.gender,
    elo_rating: userA.elo,
    match_allow_elo: true,
    character_group: 'Demo',
    pca_dim1: userA.pca[0],
    pca_dim2: userA.pca[1],
    pca_dim3: userA.pca[2],
    pca_dim4: userA.pca[3],
    b5_cipher: userA.scoreCrypto.cipher,
    b5_iv: userA.scoreCrypto.iv,
    hobbies_cipher: userA.hobbyCrypto.cipher,
    hobbies_iv: userA.hobbyCrypto.iv,
    hobby_embedding: JSON.stringify(userA.hobbyEmbedding),
  });

  await upsertProfile(userBId, {
    username: userB.name,
    age_group: DEMO_GROUP.age_group,
    gender: DEMO_GROUP.gender,
    elo_rating: userB.elo,
    match_allow_elo: true,
    character_group: 'Demo',
    pca_dim1: userB.pca[0],
    pca_dim2: userB.pca[1],
    pca_dim3: userB.pca[2],
    pca_dim4: userB.pca[3],
    b5_cipher: userB.scoreCrypto.cipher,
    b5_iv: userB.scoreCrypto.iv,
    hobbies_cipher: userB.hobbyCrypto.cipher,
    hobbies_iv: userB.hobbyCrypto.iv,
    hobby_embedding: JSON.stringify(userB.hobbyEmbedding),
  });

  const rec = await callEdge<{
    users: Array<{ id: string; score?: number; similarity?: number; hobby_score?: number; elo_rating?: number }>;
    usedElo: boolean;
    usedHobbies: boolean;
  }>('recommend-users', {
    userId: userAId,
    filters: { ageGroups: [DEMO_GROUP.age_group], genders: [DEMO_GROUP.gender] },
    offset: 0,
    pageSize: 50,
    useElo: true,
    useHobbies: true,
  });

  const matched = rec.users.find((u) => u.id === userBId);
  if (!matched) {
    throw new Error('mockuserB not found in recommend-users response. Check filters or page size.');
  }

  const pcaSim = cosine(userA.pca, userB.pca);
  const eloDelta = Math.abs(userA.elo - userB.elo);
  const prox = Math.exp(-eloDelta / ELO_SIGMA);
  const hSim = Math.max(0, Math.min(1, cosine(userA.hobbyEmbedding, userB.hobbyEmbedding)));
  const localScore = 0.5 * pcaSim + 0.2 * prox + 0.3 * hSim;

  console.log('=== DEMO FLOW: mockuserA -> mockuserB (LIVE) ===\n');
  console.log('[Account]');
  console.log(`User A: ${userA.name} | ${userA.email} | ${PASSWORD}`);
  console.log(`User B: ${userB.name} | ${userB.email} | ${PASSWORD}\n`);

  console.log('[Questionnaire]');
  console.log('A question IDs:', userA.questionSet.map((q) => q.Item_Number));
  console.log('A answers:', userA.questionSet.map((q) => `${q.Item_Number}:${userA.answers[q.Item_Number]}`));
  console.log('B question IDs:', userB.questionSet.map((q) => q.Item_Number));
  console.log('B answers:', userB.questionSet.map((q) => `${q.Item_Number}:${userB.answers[q.Item_Number]}`));
  console.log('\nQuestionnaire table (1..25):');
  printQuestionTable(userA, userB);
  console.log('A normalized scores:', userA.normalized);
  console.log('A PCA-4:', userA.pca.map((v) => Number(v.toFixed(6))));
  console.log('B normalized scores:', userB.normalized);
  console.log('B PCA-4:', userB.pca.map((v) => Number(v.toFixed(6))));

  console.log('\n[Encryption via score-crypto]');
  console.log('A b5_cipher (base64, truncated):', `${userA.scoreCrypto.cipher.slice(0, 22)}...`);
  console.log('A b5_iv:', userA.scoreCrypto.iv);
  console.log('A hobbies_cipher (base64, truncated):', `${userA.hobbyCrypto.cipher.slice(0, 22)}...`);
  console.log('A hobbies_iv:', userA.hobbyCrypto.iv);

  console.log('\n[Hobbies]');
  console.log('A hobbies:', userA.hobbies);
  console.log('B hobbies:', userB.hobbies);

  console.log('\n[Comparison]');
  console.log(`pcaSim = cosine(PCA_A, PCA_B) = ${pcaSim.toFixed(6)}`);
  console.log(`eloDelta = |${userA.elo} - ${userB.elo}| = ${eloDelta}`);
  console.log(`prox = exp(-eloDelta/${ELO_SIGMA}) = ${prox.toFixed(6)}`);
  console.log(`hSim = cosine(hobby_vec_A(384D), hobby_vec_B(384D)) = ${hSim.toFixed(6)}`);
  console.log(`local score = 0.5*pcaSim + 0.2*prox + 0.3*hSim = ${localScore.toFixed(6)}`);
  console.log(`recommend-users score = ${Number((matched.score ?? matched.similarity ?? 0).toFixed(6))}`);
  console.log(`recommend-users hobby_score = ${Number((matched.hobby_score ?? 0).toFixed(6))}`);
  console.log(`recommend-users elo_rating(B) = ${matched.elo_rating ?? 'n/a'}`);
}

function printQuestionTable(
  userA: { questionSet: Question[]; answers: AnswerMap },
  userB: { questionSet: Question[]; answers: AnswerMap },
) {
  const rows = [];
  const total = Math.max(userA.questionSet.length, userB.questionSet.length);
  for (let i = 0; i < total; i += 1) {
    const qA = userA.questionSet[i];
    const qB = userB.questionSet[i];
    rows.push({
      index: String(i + 1),
      a_qid: qA ? String(qA.Item_Number) : '-',
      a_ans: qA ? String(userA.answers[qA.Item_Number]) : '-',
      b_qid: qB ? String(qB.Item_Number) : '-',
      b_ans: qB ? String(userB.answers[qB.Item_Number]) : '-',
    });
  }

  const header = { index: 'No', a_qid: 'A_QID', a_ans: 'A', b_qid: 'B_QID', b_ans: 'B' };
  const columns = Object.keys(header) as Array<keyof typeof header>;
  const widths: Record<string, number> = {};
  for (const col of columns) {
    widths[col] = Math.max(
      header[col].length,
      ...rows.map((r) => r[col].length),
    );
  }

  const formatRow = (row: Record<string, string>) =>
    columns
      .map((col) => row[col].padEnd(widths[col]))
      .join(' | ');

  console.log(formatRow(header));
  console.log(columns.map((col) => '-'.repeat(widths[col])).join('-|-'));
  for (const row of rows) {
    console.log(formatRow(row));
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
