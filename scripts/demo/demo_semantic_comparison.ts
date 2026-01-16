import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase URL or Anon Key is missing in .env file');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- User Data ---
const users = [
  { name: 'User 1 (EN Outdoor)', hobbies: ['Hiking', 'Camping', 'Mountain Biking'] },
  { name: 'User 2 (VI Outdoor)', hobbies: ['Leo núi', 'Cắm trại', 'Chụp ảnh thiên nhiên'] },
  { name: 'User 3 (EN Creative)', hobbies: ['Painting', 'Digital Art', 'Reading Novels'] },
  { name: 'User 4 (VI Creative)', hobbies: ['Vẽ tranh', 'Đọc tiểu thuyết', 'Chơi piano'] },
  { name: 'User 5 (EN Tech)', hobbies: ['Programming', 'Building PCs', 'Sci-Fi Movies'] },
  { name: 'User 6 (VI Foodie)', hobbies: ['Nấu ăn', 'Làm bánh', 'Xem phim Hàn Quốc'] },
];

// --- Helper Functions ---

function getCosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * (vecB[i] || 0), 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

async function getHobbyEmbedding(hobbies: string[]): Promise<number[] | null> {
  if (hobbies.length === 0) return null;
  
  // *** FINAL FIX: Use only a comma-separated list of keywords ***
  const text = hobbies.join(', ');

  try {
    const { data, error } = await supabase.functions.invoke('embed', { body: { text } });
    if (error) throw error;
    return data?.embedding ?? null;
  } catch (err) {
    console.error(`Error getting embedding for [${hobbies.join(', ')}]:`, err);
    return null;
  }
}

// --- Main Execution ---

async function main() {
  console.log('--- Semantic Hobby Comparison Demo (v3: Keywords Only) ---');
  console.log('Comparing hobby vectors for all unique pairs of 6 users...\n');

  const embeddings: { [name: string]: number[] | null } = {};

  // Pre-fetch all embeddings to avoid redundant calls
  for (const user of users) {
    console.log(`Generating embedding for ${user.name}...`);
    embeddings[user.name] = await getHobbyEmbedding(user.hobbies);
  }

  const results: Array<{
    userA: (typeof users)[number];
    userB: (typeof users)[number];
    similarity: number;
  }> = [];

  // Generate all unique pairs and calculate similarity
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const userA = users[i];
      const userB = users[j];
      const vecA = embeddings[userA.name];
      const vecB = embeddings[userB.name];
      let similarity = 0;
      if (vecA && vecB) {
        similarity = getCosineSimilarity(vecA, vecB);
      }
      results.push({ userA, userB, similarity });
    }
  }

  // Sort results from highest to lowest similarity
  results.sort((a, b) => b.similarity - a.similarity);

  // Display sorted results
  console.log('\n--- Comparison Results (Sorted) ---\n');
  results.forEach((result, index) => {
    let title = `Comparing Pair: ${result.userA.name} vs. ${result.userB.name}`;
    if (index === 0) {
      title += ' (HIGHEST SIMILARITY)';
    }
    if (index === results.length - 1) {
      title += ' (LOWEST SIMILARITY)';
    }

    console.log('=======================================');
    console.log(title);
    console.log('---------------------------------------');
    console.log(`  Hobbies A: [${result.userA.hobbies.join(', ')}]`);
    console.log(`  Hobbies B: [${result.userB.hobbies.join(', ')}]`);
    console.log(`  => Semantic Similarity: ${result.similarity.toFixed(4)}`);
    console.log('=======================================');
    console.log(index === 0 || index === results.length - 2 ? '\n...' : ''); // Add spacer
  });
}

main().catch(console.error);
