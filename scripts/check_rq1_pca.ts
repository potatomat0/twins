import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

async function checkRQ1() {
  console.log('--- RQ1: PCA SIMILARITY VERIFICATION ---');
  
  const { data, error } = await supabase.from('profiles')
    .select('username, pca_dim1, pca_dim2, pca_dim3, pca_dim4')
    .in('username', ['similar_a', 'similar_b']);

  if (error || !data || data.length < 2) {
    // Nếu chưa có similar_a/b (do script seed dùng Viewer), tôi sẽ dùng các user tương ứng trong kịch bản Smart Test
    const { data: smartData, error: smartErr } = await supabase.from('profiles')
      .select('username, pca_dim1, pca_dim2, pca_dim3, pca_dim4')
      .in('username', ['Viewer', 'Match_PCA']);
    
    if (smartErr) {
        console.error('Error:', smartErr.message);
        return;
    }
    calculate(smartData[0], smartData[1]);
  } else {
    calculate(data[0], data[1]);
  }
}

function calculate(u1: any, u2: any) {
    const v1 = [u1.pca_dim1, u1.pca_dim2, u1.pca_dim3, u1.pca_dim4];
    const v2 = [u2.pca_dim1, u2.pca_dim2, u2.pca_dim3, u2.pca_dim4];
    
    let dot = 0, n1 = 0, n2 = 0;
    for (let i = 0; i < 4; i++) {
        dot += v1[i] * v2[i];
        n1 += v1[i] * v1[i];
        n2 += v2[i] * v2[i];
    }
    const sim = dot / (Math.sqrt(n1) * Math.sqrt(n2));
    
    console.log(`User 1: ${u1.username} | Vector: [${v1.map(v => v.toFixed(3))}]`);
    console.log(`User 2: ${u2.username} | Vector: [${v2.map(v => v.toFixed(3))}]`);
    console.log(`Cosine Similarity: ${sim.toFixed(6)}`);
}

checkRQ1();
