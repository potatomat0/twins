
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://gkbcdqpkjxdjjgolvgeg.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYmNkcXBranhkampnb2x2Z2VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1NjU5NCwiZXhwIjoyMDcyOTMyNTk0fQ.Exxt1zhg8qnNv260sJPefLrwdFf-XqB4QtAdm2EotO8';
const DEFAULT_PASSWORD = 'Matkhautwins1!';

// PCA Constants (from services/pcaEvaluator.ts)
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

// Hobby Pool
const HOBBY_POOL = [
  "Hiking", "Anime", "Coding", "Cooking", "Travel", "Music", "Movies", "Reading", 
  "Gaming", "Yoga", "Photography", "Art", "Dance", "Swimming", "Running", "Cycling", 
  "Meditation", "Baking", "Gardening", "DIY"
];

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Helper: Calculate PCA
function calculatePca(scores: Record<Factor, number>): number[] {
  const centered = FACTORS.map((factor) => scores[factor] - MEAN[factor]);
  return COMPONENTS.map((component) => component.reduce((sum, weight, index) => sum + weight * centered[index], 0));
}

// Helper: Call Edge Function
async function callEdgeFunction(funcName: string, body: any) {
  try {
    const { data, error } = await supabase.functions.invoke(funcName, {
      body,
    });
    if (error) {
        // Try raw fetch if supabase client fails or for debugging
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${funcName}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Edge function ${funcName} failed: ${res.status} ${txt}`);
        }
        return await res.json();
    }
    return data;
  } catch (err: any) {
    console.error(`[Edge] Error calling ${funcName}:`, err.message);
    throw err;
  }
}

// Mock Embedding (Deterministic hash-based to avoid Edge Function crashes during seed)
function mockEmbed(text: string): number[] {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    const rng = () => {
        var t = hash += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    const vec: number[] = [];
    for (let i = 0; i < 384; i++) {
        vec.push(rng() * 2 - 1); // -1 to 1
    }
    // Normalize
    const mag = Math.sqrt(vec.reduce((sum, v) => sum + v*v, 0));
    return vec.map(v => v / mag);
}

// Main Seed Function
async function seed() {
  console.log('Starting seed...');

  for (let i = 1; i <= 20; i++) {
    const padded = i.toString().padStart(2, '0');
    const email = `mock_user_${padded}@example.com`;
    const password = DEFAULT_PASSWORD;
    const username = `MockUser${padded}`;
    const ageGroup = Math.random() > 0.5 ? '25-35' : '18-24';
    const gender = Math.random() > 0.5 ? 'Male' : 'Female';
    const elo = Math.floor(Math.random() * (1500 - 900 + 1)) + 900; // 900 - 1500

    // 1. Generate Personality
    const scores: Record<string, number> = {};
    FACTORS.forEach(f => scores[f] = Math.random()); // 0.0 to 1.0
    const pca = calculatePca(scores);

    // 2. Generate Hobbies
    const shuffledHobbies = [...HOBBY_POOL].sort(() => 0.5 - Math.random());
    const myHobbies = shuffledHobbies.slice(0, 3);
    const hobbyText = myHobbies.join(', ');

    console.log(`Creating ${email}...`);

    // 3. Create Auth User
    // Check if exists first to avoid error spam
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let userId = existingUsers.users.find(u => u.email === email)?.id;

    if (!userId) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { username }
        });
        if (authError) {
            console.error(`Failed to create auth user ${email}:`, authError.message);
            continue;
        }
        userId = authData.user.id;
    }

    // 4. Encrypt Scores
    // console.log(`  Encrypting scores...`);
    const scoreCrypto = await callEdgeFunction('score-crypto', { mode: 'encrypt', scores });
    if (!scoreCrypto?.cipher) {
        console.error('  Failed to encrypt scores');
        continue;
    }

    // 5. Encrypt Hobbies
    // console.log(`  Encrypting hobbies...`);
    const hobbyCrypto = await callEdgeFunction('score-crypto', { mode: 'encrypt', payload: myHobbies });
    if (!hobbyCrypto?.cipher) {
        console.error('  Failed to encrypt hobbies');
        continue;
    }

    // 6. Embed Hobbies (MOCKED for stability)
    // console.log(`  Embedding hobbies: "${hobbyText}"...`);
    const embedding = mockEmbed(hobbyText);

    // 7. Insert/Update Profile
    // console.log(`  Upserting profile...`);
    const profilePayload = {
        id: userId,
        username,
        age_group: ageGroup,
        gender,
        elo_rating: elo,
        match_allow_elo: true,
        character_group: 'Creator', // Random assignment for now
        // Personality
        pca_dim1: pca[0],
        pca_dim2: pca[1],
        pca_dim3: pca[2],
        pca_dim4: pca[3],
        b5_cipher: scoreCrypto.cipher,
        b5_iv: scoreCrypto.iv,
        // Hobbies
        // hobbies: [], // Plaintext cleared
        hobbies_cipher: hobbyCrypto.cipher,
        hobbies_iv: hobbyCrypto.iv,
        hobby_embedding: JSON.stringify(embedding), // Store as string if using supabase-js with vector
        avatar_url: null // Leave empty
    };

    const { error: dbError } = await supabase.from('profiles').upsert(profilePayload);
    
    if (dbError) {
        console.error(`  DB Error for ${email}:`, dbError.message);
    } else {
        console.log(`  Success! ELO: ${elo} Hobbies: ${hobbyText}`);
    }
  }
  
  console.log('Seeding complete.');
}

seed().catch(console.error);
