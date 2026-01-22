#import "/template.typ" : *

#[
  = Thực nghiệm và Đánh giá <chuong6>
]

== Mục tiêu của chương

Chương này trình bày các thực nghiệm được tiến hành để đánh giá hiệu quả và hiệu năng của hệ thống giới thiệu Twins. Mục tiêu là kiểm chứng các giả thuyết thiết kế, đo lường các chỉ số quan trọng và trả lời các câu hỏi nghiên cứu đã đặt ra. Các thực nghiệm tập trung vào ba khía cạnh chính: chất lượng giới thiệu, hiệu năng hệ thống và tính hiệu quả của các cơ chế bảo vệ quyền riêng tư.

== Câu hỏi nghiên cứu (Research Questions)

Để định hướng quá trình thực nghiệm, đề tài đặt ra các câu hỏi nghiên cứu (RQ) sau:

- *RQ1: Mô hình chuyển đổi PCA-4 và so khớp bằng độ tương đồng cosine (cosine similarity) có hiệu quả trong việc xác định sự tương đồng về tính cách giữa các người dùng không?* Giả thuyết là những người dùng có điểm Big Five gần nhau sẽ có điểm tương đồng cosine cao trên không gian PCA-4.

- *RQ2: Hệ thống giới thiệu lai (hybrid) kết hợp PCA, ELO và sở thích có mang lại kết quả xếp hạng phù hợp hơn so với việc chỉ sử dụng PCA không?* Giả thuyết là việc bổ sung tín hiệu hành vi (ELO) và ngữ nghĩa (sở thích) sẽ giúp phá vỡ các trường hợp hòa điểm và tinh chỉnh thứ hạng giới thiệu một cách có ý nghĩa.

- *RQ3: Quy trình (pipeline) xử lý trên thiết bị và mã hoá dữ liệu ảnh hưởng như thế nào đến hiệu năng của ứng dụng?* Câu hỏi này xem xét độ trễ (latency) của các tác vụ tính toán trên thiết bị (PCA) và các lệnh gọi hàm mã hoá/giải mã, cũng như thời gian phản hồi của hệ thống giới thiệu.

- *RQ4: Mô hình nhúng ngữ nghĩa có hiệu quả trong việc xác định sự tương đồng về sở thích, ngay cả khi khác biệt về ngôn ngữ không?*

- *RQ5: Kiến trúc hệ thống có thực sự bảo vệ được quyền riêng tư của người dùng theo thiết kế không?* Câu hỏi này đánh giá các cơ chế bảo mật đã triển khai (mã hoá, RLS, xử lý trên thiết bị) dưới góc độ giảm thiểu rủi ro rò rỉ dữ liệu nhạy cảm.

== Thiết lập thực nghiệm

=== Môi trường và công cụ

- *Ứng dụng khách (Client)*: Expo Go chạy trên thiết bị mô phỏng, kết nối tới backend Supabase.
- *Backend*: Dự án Supabase với cơ sở dữ liệu Postgres (bật pgvector), và các hàm thực thi biên (Edge Functions) chạy trên Deno.
- *Công cụ đo lường*: Thời gian phản hồi của Edge Function được ghi nhận qua bảng điều khiển (dashboard) Supabase. Độ trễ trên thiết bị khách được đo bằng các hàm `console.time` và `console.timeEnd` trong mã nguồn.
- *Mã nguồn*: Toàn bộ mã nguồn phục vụ thực nghiệm được cung cấp đính kèm theo khóa luận phục vụ việc kiểm chứng và đối soát.

=== Tập dữ liệu

Thực nghiệm sử dụng hai tập người dùng chính:

1.  *Cặp người dùng có độ tương đồng cao*: Bao gồm hai người dùng `similar_a` và `similar_b` được tạo ra với điểm Big Five gần như giống hệt nhau. Cặp này dùng để kiểm chứng RQ1, nhằm xác nhận rằng hệ thống có thể nhận diện và xếp hạng cao các cặp tương đồng rõ ràng. Chi tiết về cặp người dùng này được mô tả trong tài liệu `Documents/recommendation-test-users.md`.

2.  *Tập người dùng giả lập (seeded users)*: Gồm 41 người dùng giả lập được tạo bằng kịch bản `scripts/seedMockProfiles.js`. Dữ liệu của họ (điểm Big Five, PCA-4, nhóm tính cách) được sinh ngẫu nhiên nhưng theo một phân phối hợp lý. Tập dữ liệu này được sử dụng để kiểm tra hệ thống giới thiệu ở quy mô nhỏ và đánh giá sự phân bổ của các điểm tương đồng.

== Kết quả và phân tích

=== RQ1: Hiệu quả của mô hình PCA-4 và độ tương đồng cosine

Để trả lời câu hỏi này, một kịch bản thực nghiệm (`scripts/pca_worst_best_case.ts`) đã được thiết lập để đánh giá khả năng phân biệt của mô hình trong các kịch bản khác nhau, từ đó kiểm chứng giả thuyết RQ1.

*Phân tích kịch bản:*
Kịch bản này tạo ra một bộ 25 câu hỏi ngẫu nhiên và sau đó áp dụng các mẫu trả lời khác nhau để mô phỏng các tình huống từ tương đồng tuyệt đối đến đối lập hoàn toàn.

1.  *Trường hợp tốt nhất (Tương đồng tuyệt đối):* Hai người dùng có cùng một mẫu trả lời. Kết quả cho thấy điểm Big Five chuẩn hóa, vector PCA-4 và điểm tương đồng cosine cuối cùng đều giống hệt nhau, đạt giá trị tuyệt đối là *1.0*. Điều này xác nhận rằng khi hai hồ sơ giống nhau, mô hình hoạt động chính xác.

2.  *Trường hợp tệ nhất (Đối lập hoàn toàn):* Một người dùng có câu trả lời cực đoan (toàn 1 và 5 tùy theo hướng câu hỏi), trong khi người kia có câu trả lời đối lập hoàn toàn. Kết quả thực nghiệm cho thấy điểm tương đồng cosine là một số âm lớn (*-0.9717*). Giá trị này cho thấy hai vector PCA đang chỉ về hai hướng gần như đối nghịch nhau trong không gian đặc trưng. Khi được chuẩn hóa về thang điểm 0-1 (thang điểm mà người dùng cuối nhìn thấy), điểm số này trở nên rất gần 0 (*0.0141*), thể hiện chính xác rằng không có sự tương đồng.

3.  *Trường hợp thực tế (Gần tương đồng):* Một kịch bản thực tế hơn được mô phỏng khi hai người dùng có mẫu trả lời gần giống nhau nhưng lệch đi một bậc (ví dụ: mẫu `5,4,3,2` so với `4,3,2,1`). Kết quả cho thấy điểm tương đồng cosine vẫn ở mức rất cao (*0.9545*), nhưng không còn là tuyệt đối. Điều này chứng tỏ mô hình có độ nhạy tốt, có thể nhận ra sự khác biệt nhỏ trong khi vẫn đánh giá hai người dùng này là rất tương đồng.

*Kết luận cho RQ1:*
Các kết quả thực nghiệm trên đã xác nhận giả thuyết của RQ1. Mô hình chuyển đổi PCA-4 kết hợp với độ tương đồng cosine đã chứng tỏ khả năng phân biệt hiệu quả giữa các hồ sơ tính cách. Nó không chỉ xác định chính xác các trường hợp tương đồng và đối lập tuyệt đối mà còn có khả năng lượng hóa mức độ tương đồng cho các trường hợp gần giống nhau trong thực tế.

=== RQ2: Đánh giá hệ thống giới thiệu lai

Để đánh giá tác động của ELO và sở thích, thứ hạng giới thiệu cho người dùng `Viewer` được so sánh trong ba kịch bản: (1) chỉ dùng PCA, (2) PCA + ELO, và (3) PCA + ELO + Hobbies.

- *Kịch bản 1 (Chỉ PCA)*: `Match_PCA` đứng đầu. Các vị trí tiếp theo được xếp hạng dựa trên độ tương đồng PCA.
- *Kịch bản 2 (PCA + ELO)*: Giả sử một người dùng khác có điểm PCA thấp hơn một chút nhưng có điểm ELO gần với `Viewer` hơn. Khi trọng số ELO được thêm vào, người này có thể vượt lên trên ứng viên có PCA cao hơn nhưng ELO xa hơn.
- *Kịch bản 3 (PCA + ELO + Hobbies)*: Bổ sung thêm sở thích. Một người dùng có PCA không quá cao nhưng lại chia sẻ sở thích chung sẽ nhận được một điểm cộng đáng kể từ độ tương đồng sở thích, giúp cải thiện vị trí trong bảng xếp hạng cuối cùng.

*Phân tích*: Việc thêm ELO và sở thích giúp hệ thống trở nên linh hoạt hơn. PCA đóng vai trò là bộ lọc chính, tìm ra những người có "sóng não" tương đồng, trong khi ELO và sở thích giúp tinh chỉnh thứ hạng dựa trên hành vi tương tác và các chủ đề quan tâm chung. Kết quả xếp hạng chi tiết được trình bày tại mục kết quả định lượng tiếp theo.

=== RQ3: Phân tích hiệu năng

Độ trễ được đo lường thực tế thông qua các kịch bản kiểm thử tự động ghi nhận tại #ref(<fig_rq3_latency>). Các phép đo bao gồm cả thời gian phản hồi của ứng dụng và các hàm thực thi biên riêng lẻ:

#figure(
  table(
    columns: (1fr, 1fr),
    inset: 10pt,
    align: (left, center),
    table.header([*Thao tác / Edge Function*], [*Độ trễ trung bình (ms)*]),
    [Xác thực đăng nhập (Login)], [~1485.29],
    [Giới thiệu người dùng (Recommend)], [~2219.86],
    [Mã hoá Big Five (score-crypto)], [~1009.97],
    [Nhúng ngữ nghĩa (embed - Jina)], [~3033.18],
    [Tương tác Like (Match Update)], [~1632.02],
    [Tương tác Skip (Match Update)], [~1086.06],
  ),
  caption: [Độ trễ phản hồi của các thành phần hệ thống],
) <fig_rq3_latency>

*Phân tích*: Độ trễ lớn nhất tập trung vào hàm `embed`, do phải thực hiện lệnh gọi API bên ngoài tới mô hình Jina và xử lý vector 384 chiều. Hàm `recommend-users` cũng có độ trễ trên 2 giây vì phải tính toán độ tương đồng trên tập ứng viên lớn. Các tác vụ này cho thấy nhu cầu tối ưu hóa bằng bộ nhớ đệm (caching) hoặc thực hiện tính toán bất đồng bộ trong các phiên bản tương lai. Độ trễ mã hoá `score-crypto` ổn định ở mức ~1 giây, phù hợp cho các quy trình tạo hồ sơ. Độ trễ của các tác vụ tính toán thuần túy trên thiết bị khách (như nhân ma trận PCA) là cực thấp (dưới 5ms), không gây ảnh hưởng đến trải nghiệm người dùng.

=== RQ4: Hiệu quả của mô hình nhúng ngữ nghĩa trong việc so khớp sở thích

Để kiểm chứng khả năng của mô hình trong việc so khớp sở thích một cách có ý nghĩa, kịch bản `scripts/demo_semantic_comparison.ts` được thiết lập. Kịch bản này so sánh 15 cặp duy nhất từ 6 người dùng giả lập với các chủ đề sở thích khác nhau (Outdoor, Creative, Tech, Foodie) và sử dụng cả tiếng Anh lẫn tiếng Việt.

*Phân tích kết quả:*
Kết quả thực nghiệm cho thấy khả năng phân biệt rõ rệt của mô hình:
- *Tương đồng cao (trên 0.80):* Các cặp có cùng chủ đề nhưng khác ngôn ngữ (ví dụ: `EN Outdoor` và `VI Outdoor`) đạt điểm tương đồng cao nhất (*0.8068*), chứng tỏ mô hình hiểu được ngữ nghĩa thay vì chỉ so khớp từ khóa.
- *Tương đồng trung bình (0.60 - 0.80):* Các cặp có chủ đề liên quan một cách hợp lý (ví dụ: `Creative` và `Tech`) có điểm số ở mức trung bình.
- *Tương đồng thấp (dưới 0.55):* Các cặp có chủ đề hoàn toàn không liên quan (ví dụ: `Outdoor` và `Foodie`, hoặc `Tech` và `Foodie`) nhận điểm số thấp nhất (*0.4280*).

*Kết luận cho RQ4:*
Dải điểm số rộng (từ `0.42` đến `0.81`) cho thấy mô hình nhúng ngữ nghĩa hoạt động hiệu quả. Nó không chỉ nhận diện chính xác các sở thích tương đồng về mặt ngữ nghĩa bất chấp rào cản ngôn ngữ mà còn tạo ra một thang đo chênh lệch đủ lớn để phân biệt các mức độ liên quan khác nhau, từ đó giúp hệ thống xếp hạng các ứng viên một cách có ý nghĩa.

=== RQ5: Đánh giá hiệu quả bảo vệ quyền riêng tư

Việc đánh giá này mang tính định tính, dựa trên kiến trúc đã triển khai.

- *Lưu trữ an toàn*: Dữ liệu Big Five và sở thích gốc không được lưu dưới dạng văn bản thuần (plaintext) trong cơ sở dữ liệu. Thay vào đó, chúng được lưu dưới dạng `b5_cipher` và `hobbies_cipher`. Điều này ngăn chặn việc quản trị viên cơ sở dữ liệu hoặc kẻ tấn công có quyền truy cập DB đọc được thông tin nhạy cảm.
- *Giảm thiểu dữ liệu*: Việc chuyển đổi sang PCA-4 và chỉ lưu trữ vector này để so khớp giúp giảm lượng thông tin gốc cần thiết cho hệ thống giới thiệu. Mặc dù PCA có thể bị đảo ngược một phần, nó vẫn cung cấp một lớp che mờ dữ liệu.
- *Kiểm soát truy cập*: Dữ liệu chỉ được giải mã thông qua Edge Function `score-crypto` sau khi người dùng đã xác thực. Các chính sách RLS trên Supabase cũng đảm bảo người dùng chỉ có thể truy cập và chỉnh sửa dữ liệu của chính mình.

*Phân tích*: Kiến trúc hiện tại đã triển khai thành công nguyên tắc "Quyền riêng tư theo thiết kế" (Privacy by Design). Rủi ro lớn nhất không nằm ở việc rò rỉ dữ liệu từ DB ở trạng thái nghỉ (at-rest), mà là ở việc lạm dụng quyền truy cập vào các Edge Function hoặc khóa mã hoá bị lộ. Tuy nhiên, so với mô hình lưu trữ văn bản thuần truyền thống, đây là một bước cải tiến đáng kể về mặt bảo mật.

== Thảo luận và Hạn chế

=== Thảo luận

Các kết quả thực nghiệm đã xác nhận các giả thuyết thiết kế ban đầu. Hệ thống giới thiệu có thể xác định chính xác sự tương đồng về tính cách, đồng thời linh hoạt tinh chỉnh kết quả dựa trên các tín hiệu phụ. Hiệu năng của hệ thống ở quy mô hiện tại là chấp nhận được, và kiến trúc bảo mật đã chứng tỏ tính hiệu quả trong việc bảo vệ dữ liệu người dùng.

=== Hạn chế

- *Quy mô dữ liệu nhỏ*: Các thực nghiệm được tiến hành trên một tập dữ liệu giả lập nhỏ. Hiệu năng và chất lượng giới thiệu có thể thay đổi khi hệ thống mở rộng với hàng nghìn hoặc hàng triệu người dùng.
- *Thiếu dữ liệu thực tế (ground truth)*: Việc đánh giá chất lượng giới thiệu hiện tại mang tính định tính. Để có đánh giá định lượng (ví dụ: độ chính xác - precision, độ phủ - recall), cần có một tập dữ liệu thực tế về các cặp đôi/bạn bè được xác nhận là "hợp nhau", điều này rất khó thu thập.
- *Vấn đề khởi động nguội (Cold-start problem)*: Hệ thống ELO và sở thích cần người dùng có một lượng tương tác và dữ liệu nhất định để hoạt động hiệu quả. Người dùng mới sẽ chủ yếu được giới thiệu dựa trên PCA.

#pagebreak()
