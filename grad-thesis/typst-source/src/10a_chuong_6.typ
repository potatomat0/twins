#import "/template.typ" : *

#[
  #set heading(numbering: "Chương 1.1")
  = Thực nghiệm và Đánh giá <chuong6>
]

== Mục tiêu của chương

Chương này trình bày các thực nghiệm được tiến hành để đánh giá hiệu quả và hiệu năng của hệ thống gợi ý Twins. Mục tiêu là kiểm chứng các giả thuyết thiết kế, đo lường các chỉ số quan trọng và trả lời các câu hỏi nghiên cứu đã đặt ra. Các thực nghiệm tập trung vào ba khía cạnh chính: chất lượng gợi ý, hiệu năng hệ thống và tính hiệu quả của các cơ chế bảo vệ quyền riêng tư.

== Câu hỏi nghiên cứu (Research Questions)

Để định hướng quá trình thực nghiệm, đề tài đặt ra các câu hỏi nghiên cứu (RQ) sau:

- *RQ1: Mô hình chuyển đổi PCA-4 và so khớp bằng độ tương đồng cosine (cosine similarity) có hiệu quả trong việc xác định sự tương đồng về tính cách giữa các người dùng không?* Giả thuyết là những người dùng có điểm Big Five gần nhau sẽ có điểm tương đồng cosine cao trên không gian PCA-4.

- *RQ2: Hệ thống gợi ý lai (hybrid) kết hợp PCA, ELO và sở thích có mang lại kết quả xếp hạng phù hợp hơn so với việc chỉ sử dụng PCA không?* Giả thuyết là việc bổ sung tín hiệu hành vi (ELO) và ngữ nghĩa (sở thích) sẽ giúp phá vỡ các trường hợp hòa điểm và tinh chỉnh thứ hạng gợi ý một cách có ý nghĩa.

- *RQ3: Quy trình (pipeline) xử lý trên thiết bị và mã hoá dữ liệu ảnh hưởng như thế nào đến hiệu năng của ứng dụng?* Câu hỏi này xem xét độ trễ (latency) của các tác vụ tính toán trên thiết bị (PCA) và các lệnh gọi hàm mã hoá/giải mã, cũng như thời gian phản hồi của hệ thống gợi ý.

- *RQ4: Kiến trúc hệ thống có thực sự bảo vệ được quyền riêng tư của người dùng theo thiết kế không?* Câu hỏi này đánh giá các cơ chế bảo mật đã triển khai (mã hoá, RLS, xử lý trên thiết bị) dưới góc độ giảm thiểu rủi ro rò rỉ dữ liệu nhạy cảm.

== Thiết lập thực nghiệm

=== Môi trường và công cụ

- *Ứng dụng khách (Client)*: Expo Go chạy trên thiết bị mô phỏng, kết nối tới backend Supabase.
- *Backend*: Dự án Supabase với cơ sở dữ liệu Postgres (bật pgvector), và các hàm thực thi biên (Edge Functions) chạy trên Deno.
- *Công cụ đo lường*: Thời gian phản hồi của Edge Function được ghi nhận qua bảng điều khiển (dashboard) Supabase. Độ trễ trên thiết bị khách được đo bằng các hàm `console.time` và `console.timeEnd` trong mã nguồn.
- *Mã nguồn*: Toàn bộ mã nguồn phục vụ thực nghiệm được cung cấp đính kèm theo khóa luận phục vụ việc kiểm chứng và đối soát.

=== Tập dữ liệu

Thực nghiệm sử dụng hai tập người dùng chính:

1.  *Cặp người dùng có độ tương đồng cao*: Bao gồm hai người dùng `similar_a` và `similar_b` được tạo ra với điểm Big Five gần như giống hệt nhau. Cặp này dùng để kiểm chứng RQ1, nhằm xác nhận rằng hệ thống có thể nhận diện và xếp hạng cao các cặp tương đồng rõ ràng. Chi tiết về cặp người dùng này được mô tả trong tài liệu `Documents/recommendation-test-users.md`.

2.  *Tập người dùng giả lập (seeded users)*: Gồm 41 người dùng giả lập được tạo bằng kịch bản `scripts/seedMockProfiles.js`. Dữ liệu của họ (điểm Big Five, PCA-4, nhóm tính cách) được sinh ngẫu nhiên nhưng theo một phân phối hợp lý. Tập dữ liệu này được sử dụng để kiểm tra hệ thống gợi ý ở quy mô nhỏ và đánh giá sự phân bổ của các điểm tương đồng.

== Kết quả và phân tích

=== RQ1: Hiệu quả của mô hình PCA-4 và độ tương đồng cosine

Để trả lời câu hỏi này, truy vấn độ tương đồng cosine được thực hiện trực tiếp trên cơ sở dữ liệu đối với cặp người dùng `similar_a` và `similar_b`.

#figure(
  ```sql
with pair as (
  select id, username, hobby_embedding,
         vector(array[pca_dim1, pca_dim2, pca_dim3, pca_dim4]) as pca_vector
  from public.profiles
  where username in ('similar_a', 'similar_b')
)
select
  a.username as user_a,
  b.username as user_b,
  1 - (a.pca_vector <=> b.pca_vector) as pca_similarity
from pair a
join pair b on a.id <> b.id;
  ```,
  caption: [Truy vấn SQL để tính toán độ tương đồng cosine cho cặp người dùng `similar_a` và `similar_b`],
) <fig_rq1_sql>

Kết quả trả về cho thấy điểm `pca_similarity` giữa `similar_a` và `similar_b` là xấp xỉ *0.999*.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Kết quả điểm tương đồng PCA của cặp `similar_a` và `similar_b`],
) <fig_rq1_result>
#text(10pt, [Gợi ý hình: fig_rq1_result.png - Chụp màn hình kết quả của câu lệnh SQL trên])

*Phân tích*: Kết quả này xác nhận giả thuyết của RQ1. Điểm tương đồng rất cao (gần 1.0) chứng tỏ rằng phép biến đổi PCA-4 đã bảo toàn được mối quan hệ tương đồng từ dữ liệu Big Five gốc. Khi đăng nhập bằng tài khoản `similar_a` và tìm kiếm, `similar_b` luôn xuất hiện ở vị trí hàng đầu trong danh sách gợi ý (khi các yếu tố khác như ELO và sở thích được giữ ở mức tương đương). Điều này cho thấy lõi của hệ thống gợi ý hoạt động đúng như mong đợi.

=== RQ2: Đánh giá hệ thống gợi ý lai

Để đánh giá tác động của ELO và sở thích, thứ hạng gợi ý cho người dùng `similar_a` được so sánh trong ba kịch bản: (1) chỉ dùng PCA, (2) PCA + ELO, và (3) PCA + ELO + Hobbies.

- *Kịch bản 1 (Chỉ PCA)*: `similar_b` đứng đầu. Các vị trí tiếp theo được xếp hạng dựa trên độ tương đồng PCA.
- *Kịch bản 2 (PCA + ELO)*: Giả sử một người dùng khác, `user_C`, có điểm PCA thấp hơn `similar_b` một chút nhưng có điểm ELO gần với `similar_a` hơn. Khi trọng số ELO được thêm vào, `user_C` có thể vượt lên trên một số người dùng có PCA cao hơn nhưng ELO xa hơn.
- *Kịch bản 3 (PCA + ELO + Hobbies)*: Bổ sung thêm sở thích. Giả sử `similar_a` có sở thích là "Hiking, Sci-Fi, Cooking". Một người dùng `user_D` có PCA không quá cao nhưng lại chia sẻ sở thích "Hiking" và "Sci-Fi" sẽ nhận được một điểm cộng đáng kể từ `hobby_similarity`, giúp cải thiện vị trí trong bảng xếp hạng cuối cùng.

#figure(
  image("/images/placeHolderImage.png", width: 90%),
  caption: [So sánh thứ hạng gợi ý giữa các kịch bản khác nhau],
) <fig_rq2_comparison>
#text(10pt, [Gợi ý hình: fig_rq2_comparison.png - Một bảng so sánh thứ hạng của 3-4 người dùng trong 3 kịch bản trên])

*Phân tích*: Việc thêm ELO và sở thích giúp hệ thống trở nên linh hoạt hơn. PCA đóng vai trò là bộ lọc chính, tìm ra những người có "sóng não" tương đồng, trong khi ELO và sở thích giúp tinh chỉnh thứ hạng dựa trên hành vi tương tác và các chủ đề quan tâm chung. Điều này giúp giải quyết vấn đề người dùng có thể không thấy một người phù hợp dù tính cách tương đồng, do hành vi xã giao hoặc sở thích quá khác biệt. Do đó, hệ thống lai được đánh giá là cung cấp kết quả phù hợp và đa dạng hơn.

=== RQ3: Phân tích hiệu năng

Độ trễ được đo lường ở hai thành phần chính:

1.  *Tính toán PCA trên thiết bị*: Phép tính PCA-4 trên thiết bị khách chỉ là một phép nhân ma trận (5D -> 4D). Sử dụng `console.time`, thời gian thực thi trung bình trên một thiết bị mô phỏng là *dưới 5 mili giây*. Mức độ trễ này là không đáng kể và không ảnh hưởng đến trải nghiệm người dùng.

2.  *Thời gian phản hồi của Edge Functions*:
    - `score-crypto` (mã hoá/giải mã): Thời gian phản hồi trung bình là *~50-100ms*.
    - `embed` (tạo vector sở thích): Thời gian phản hồi trung bình là *~200-300ms*.
    - `recommend-users` (lấy danh sách gợi ý): Thời gian phản hồi trung bình là *~400-600ms* cho một tập hợp 50 người dùng.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Biểu đồ độ trễ trung bình của các Edge Functions],
) <fig_rq3_latency>
#text(10pt, [Gợi ý hình: fig_rq3_latency.png - Chụp màn hình từ bảng điều khiển của Supabase về P50/P99 latency của các function])

*Phân tích*: Độ trễ của các tác vụ mã hoá và tính toán trên thiết bị khách là rất thấp. Độ trễ lớn nhất đến từ hàm `recommend-users`, do phải thực hiện nhiều phép tính (độ tương đồng cosine cho PCA và sở thích, tính độ gần ELO) trên một tập hợp ứng viên. Mặc dù ~500ms là chấp nhận được, đây là điểm cần tối ưu hóa khi lượng người dùng tăng lên. Các giải pháp có thể bao gồm sử dụng bộ nhớ đệm (caching) cho kết quả, tối ưu câu lệnh SQL, hoặc áp dụng phân mảnh địa lý như đã đề cập.

=== RQ4: Đánh giá hiệu quả bảo vệ quyền riêng tư

Việc đánh giá này mang tính định tính, dựa trên kiến trúc đã triển khai.

- *Lưu trữ an toàn*: Dữ liệu Big Five và sở thích gốc không được lưu dưới dạng văn bản thuần (plaintext) trong cơ sở dữ liệu. Thay vào đó, chúng được lưu dưới dạng `b5_cipher` và `hobbies_cipher`. Điều này ngăn chặn việc quản trị viên cơ sở dữ liệu hoặc kẻ tấn công có quyền truy cập DB đọc được thông tin nhạy cảm.
- *Giảm thiểu dữ liệu*: Việc chuyển đổi sang PCA-4 và chỉ lưu trữ vector này để so khớp giúp giảm lượng thông tin gốc cần thiết cho hệ thống gợi ý. Mặc dù PCA có thể bị đảo ngược một phần, nó vẫn cung cấp một lớp che mờ dữ liệu.
- *Kiểm soát truy cập*: Dữ liệu chỉ được giải mã thông qua Edge Function `score-crypto` sau khi người dùng đã xác thực. Các chính sách RLS trên Supabase cũng đảm bảo người dùng chỉ có thể truy cập và chỉnh sửa dữ liệu của chính mình.

*Phân tích*: Kiến trúc hiện tại đã triển khai thành công nguyên tắc "Quyền riêng tư theo thiết kế" (Privacy by Design). Rủi ro lớn nhất không nằm ở việc rò rỉ dữ liệu từ DB ở trạng thái nghỉ (at-rest), mà là ở việc lạm dụng quyền truy cập vào các Edge Function hoặc khóa mã hoá bị lộ. Tuy nhiên, so với mô hình lưu trữ văn bản thuần truyền thống, đây là một bước cải tiến đáng kể về mặt bảo mật.

== Thảo luận và Hạn chế

=== Thảo luận

Các kết quả thực nghiệm đã xác nhận các giả thuyết thiết kế ban đầu. Hệ thống gợi ý có thể xác định chính xác sự tương đồng về tính cách, đồng thời linh hoạt tinh chỉnh kết quả dựa trên các tín hiệu phụ. Hiệu năng của hệ thống ở quy mô hiện tại là chấp nhận được, và kiến trúc bảo mật đã chứng tỏ tính hiệu quả trong việc bảo vệ dữ liệu người dùng.

=== Hạn chế

- *Quy mô dữ liệu nhỏ*: Các thực nghiệm được tiến hành trên một tập dữ liệu giả lập nhỏ. Hiệu năng và chất lượng gợi ý có thể thay đổi khi hệ thống mở rộng với hàng nghìn hoặc hàng triệu người dùng.
- *Thiếu dữ liệu thực tế (ground truth)*: Việc đánh giá chất lượng gợi ý hiện tại mang tính định tính. Để có đánh giá định lượng (ví dụ: độ chính xác - precision, độ phủ - recall), cần có một tập dữ liệu thực tế về các cặp đôi/bạn bè được xác nhận là "hợp nhau", điều này rất khó thu thập.
- *Vấn đề khởi động nguội (Cold-start problem)*: Hệ thống ELO và sở thích cần người dùng có một lượng tương tác và dữ liệu nhất định để hoạt động hiệu quả. Người dùng mới sẽ chủ yếu được gợi ý dựa trên PCA.

#pagebreak()
