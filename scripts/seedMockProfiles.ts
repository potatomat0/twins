import { createClient } from '@supabase/supabase-js';

type Factor = 'Extraversion' | 'Agreeableness' | 'Conscientiousness' | 'Emotional Stability' | 'Intellect/Imagination';
type Scores = Record<Factor, number>;
type PcaFingerprint = [number, number, number, number];

const FACTORS: Factor[] = ['Extraversion', 'Agreeableness', 'Conscientiousness', 'Emotional Stability', 'Intellect/Imagination'];

// PCA params derived from model/pca_evaluator.ipynb
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

function projectScoresToPca(scores: Scores): PcaFingerprint {
  const centered = FACTORS.map((f) => scores[f] - MEAN[f]);
  const result = COMPONENTS.map((component) =>
    component.reduce((sum, weight, index) => sum + weight * centered[index], 0),
  ) as PcaFingerprint;
  return result;
}

function determineCharacterGroup(scores: Scores) {
  const toPct = (value?: number) => (value ?? 0) * 100;
  const E = toPct(scores['Extraversion']);
  const A = toPct(scores['Agreeableness']);
  const C = toPct(scores['Conscientiousness']);
  const O = toPct(scores['Intellect/Imagination']);
  const HIGH = 70;
  const VERY_HIGH = 85;
  if (O >= VERY_HIGH) return 'Creator';
  if (E >= HIGH && O >= HIGH) return 'Explorer';
  if (E >= HIGH && A >= HIGH) return 'Connector';
  if (C >= HIGH && O >= HIGH) return 'Strategist';
  if (A >= HIGH && C >= HIGH) return 'Guardian';
  const pairs: Array<[string, number]> = [
    ['Explorer', (E + O) / 2],
    ['Connector', (E + A) / 2],
    ['Strategist', (C + O) / 2],
    ['Guardian', (A + C) / 2],
    ['Creator', O],
  ];
  pairs.sort((a, b) => b[1] - a[1]);
  return pairs[0][0];
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomScores(): Scores {
  // Generate balanced but varied trait scores
  const base = FACTORS.map(() => rand(0.2, 0.9));
  // Slight normalization: pull values toward mean 0.6 to avoid extremes
  const normalized = base.map((v) => 0.6 + (v - 0.6) * rand(0.7, 1.2));
  return {
    Extraversion: normalized[0],
    Agreeableness: normalized[1],
    Conscientiousness: normalized[2],
    'Emotional Stability': normalized[3],
    'Intellect/Imagination': normalized[4],
  };
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required');
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const genders = ['Male', 'Female', 'Non-Binary', 'Prefer Not To Say'];
  const ageGroups = ['<18', '18-24', '25-35', '35-44', '45+'];

  const usersToCreate = 50;
  const created: Array<{ email: string; userId: string }> = [];

  for (let i = 0; i < usersToCreate; i++) {
    const scores = randomScores();
    const pca = projectScoresToPca(scores);
    const character = determineCharacterGroup(scores);

    const email = `mockuser${i + 1}@seed.twins.dev`;
    const password = `Tw1ns!${i + 1}${Math.random().toString(16).slice(2, 6)}`;
    const username = `mock_${i + 1}`;
    const age_group = ageGroups[i % ageGroups.length];
    const gender = genders[i % genders.length];

    // Encrypt raw scores via edge function
    const { data: encData, error: encError } = await supabase.functions.invoke('score-crypto', {
      body: { mode: 'encrypt', scores },
    });
    if (encError || !encData?.cipher || !encData?.iv) {
      console.error('Encrypt failed for', email, encError ?? encData);
      continue;
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (authErr || !authData.user?.id) {
      console.error('Create user failed for', email, authErr);
      continue;
    }
    const userId = authData.user.id;

    // Upsert profile
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username,
        age_group,
        gender,
        character_group: character,
        pca_dim1: pca[0],
        pca_dim2: pca[1],
        pca_dim3: pca[2],
        pca_dim4: pca[3],
        b5_cipher: (encData as any).cipher,
        b5_iv: (encData as any).iv,
      });
    if (profileErr) {
      console.error('Upsert profile failed for', email, profileErr);
      continue;
    }

    created.push({ email, userId });
    if ((i + 1) % 10 === 0) {
      console.log(`Seeded ${i + 1}/${usersToCreate} users...`);
    }
  }

  console.log('Seeding complete:', created.length, 'users created');
  console.table(created.slice(0, 5));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
