#import "/template.typ": *

#[
  #set heading(numbering: none, supplement: [Phụ lục])
  = Phụ lục <phuluc>
]

#set heading(numbering: (..nums) => {
  nums = nums.pos()
  numbering("A.1.", ..nums.slice(1))
}, supplement: [Phụ lục])

// Cho phép các hình (figure) chứa mã nguồn và bảng biểu có thể ngắt trang
#show figure: set block(breakable: true)

#counter(heading).update(1)

== Thông tin về mã nguồn và cơ sở dữ liệu

Toàn bộ hệ thống mã nguồn, quy trình hiện thực và dữ liệu thực nghiệm của đề tài được lưu trữ tại kho lưu trữ (repository) cá nhân. Để phục vụ công tác thẩm định, mã nguồn được cung cấp đính kèm cùng báo cáo hoặc có thể truy cập trực tuyến (đối với thành viên được cấp quyền) tại đường dẫn:

- *Đường dẫn:* #link("https://github.com/potatomat0/twins")[https://github.com/potatomat0/twins]

Cấu trúc chính của kho lưu trữ bao gồm:
- `/components`: Chứa mã nguồn các màn hình (Screens) và thành phần UI dùng chung. Các màn hình chính như `QuestionnaireScreen.tsx` (thu thập tính cách), `ExploreSwipeScreen.tsx` (giao diện lướt), và `MatchesScreen.tsx` được tổ chức tại đây.
- `/services`: Chứa các logic tích hợp ngoại vi. Quan trọng nhất là `supabase.ts` (quản lý kết nối dữ liệu), `pcaEvaluator.ts` (xử lý biến đổi PCA trên thiết bị), và `scoreCrypto.ts` (giao tiếp với Edge Functions để mã hoá).
- `/store`: Quản lý trạng thái ứng dụng bằng thư viện Zustand. Các kho lưu trữ như `messagesStore.ts` và `notificationStore.ts` giúp đồng bộ dữ liệu thời gian thực mà không cần reload trang.
- `/supabase/functions`: Chứa mã nguồn các hàm Edge Functions chạy trên môi trường Deno. Đây là nơi thực hiện các tác vụ nhạy cảm như mã hoá (score-crypto) và logic giới thiệu phức tạp (recommend-users).
- `/supabase/migrations`: Lưu trữ lịch sử thay đổi cấu trúc DB (Schema) dưới dạng các file SQL. Các chính sách bảo mật RLS được định nghĩa và quản lý tập trung tại đây để đảm bảo tính nhất quán giữa môi trường phát triển và thực tế.
- `/scripts`: Các kịch bản TypeScript/Bash dùng để khởi tạo dữ liệu mẫu (seeding), kiểm tra tính đúng đắn của schema và thực hiện các bài đo hiệu năng (benchmarking) hệ thống.
- `/data`: Chứa các bộ dữ liệu tĩnh như ngân hàng câu hỏi Big Five và các hằng số tính điểm.
- `/model`: Chứa notebook Jupyter (`pca_evaluator.ipynb`) được sử dụng để phân tích dữ liệu khám phá (EDA) và tính toán các trọng số toán học (Mean, Components) cho mô hình PCA-4.
- `/assets`: Lưu trữ tài nguyên tĩnh của ứng dụng (hình ảnh, icon, âm thanh) và mô hình machine learning thu gọn (`pca_evaluator_4d.tflite`).

== Quy trình phân tích và tính toán trọng số PCA

Mô hình PCA-4 trong hệ thống không được xây dựng như một mô hình học sâu (deep learning) "hộp đen", mà là một phép biến đổi toán học xác định. Quy trình tìm ra các hệ số biến đổi được thực hiện trong file `model/pca_evaluator.ipynb` với các bước chính sau:

1.  *Phân tích dữ liệu khám phá (EDA)*: Sử dụng tập dữ liệu công khai gồm hơn 300.000 bản ghi để khảo sát phân phối của 5 đặc điểm tính cách Big Five. Kết quả cho thấy các trait có phân phối chuẩn và ổn định trên nhiều quốc gia.
2.  *Tính toán hằng số trung bình (Mean)*: Xác định giá trị trung bình của từng trait trên quy mô lớn để làm điểm gốc cho phép trừ chuẩn hóa ($x - mu$).
3.  *Trích xuất ma trận thành phần (Components)*: Sử dụng thuật toán Phân tích Thành phần chính (Principal Component Analysis) để tìm ra ma trận chiếu $W$ giúp giữ lại hơn 90% phương sai dữ liệu trong khi giảm từ 5 chiều xuống 4 chiều.

Các tham số này ($mu$ và $W$) sau đó được viết trực tiếp vào mã nguồn của service `pcaEvaluator.ts` để thực hiện tính toán ngay trên thiết bị người dùng mà không cần kết nối internet hay máy chủ xử lý ML phức tạp. Quy trình này đảm bảo tính minh bạch, tốc độ xử lý tức thời và bảo vệ quyền riêng tư tuyệt đối.

== Bộ câu hỏi Big Five (IPIP-50) Anh - Việt

Danh sách đầy đủ 50 câu hỏi Big Five được trích xuất từ bộ dấu hiệu IPIP (International Personality Item Pool) @goldberg1992ipip kèm theo bản tạm dịch tiếng Việt được sử dụng trong hệ thống. Dữ liệu này được trình bày tại #ref(<tab_ipip_questions>):

#v(1em)

#figure(
  table(
    columns: (auto, 1fr, 1fr),
    inset: 0.8em,
    align: (right, left, left),
    table.header([*STT*], [*Phiên bản Tiếng Anh*], [*Bản tạm dịch Tiếng Việt*]),
    [*1.*], [I am the life of the party.], [Tôi là trung tâm của bữa tiệc.],
    [*2.*], [I feel little concern for others.], [Tôi ít quan tâm đến người khác.],
    [*3.*], [I am always prepared.], [Tôi luôn chuẩn bị sẵn sàng.],
    [*4.*], [I get stressed out easily.], [Tôi dễ bị căng thẳng.],
    [*5.*], [I have a rich vocabulary.], [Tôi có vốn từ vựng phong phú.],
    [*6.*], [I don't talk a lot.], [Tôi không nói nhiều.],
    [*7.*], [I am interested in people.], [Tôi quan tâm đến mọi người.],
    [*8.*], [I leave my belongings around.], [Tôi hay để đồ đạc lung tung.],
    [*9.*], [I am relaxed most of the time.], [Tôi thấy thư giãn hầu hết thời gian.],
    [*10.*], [I have difficulty understanding abstract ideas.], [Tôi gặp khó khăn khi hiểu các ý tưởng trừu tượng.],
    [*11.*], [I feel comfortable around people.], [Tôi cảm thấy thoải mái khi ở gần mọi người.],
    [*12.*], [I insult people.], [Tôi xúc phạm người khác.],
    [*13.*], [I pay attention to details.], [Tôi chú ý đến chi tiết.],
    [*14.*], [I worry about things.], [Tôi lo lắng về mọi thứ.],
    [*15.*], [I have a vivid imagination.], [Tôi có trí tưởng tượng sống động.],
    [*16.*], [I keep in the background.], [Tôi thích ở phía sau.],
    [*17.*], [I sympathize with others' feelings.], [Tôi thông cảm với cảm xúc của người khác.],
    [*18.*], [I make a mess of things.], [Tôi làm mọi thứ rối tung lên.],
    [*19.*], [I seldom feel blue.], [Tôi hiếm khi cảm thấy buồn.],
    [*20.*], [I am not interested in abstract ideas.], [Tôi không quan tâm đến các ý tưởng trừu tượng.],
    [*21.*], [I start conversations.], [Tôi bắt đầu cuộc trò chuyện.],
    [*22.*], [I am not interested in other people's problems.], [Tôi không quan tâm đến vấn đề của người khác.],
    [*23.*], [I get chores done right away.], [Tôi hoàn thành công việc ngay lập tức.],
    [*24.*], [I am easily disturbed.], [Tôi dễ bị xáo trộn.],
    [*25.*], [I have excellent ideas.], [Tôi có những ý tưởng tuyệt vời.],
    [*26.*], [I have little to say.], [Tôi có ít điều để nói.],
    [*27.*], [I have a soft heart.], [Tôi có trái tim mềm mỏng.],
    [*28.*], [I often forget to put things back in their proper place.], [Tôi thường quên để đồ đạc vào đúng chỗ.],
    [*29.*], [I get upset easily.], [Tôi dễ nổi cáu.],
    [*30.*], [I do not have a good imagination.], [Tôi không có trí tưởng tượng tốt.],
    [*31.*], [I talk to a lot of different people at parties.], [Tôi nói chuyện với nhiều người khác nhau trong bữa tiệc.],
    [*32.*], [I am not really interested in others.], [Tôi thực sự không quan tâm đến người khác.],
    [*33.*], [I like order.], [Tôi thích sự ngăn nắp.],
    [*34.*], [I change my mood a lot.], [Tôi thay đổi tâm trạng nhiều.],
    [*35.*], [I am quick to understand things.], [Tôi hiểu mọi thứ nhanh chóng.],
    [*36.*], [I don’t like to draw attention to myself.], [Tôi không thích thu hút sự chú ý.],
    [*37.*], [I take time out for others.], [Tôi dành thời gian cho người khác.],
    [*38.*], [I shirk my duties.], [Tôi trốn tránh trách nhiệm.],
    [*39.*], [I have frequent mood swings.], [Tôi có những thay đổi tâm trạng thường xuyên.],
    [*40.*], [I use difficult words.], [Tôi sử dụng từ ngữ khó.],
    [*41.*], [I don't mind being the center of attention.], [Tôi không ngại là trung tâm chú ý.],
    [*42.*], [I feel others' emotions.], [Tôi cảm nhận được cảm xúc của người khác.],
    [*43.*], [I follow a schedule.], [Tôi tuân theo lịch trình.],
    [*44.*], [I get irritated easily.], [Tôi dễ bị khó chịu.],
    [*45.*], [I spend time reflecting on things.], [Tôi dành thời gian suy ngẫm về mọi thứ.],
    [*46.*], [I am quiet around strangers.], [Tôi im lặng khi ở gần người lạ.],
    [*47.*], [I make people feel at ease.], [Tôi làm cho mọi người cảm thấy thoải mái.],
    [*48.*], [I am exacting in my work.], [Tôi nghiêm khắc trong công việc.],
    [*49.*], [I often feel blue.], [Tôi thường cảm thấy buồn.],
    [*50.*], [I am full of ideas.], [Tôi tràn đầy ý tưởng.]
  ),
  caption: [Danh sách 50 câu hỏi Big Five (IPIP-50) Anh - Việt],
) <tab_ipip_questions>

#pagebreak()

== Mã nguồn thực nghiệm và các hàm quan trọng

Phần này trình bày mã nguồn của các kịch bản thực nghiệm và hàm thực thi biên (Edge Functions) quan trọng. Toàn bộ các hình khối mã nguồn dưới đây đã được cấu hình để có thể ngắt trang tự động nhằm đảm bảo tính toàn vẹn của dữ liệu.

=== Kịch bản kiểm chứng độ tương đồng PCA toàn trình

Kịch bản `scripts/verify_similarity_pipeline.ts` được sử dụng để kiểm chứng giả thuyết RQ1 tại Chương 6. Script thực hiện luồng từ điểm Big Five thô -> Chuyển đổi PCA -> Mã hoá -> Lưu trữ DB -> Tính toán tương đồng.

#outline_algo(
```ts
import { createClient } from '@supabase/supabase-js';
// ... (Hằng số MEAN và COMPONENTS trích từ pcaEvaluator.ts)

function projectToPca(scores: Record<Factor, number>): number[] {
  const centered = FACTORS.map((f) => scores[f] - MEAN[f]);
  return COMPONENTS.map((comp) => comp.reduce((sum, w, i) => sum + w * centered[i], 0));
}

async function verify() {
    const userA_Scores = { Extraversion: 0.5, Agreeableness: 0.5, Conscientiousness: 0.5, 'Emotional Stability': 0.5, 'Intellect/Imagination': 0.5 };
    const userB_Scores = { Extraversion: 0.51, Agreeableness: 0.49, Conscientiousness: 0.5, 'Emotional Stability': 0.5, 'Intellect/Imagination': 0.5 };

    const pcaA = projectToPca(userA_Scores);
    const pcaB = projectToPca(userB_Scores);

    // Mã hoá User A qua Edge Function
    const { data: cryptoA } = await supabase.functions.invoke('score-crypto', {
        body: { mode: 'encrypt', scores: userA_Scores }
    });

    // Upsert User A vào database để mô phỏng đăng ký
    await supabase.from('profiles').upsert({
        id: userIdA, username: 'Sim_User_A',
        pca_dim1: pcaA[0], pca_dim2: pcaA[1], pca_dim3: pcaA[2], pca_dim4: pcaA[3],
        b5_cipher: cryptoA.cipher, b5_iv: cryptoA.iv,
        elo_rating: 1500
    });

    // Truy vấn độ tương đồng (Sử dụng manual calculation để kiểm chứng logic DB)
    const similarity = calculateCosine(pcaA, pcaB);
    console.log(`Resulting Similarity: ${similarity.toFixed(6)}`);
}
```,
[Kịch bản kiểm chứng độ tương đồng PCA toàn trình],
<algo_verify_pipeline_code>
)

=== Mã hóa và Giải mã dữ liệu (score-crypto)

Hàm xử lý việc bảo mật dữ liệu nhạy cảm sử dụng thuật toán AES-256-GCM tại Edge.

#outline_algo(
```ts
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
// ... (Logic helpers toBytes, fromBase64, toBase64)

async function importKey() {
  const secret = Deno.env.get('B5_ENCRYPTION_KEY');
  const keyBytes = fromBase64(secret);
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encrypt(data: unknown) {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = toBytes(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
  return { cipher: toBase64(cipher), iv: toBase64(iv) };
}

serve(async (req) => {
  const { mode, scores, payload } = await req.json();
  if (mode === 'encrypt') {
    const res = await encrypt(scores || payload);
    return new Response(JSON.stringify(res), { headers: { 'Content-Type': 'application/json' } });
  }
  // ... (Decrypt logic)
});
```,
[Hiện thực hàm mã hoá và giải mã điểm tính cách],
<algo_score_crypto_code>
)

=== Thuật toán Giới thiệu người dùng lai (recommend-users)

Hàm thực hiện xếp hạng ứng viên dựa trên PCA, ELO và Hobbies.

#outline_algo(
```ts
// ... imports
function eloProximity(rA: number, rB: number, sigma = 400) {
  return Math.exp(-Math.abs(rA - rB) / sigma);
}

serve(async (req) => {
  const { userId, useElo, useHobbies } = await req.json();
  // ... (Data fetching for me and candidates)
  
  const score = (pcaSim, prox, hSim) => {
      if (useElo && useHobbies) return 0.5 * pcaSim + 0.2 * prox + 0.3 * hSim;
      if (useElo) return 0.8 * pcaSim + 0.2 * prox;
      return pcaSim;
  };
  
  // ... (Mapping and sorting logic)
});
```,
[Hiện thực hàm giới thiệu người dùng lai],
<algo_recommend_users_code>
)

== Kịch bản đo hiệu năng hệ thống (Benchmarks)

Kịch bản `scripts/benchmark_scenarios.ts` đã được cập nhật để đo lường chi tiết độ trễ của các thành phần Edge Functions riêng lẻ, phục vụ dữ liệu cho RQ3.

#outline_algo(
```ts
async function benchmark() {
    // 1. LOGIN
    const tLoginStart = performance.now();
    await supabase.auth.signInWithPassword({ email: 'viewer@test.com', password: '...' });
    console.log(`[Login] Latency: ${performance.now() - tLoginStart}ms`);

    // 2. EDGE FUNCTIONS LATENCY
    const tCryptoStart = performance.now();
    await supabase.functions.invoke('score-crypto', { body: { mode: 'encrypt', scores: dummy } });
    console.log(`[score-crypto] Latency: ${performance.now() - tCryptoStart}ms`);

    const tEmbedStart = performance.now();
    await supabase.functions.invoke('embed', { body: { text: 'Hiking, Anime' } });
    console.log(`[embed] Latency: ${performance.now() - tEmbedStart}ms`);

    // 3. RECOMMENDATION
    const tRecStart = performance.now();
    const { data: recData } = await supabase.functions.invoke('recommend-users', { ... });
    console.log(`[Recommend] Latency: ${performance.now() - tRecStart}ms`);
}
```,
[Kịch bản đo hiệu năng chi tiết],
<algo_benchmark_script_appendix>
)

== Kỹ thuật tối ưu hóa cơ sở dữ liệu

Mã nguồn SQL được sử dụng để tối ưu hoá hiệu năng cho các chính sách bảo mật hàng (RLS) và tăng tốc độ truy vấn thông qua chỉ mục (Index) được trình bày tại #ref(<algo_sql_optimization>):

#outline_algo(
```sql
-- 1. Tối ưu hoá RLS bằng cách sử dụng subquery để cache auth.uid()
DROP POLICY IF EXISTS "profiles_is_owner" ON public.profiles;
CREATE POLICY "profiles_is_owner_optimized" ON public.profiles
FOR ALL USING ( id = (select auth.uid()) );

-- 2. Gộp các chính sách SELECT thừa trên bảng matches
DROP POLICY IF EXISTS "match_select" ON public.matches;
CREATE POLICY "matches_select_optimized" ON public.matches
FOR SELECT USING ( 
  user_a = (select auth.uid()) OR 
  user_b = (select auth.uid()) 
);

-- 3. Bổ sung chỉ mục (Index) cho các cột lọc và liên kết quan trọng
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON public.matches(user_a);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON public.matches(user_b);
```,
[Mã nguồn SQL tối ưu hoá cơ sở dữ liệu],
<algo_sql_optimization>
)

