import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://gkbcdqpkjxdjjgolvgeg.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYmNkcXBranhkampnb2x2Z2VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1NjU5NCwiZXhwIjoyMDcyOTMyNTk0fQ.Exxt1zhg8qnNv260sJPefLrwdFf-XqB4QtAdm2EotO8';
const DEFAULT_PASSWORD = 'Matkhautwins1!';

// PCA Constants
const FACTORS = ['Extraversion', 'Agreeableness', 'Conscientiousness', 'Emotional Stability', 'Intellect/Imagination'] as const;
type Factor = typeof FACTORS[number];

const MEAN: Record<Factor, number> = {
  Extraversion: 0.6968, Agreeableness: 0.6723, Conscientiousness: 0.7339,
  'Emotional Stability': 0.7019, 'Intellect/Imagination': 0.5743,
};

const COMPONENTS: number[][] = [
  [-0.218, -0.439, -0.085, -0.477, 0.724],
  [-0.311, 0.675, 0.377, -0.550, -0.002],
  [0.714, 0.055, 0.591, 0.067, 0.362],
  [-0.137, 0.528, -0.301, 0.517, 0.585],
];

// Hobby Pool
const HOBBY_POOL = [
  "Hiking", "Anime", "Coding", "Cooking", "Travel", "Music", "Movies", "Reading", 
  "Gaming", "Yoga", "Photography", "Art", "Dance", "Swimming", "Running", "Cycling", 
  "Meditation", "Baking", "Gardening", "DIY"
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function calculatePca(scores: Record<Factor, number>): number[] {
  const centered = FACTORS.map((factor) => scores[factor] - MEAN[factor]);
  return COMPONENTS.map((component) => component.reduce((sum, weight, index) => sum + weight * centered[index], 0));
}

async function callEdgeFunction(funcName: string, body: any) {
  try {
    const { data, error } = await supabase.functions.invoke(funcName, { body });
    if (error) throw error;
    return data;
  } catch (err: any) {
    // console.error(`[Edge] Error calling ${funcName}:`, err.message);
    return null; 
  } 
}

// Stats collector
const stats: number[] = [];

async function createUser(email: string, username: string, pca: number[], elo: number, hobbies: string[]) {
    const startTotal = performance.now();

    // 1. Auth Creation
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let userId = existingUsers.users.find(u => u.email === email)?.id;

    if (!userId) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: { username }
        });
        if (authError) {
            console.error(`  Failed auth ${email}:`, authError.message);
            return null;
        }
        userId = authData.user.id;
    }

    // 2. Encrypt Scores
    const dummyScores: any = {};
    FACTORS.forEach(f => dummyScores[f] = 0.5);
    const scoreCrypto = await callEdgeFunction('score-crypto', { mode: 'encrypt', scores: dummyScores });
    
    // 3. Hobbies
    const hobbyCrypto = await callEdgeFunction('score-crypto', { mode: 'encrypt', payload: hobbies });
    const hobbyText = hobbies.join(', ');
    const embedRes = await callEdgeFunction('embed', { text: hobbyText });
    
    // 4. Upsert Profile
    const profilePayload = {
        id: userId,
        username,
        age_group: '18-24',
        gender: 'Non-Binary',
        elo_rating: elo,
        match_allow_elo: true,
        character_group: 'Tester',
        pca_dim1: pca[0],
        pca_dim2: pca[1],
        pca_dim3: pca[2],
        pca_dim4: pca[3],
        b5_cipher: scoreCrypto?.cipher,
        b5_iv: scoreCrypto?.iv,
        hobbies_cipher: hobbyCrypto?.cipher,
        hobbies_iv: hobbyCrypto?.iv,
        hobby_embedding: embedRes?.embedding ? JSON.stringify(embedRes.embedding) : null,
        avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`
    };

    const { error: dbError } = await supabase.from('profiles').upsert(profilePayload);
    
    const endTotal = performance.now();
    const duration = endTotal - startTotal;
    stats.push(duration);

    if (dbError) {
        console.error(`  ❌ DB Error ${username}:`, dbError.message);
    } else {
        console.log(`  ✅ ${username.padEnd(15)} | Time: ${duration.toFixed(2)}ms | ELO: ${elo} | Hobbies: [${hobbyText}]`);
    }
    return userId;
}

async function seed() {
    console.log('--- STARTING PERFORMANCE SEED ---');
    console.log('Each user creation involves: Auth -> Edge Encrypt (x2) -> Edge Embed -> DB Upsert\n');

    // Smart Test Case
    await createUser('viewer@test.com', 'Viewer', [0.5, 0.5, 0.5, 0.5], 1500, ['Coding', 'Music']);
    await createUser('match_pca@test.com', 'Match_PCA', [0.51, 0.49, 0.5, 0.5], 1200, ['Swimming', 'Dance']);
    await createUser('match_hobby@test.com', 'Match_Hobby', [-0.5, -0.5, -0.5, -0.5], 1200, ['Coding', 'Music', 'Gaming']);
    await createUser('match_elo@test.com', 'Match_ELO', [-0.5, -0.5, -0.5, -0.5], 1500, ['Hiking', 'Travel']);

    // Random Users (6 more to make 10 total)
    for (let i = 1; i <= 6; i++) {
        const scores: any = {};
        FACTORS.forEach(f => scores[f] = Math.random());
        const pca = calculatePca(scores);
        const shuffled = [...HOBBY_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
        const elo = Math.floor(Math.random() * (1500 - 900 + 1)) + 900;
        await createUser(`mock_${i}@test.com`, `MockUser${i}`, pca, elo, shuffled);
    }

    const avg = stats.reduce((a, b) => a + b, 0) / stats.length;
    const min = Math.min(...stats);
    const max = Math.max(...stats);

    console.log('\n--- PERFORMANCE SUMMARY ---');
    console.log(`Total Users: ${stats.length}`);
    console.log(`Average Time: ${avg.toFixed(2)} ms`);
    console.log(`Min Time:     ${min.toFixed(2)} ms`);
    console.log(`Max Time:     ${max.toFixed(2)} ms`);
}

seed().catch(console.error);
