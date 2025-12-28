#import "/template.typ": *

#[
  #set heading(numbering: none, supplement: [Phụ lục])
  = Phụ lục <phuluc>
]

#set heading(numbering: (..nums) => {
  nums = nums.pos()
  numbering("A.1.", ..nums.slice(1))
}, supplement: [Phụ lục])

#counter(heading).update(1)

== Bộ câu hỏi Big Five (Phiên bản Tiếng Anh)

Dưới đây là danh sách đầy đủ 50 câu hỏi Big Five (IPIP-50) được sử dụng trong hệ thống.

#v(1em)

// Sử dụng grid đơn giản thay vì table/figure để tránh lỗi dàn trang
#grid(
  columns: (auto, 1fr),
  gutter: 1em,
  align: (right, left),
  [*1.*], [I am the life of the party.],
  [*2.*], [I feel little concern for others.],
  [*3.*], [I am always prepared.],
  [*4.*], [I get stressed out easily.],
  [*5.*], [I have a rich vocabulary.],
  [*6.*], [I don't talk a lot.],
  [*7.*], [I am interested in people.],
  [*8.*], [I leave my belongings around.],
  [*9.*], [I am relaxed most of the time.],
  [*10.*], [I have difficulty understanding abstract ideas.],
  [*11.*], [I feel comfortable around people.],
  [*12.*], [I insult people.],
  [*13.*], [I pay attention to details.],
  [*14.*], [I worry about things.],
  [*15.*], [I have a vivid imagination.],
  [*16.*], [I keep in the background.],
  [*17.*], [I sympathize with others' feelings.],
  [*18.*], [I make a mess of things.],
  [*19.*], [I seldom feel blue.],
  [*20.*], [I am not interested in abstract ideas.],
  [*21.*], [I start conversations.],
  [*22.*], [I am not interested in other people's problems.],
  [*23.*], [I get chores done right away.],
  [*24.*], [I am easily disturbed.],
  [*25.*], [I have excellent ideas.],
  [*26.*], [I have little to say.],
  [*27.*], [I have a soft heart.],
  [*28.*], [I often forget to put things back in their proper place.],
  [*29.*], [I get upset easily.],
  [*30.*], [I do not have a good imagination.],
  [*31.*], [I talk to a lot of different people at parties.],
  [*32.*], [I am not really interested in others.],
  [*33.*], [I like order.],
  [*34.*], [I change my mood a lot.],
  [*35.*], [I am quick to understand things.],
  [*36.*], [I don’t like to draw attention to myself.],
  [*37.*], [I take time out for others.],
  [*38.*], [I shirk my duties.],
  [*39.*], [I have frequent mood swings.],
  [*40.*], [I use difficult words.],
  [*41.*], [I don't mind being the center of attention.],
  [*42.*], [I feel others' emotions.],
  [*43.*], [I follow a schedule.],
  [*44.*], [I get irritated easily.],
  [*45.*], [I spend time reflecting on things.],
  [*46.*], [I am quiet around strangers.],
  [*47.*], [I make people feel at ease.],
  [*48.*], [I am exacting in my work.],
  [*49.*], [I often feel blue.],
  [*50.*], [I am full of ideas.]
)

#pagebreak()

== Mã nguồn một số hàm quan trọng

Phần này trình bày mã nguồn của các hàm thực thi biên (Edge Functions) quan trọng và các chính sách bảo mật cơ sở dữ liệu (RLS Policies).

=== Mã hóa và Giải mã dữ liệu (score-crypto)

Hàm này xử lý việc mã hoá và giải mã dữ liệu nhạy cảm sử dụng thuật toán AES-256-GCM.

```ts
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
type Scores = Record<string, number>;
function toBytes(str: string) {
  return new TextEncoder().encode(str);
}
function fromBase64(b64: string) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function toBase64(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  arr.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}
async function importKey(reqId: string) {
  const secret = Deno.env.get('B5_ENCRYPTION_KEY');
  if (!secret) throw new Error('Missing B5_ENCRYPTION_KEY secret');
  const keyBytes = fromBase64(secret);
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function encrypt(data: unknown, reqId: string) {
  const key = await importKey(reqId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = toBytes(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
  return { cipher: toBase64(cipher), iv: toBase64(iv) };
}
async function decrypt(cipherText: string, ivB64: string, reqId: string) {
  const key = await importKey(reqId);
  const cipherBytes = fromBase64(cipherText);
  const iv = fromBase64(ivB64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
  const decoded = new TextDecoder().decode(plain);
  return JSON.parse(decoded);
}
serve(async (req) => {
  // ... (Request handling logic omitted)
});
```

=== Thuật toán Gợi ý người dùng (recommend-users)

Hàm này tính toán độ tương đồng cosine trên không gian PCA-4 và vector sở thích, kết hợp điểm ELO.

```ts
// ... imports
function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
function eloProximity(rA: number, rB: number, sigma = 400) {
  const diff = Math.abs(rA - rB);
  return Math.exp(-diff / sigma);
}
serve(async (req) => {
  // ... (Setup and data fetching)
  // Scoring logic within the loop:
  /*
      let pcaSim = Math.max(0, Math.min(1, cosine(meVec, vec)));
      if (allowElo) {
          const prox = eloProximity(meElo, cElo);
          // With Hobbies: PCA 50%, ELO 20%, Hobbies 30%
          score = 0.5 * pcaSim + 0.2 * prox + 0.3 * hSim;
      } else {
          // Without ELO: PCA 55%, Hobbies 45%
          score = 0.55 * pcaSim + 0.45 * hSim;
      }
  */
  // ... (Sorting and pagination)
});
```

=== Cập nhật ELO và Tương tác (match-update)

Hàm xử lý like/skip, cập nhật ELO và tạo match.

```ts
const K_FACTOR = 12;
function expectedScore(rA: number, rB: number) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}
function clampElo(r: number) {
  return Math.max(800, Math.min(2000, r));
}
function updateRatings(rA: number, rB: number, outcome: 'like' | 'skip', k = K_FACTOR) {
  const Ea = expectedScore(rA, rB);
  const Eb = expectedScore(rB, rA);
  if (outcome === 'like') {
    // Cooperative: both gain modestly toward an expected win
    const newA = clampElo(rA + k * (1 - Ea));
    const newB = clampElo(rB + k * (1 - Eb));
    return { newA, newB };
  }
  // Skip: penalize actor only
  const newA = clampElo(rA + k * (0 - Ea));
  return { newA, newB: rB };
}
// ... (Database transaction handling)
```

=== Chính sách bảo mật cơ sở dữ liệu (RLS Policies)

```sql
-- Users can only read/update their own profile
create policy profiles_is_owner on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Users can only see matches where they are a participant
create policy match_select on public.matches
  for select using (auth.uid() = user_a or auth.uid() = user_b);

-- Only service_role (Edge Functions) can insert new matches
create policy match_insert on public.matches
  for insert with check (auth.role() = 'service_role');
```

== Mã nguồn kịch bản kiểm thử (Benchmarks)

Đây là mã nguồn của các công cụ kiểm thử tự động được sử dụng để thu thập số liệu cho Chương 6. Các thông tin nhạy cảm đã được ẩn.

=== Script tạo dữ liệu mẫu và đo hiệu năng Upsert (seedMockProfiles.ts)

```ts
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = '...HIDDEN...';
const SERVICE_KEY = '...HIDDEN...';
const DEFAULT_PASSWORD = '...HIDDEN...';

// ... (PCA Constants & Helpers omitted)

async function createUser(email: string, username: string, pca: number[], elo: number, hobbies: string[]) {
    const startTotal = performance.now();

    // 1. Auth Creation
    // ... (Auth Logic)

    // 2. Encrypt Scores
    // ... (Call Edge Function)    
    // 3. Hobbies
    // ... (Call Edge Function)
    
    // 4. Upsert Profile
    const profilePayload = {
        id: userId,
        // ... (Payload construction)
    };

    const { error: dbError } = await supabase.from('profiles').upsert(profilePayload);
    
    const endTotal = performance.now();
    const duration = endTotal - startTotal;
    stats.push(duration); // Collect stats
}

async function seed() {
    console.log('--- STARTING PERFORMANCE SEED ---');
    // ... (Loop to create users)
}
```

=== Script kiểm thử kịch bản Viewer (benchmark_scenarios.ts)

```ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = '...HIDDEN...';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function benchmark() {
    console.log('\n--- SCENARIO BENCHMARK: VIEWER FLOW ---');

    // 1. LOGIN
    const tLoginStart = performance.now();
    const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
        email: 'viewer@test.com',
        password: '...HIDDEN...'
    });
    const tLoginEnd = performance.now();
    console.log(`[Login] Latency: ${(tLoginEnd - tLoginStart).toFixed(2)}ms`);

    // 2. RECOMMENDATION (Cold/Warm)
    const tRecStart = performance.now();
    const { data: recData, error: recError } = await supabase.functions.invoke('recommend-users', {
        body: { 
            userId: auth.user.id, 
            useElo: true, 
            useHobbies: true,
            filters: {} 
        } 
    });
    const tRecEnd = performance.now();
    console.log(`[Recommend] Latency: ${(tRecEnd - tRecStart).toFixed(2)}ms`);

    // ... (Log Top 5 / Bottom 5)

    // 3. INTERACTION (Like/Skip)
    // ... (Call match-update Edge Function and measure time)
}

benchmark();
```

== Kỹ thuật tối ưu hóa cơ sở dữ liệu

Dưới đây là mã nguồn SQL được sử dụng để tối ưu hoá hiệu năng cho các chính sách bảo mật hàng (RLS) và tăng tốc độ truy vấn thông qua chỉ mục (Index).

```sql
-- 1. Tối ưu hoá RLS bằng cách sử dụng subquery để cache auth.uid()
DROP POLICY IF EXISTS "profiles_is_owner" ON public.profiles;
CREATE POLICY "profiles_is_owner_optimized" ON public.profiles
FOR ALL USING ( id = (select auth.uid()) );

-- 2. Gộp các chính sách SELECT thừa trên bảng matches
DROP POLICY IF EXISTS "match_select" ON public.matches;
DROP POLICY IF EXISTS "realtime_matches_select" ON public.matches;
CREATE POLICY "matches_select_optimized" ON public.matches
FOR SELECT USING ( 
  user_a = (select auth.uid()) OR 
  user_b = (select auth.uid()) 
);

-- 3. Bổ sung chỉ mục (Index) cho các cột lọc và liên kết quan trọng
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON public.matches(user_a);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON public.matches(user_b);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_age_group ON public.profiles(age_group);
```
