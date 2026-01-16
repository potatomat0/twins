import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://gkbcdqpkjxdjjgolvgeg.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requires service role for auth/upsert
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SERVICE_KEY || !ANON_KEY) {
    console.error('Missing keys in environment. Please provide SUPABASE_SERVICE_ROLE_KEY and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);

// PCA Constants (Mirrored from services/pcaEvaluator.ts)
const FACTORS = ['Extraversion', 'Agreeableness', 'Conscientiousness', 'Emotional Stability', 'Intellect/Imagination'] as const;
type Factor = typeof FACTORS[number];

const MEAN: Record<Factor, number> = {
  Extraversion: 0.6968074677391889,
  Agreeableness: 0.6723287115524996,
  Conscientiousness: 0.7339413345134549,
  'Emotional Stability': 0.7019984402438775,
  'Intellect/Imagination': 0.574399184761682,
};

const COMPONENTS: number[][] = [
  [-0.2180412943906895, -0.4394034997412539, -0.08520712181270074, -0.47711527324537323, 0.724212207011149],
  [-0.3117689149624214, 0.6759383122168042, 0.3775570625284317, -0.5507753052872655, -0.00218388673574868],
  [0.714593176383529, 0.055294593280118265, 0.5917022377547896, 0.06753540151161957, 0.3628037094610858],
  [-0.13712625316926405, 0.5289535935768106, -0.3017073400631589, 0.5176376086048503, 0.5851738832550566],
];

function projectToPca(scores: Record<Factor, number>): number[] {
  const centered = FACTORS.map((f) => scores[f] - MEAN[f]);
  return COMPONENTS.map((comp) => comp.reduce((sum, w, i) => sum + w * centered[i], 0));
}

async function verify() {
    console.log('--- PCA SIMILARITY PIPELINE VERIFICATION ---');

    const userA_Scores: Record<Factor, number> = {
        Extraversion: 0.5, Agreeableness: 0.5, Conscientiousness: 0.5, 'Emotional Stability': 0.5, 'Intellect/Imagination': 0.5
    };
    const userB_Scores: Record<Factor, number> = {
        Extraversion: 0.51, Agreeableness: 0.49, Conscientiousness: 0.5, 'Emotional Stability': 0.5, 'Intellect/Imagination': 0.5
    };

    const pcaA = projectToPca(userA_Scores);
    const pcaB = projectToPca(userB_Scores);

    console.log(`User A PCA: [${pcaA.map(v => v.toFixed(4)).join(', ')}]`);
    console.log(`User B PCA: [${pcaB.map(v => v.toFixed(4)).join(', ')}]`);

    // Call score-crypto for User A
    console.log('\nEncrypting scores via Edge Function...');
    const { data: cryptoA, error: cryptoErr } = await supabaseAnon.functions.invoke('score-crypto', {
        body: { mode: 'encrypt', scores: userA_Scores }
    });

    if (cryptoErr) throw cryptoErr;

    // Upsert User A (Simulator)
    const { data: userData } = await supabase.auth.admin.listUsers();
    let userIdA = userData.users.find(u => u.email === 'sim_user_a@test.com')?.id;
    if (!userIdA) {
        const { data: newU } = await supabase.auth.admin.createUser({
            email: 'sim_user_a@test.com', password: 'TemporaryPass123!', email_confirm: true
        });
        userIdA = newU.user!.id;
    }

    await supabase.from('profiles').upsert({
        id: userIdA,
        username: 'Sim_User_A',
        pca_dim1: pcaA[0], pca_dim2: pcaA[1], pca_dim3: pcaA[2], pca_dim4: pcaA[3],
        b5_cipher: cryptoA.cipher, b5_iv: cryptoA.iv,
        elo_rating: 1500
    });

    // Similarity calculation logic
    const calculateCosine = (a, b) => {
        const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
        const magA = Math.sqrt(a.reduce((sum, v) => sum + v*v, 0));
        const magB = Math.sqrt(b.reduce((sum, v) => sum + v*v, 0));
        return dot / (magA * magB);
    };

    const similarity = calculateCosine(pcaA, pcaB);
    console.log(`\nResulting Similarity: ${similarity.toFixed(6)}`);
    console.log('Verification Complete.');
}

verify().catch(console.error);
