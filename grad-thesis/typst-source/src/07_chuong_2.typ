#import "/template.typ" : *

#[
  #set heading(numbering: "Chương 1.1")
  = Tổng quan quy trình hệ thống <chuong2>
]

== Mục tiêu của chương

Chương này trình bày quy trình (pipeline) tổng thể của hệ thống Twins, theo thứ tự từ thu thập dữ liệu
trên thiết bị, chuyển đổi và bảo mật, đến giới thiệu người dùng. Mục tiêu là mô tả rõ các tác
nhân tham gia, dữ liệu vào ra ở mỗi bước và cách các điểm số được kết hợp thành một giới thiệu
xếp hạng cuối cùng. Các chương sau sẽ đi sâu vào từng thành phần.
Trong đó, Chương 4 tập trung vào bảo mật và mã hoá dữ liệu, còn Chương 5 trình bày chi
tiết hệ giới thiệu và các công thức xếp hạng.

== Các nguồn dữ liệu đầu vào

=== Bộ câu hỏi Big Five và cách lấy mẫu

Hệ thống sử dụng tập câu hỏi Big Five lớn, được tổng hợp từ các bộ câu hỏi chuẩn như IPIP
50 và các biến thể đã được công bố rộng rãi @goldberg1992ipip. Mỗi lượt làm bài chọn ngẫu
nhiên 25 câu từ một tập hợp (pool) 150 câu, trong đó mỗi 5 câu đại diện cho một đặc điểm (trait). Mỗi câu hỏi có
hướng cộng hoặc trừ vào trait tương ứng, do đó mô hình không phụ thuộc nội dung câu hỏi
mà chỉ phụ thuộc vào hướng (key) và trait của câu hỏi.

Cách lấy mẫu này giúp giảm thời gian làm bài, đồng thời vẫn giữ được cấu trúc cân bằng
giữa các trait. Trên thực tế, hệ thống chỉ cần biết hai thông tin cho mỗi câu: thuộc tính
trait nào và hướng tính điểm (cộng hay trừ). Nội dung câu hỏi được giữ để đảm bảo ngữ
cảnh người dùng, nhưng không ảnh hưởng đến mô hình chuyển đổi. Trong Chương 3 sẽ trình bày
chi tiết cách tính điểm từ thang Likert và quy trình chuẩn hóa.

=== Dữ liệu khảo sát công khai cho PCA

Để huấn luyện PCA, đề tài sử dụng tập dữ liệu Big Five công khai với hơn 300 nghìn mẫu từ
nhiều quốc gia @automoto2023bigfive. Dữ liệu đã được chuẩn hóa về thang 0-1 cho từng trait,
phù hợp cho việc ước lượng các thành phần chính. Các kết quả giải thích phương sai sẽ
được nêu ở Chương 3. Đây là lợi thế của Big Five: dữ liệu chuẩn hóa, quy mô lớn và đã
được sử dụng rộng rãi trong nghiên cứu, nên PCA có thể học được cấu trúc phân bố ổn định.

=== Dữ liệu sở thích (hobbies)

Sở thích người dùng được nhập dưới dạng văn bản ngắn. Văn bản này không dùng để lưu trữ
trực tiếp, mà được chuyển thành vector 384 chiều thông qua mô hình nhúng ngữ nghĩa (semantic
embedding) từ Jina. Lý do dùng phương pháp nhúng là để so khớp nội dung sở thích theo ngữ nghĩa thay
vì so khớp từ khóa đơn thuần. Cách làm này cho phép các sở thích có nghĩa gần nhau (ví dụ
“chạy bộ” và “jogging”) vẫn được đánh giá tương đồng. Chi tiết quy trình nhúng và
luồng mã hoá dữ liệu sở thích sẽ được mô tả ở Chương 5.

== Tổng quan quy trình và tác nhân

Hệ thống có ba tác nhân chính: thiết bị người dùng, Edge Function và cơ sở dữ liệu. #ref(<fig_pipeline_overview>) mô tả quy trình tổng thể từ thu thập dữ liệu đến giới thiệu.

#figure(
  image("../images/ch2_pipeline_overview.png", width: 90%),
  caption: [Quy trình tổng thể của hệ thống Twins],
) <fig_pipeline_overview>

Các bước chính gồm:

- Thiết bị người dùng trả lời 25 câu hỏi, chấm điểm Big Five và chuẩn hóa về thang 0-1.
- Thiết bị chuyển đổi PCA-4 bằng tham số đã huấn luyện sẵn.
- Thiết bị gửi dữ liệu Big Five gốc tới Edge Function để mã hoá AES-256-GCM.
- Cơ sở dữ liệu lưu trữ pca_dim1..4 và ciphertext (b5_cipher, b5_iv).
- Dữ liệu sở thích được nhúng thành vector 384 chiều, mã hoá, và lưu trữ tương tự.
- Hệ giới thiệu lấy vector PCA, ELO và vector sở thích để tính giới thiệu xếp hạng.

== Đề xuất phân mảnh địa lý trong quy trình giới thiệu

Khi số lượng người dùng tăng lớn, việc so khớp theo tổ hợp từng cặp sẽ làm chi phí tính
toán tăng nhanh. Một hướng giảm tải là phân mảnh địa lý (geosharding), tức chia người dùng theo vùng địa lý
hoặc cụm vị trí, sau đó ưu tiên so khớp trong cùng một phân mảnh (shard). Cách này phổ biến ở các ứng dụng
hẹn hò vì nó giảm số lượng cặp cần so sánh và tăng tốc phản hồi.

Trong đề tài, geosharding được xem là bước tối ưu hóa dài hạn, chưa ưu tiên ở giai đoạn
thử nghiệm. Khi lượng người dùng đủ lớn và chi phí tính toán trở thành nút thắt, hệ thống
đề xuất bổ sung tầng shard theo vùng để giới hạn không gian tìm kiếm. Điều này không thay
đổi công thức giới thiệu, nhưng làm giảm khối lượng tính toán cho mỗi lượt giới thiệu.

== Mô hình giới thiệu và trọng số trong giới thiệu

=== Điểm tương đồng tính cách (PCA)

Vector PCA-4 được dùng để đo tương đồng giữa hai người dùng bằng cosine similarity.
Phương pháp này phù hợp vì đo góc giữa hai vector, ít bị ảnh hưởng bởi độ lớn tuyệt
đối và ổn định khi dữ liệu đã chuẩn hóa @manning2008ir. Công thức cosine similarity sẽ
được trình bày chi tiết ở Chương 5.

=== ELO từ tương tác like/skip

Hệ thống dùng điểm ELO như một thước đo xã giao, phản ánh mức độ tương tác qua hành vi
like và skip. Điểm ELO được cập nhật theo kỳ vọng thắng thua trong mô hình Elo gốc, nhưng
được điều chỉnh để phù hợp với ngữ cảnh kết nối xã hội @elo1978rating. Quy trình tính toán kỳ vọng và cập nhật điểm số được trình bày tại #ref(<algo_elo_expect>) và #ref(<algo_elo_update>). Trong hệ thống:

- Like: cả hai phía tăng nhẹ.
- Skip: chỉ người chủ động skip bị trừ.

Điểm ELO không phải thước đo hấp dẫn tuyệt đối, mà là tín hiệu phụ để gom nhóm người dùng
có mức tương tác tương đồng. ELO trong Twins là hệ số ẩn, được cập nhật sau mỗi lần tương
tác và bị giới hạn (clamp) trong khoảng 800 đến 2000. Lưu ý rằng cách cập nhật này tạo xu hướng
lạm phát điểm ELO theo thời gian, vì lượt “like” làm cả hai phía tăng điểm. Tuy vậy, mục
đích chính không phải cạnh tranh, mà là đảm bảo người dùng có mức xã giao gần nhau được
ưu tiên gặp nhau hơn.

Trong công thức gốc, kỳ vọng thắng được tính bởi:
#outline_algo(
  $ E_a = 1 / (1 + 10^((R_b - R_a) / 400)) $,
  [Tính toán kỳ vọng thắng trong mô hình Elo],
  <algo_elo_expect>
)
Sau đó cập nhật theo $R_a' = R_a + K (S_a - E_a)$. Trong Twins, kết quả like được coi là
một tín hiệu hợp tác nên cả hai phía tăng nhẹ, còn skip chỉ trừ phía chủ động. Cụ thể,
với K=12 và được giới hạn trong [800, 2000], quy tắc cập nhật được chi tiết tại #ref(<algo_elo_update>):

#outline_algo(
  [
    - Like: $R_a' = text("clamp")(R_a + K(1 - E_a))$, $R_b' = text("clamp")(R_b + K(1 - E_b))$
    - Skip: $R_a' = text("clamp")(R_a + K(0 - E_a))$, $R_b' = R_b$
  ],
  [Quy tắc cập nhật điểm ELO hợp tác],
  <algo_elo_update>
)
Bên cạnh đó, hệ giới thiệu sử dụng hệ số gần nhau ELO để ưu tiên mức xã giao tương đồng, được tính theo công thức tại #ref(<algo_elo_prox>):
#outline_algo(
  $ p = exp(-|Delta R| / sigma) $,
  [Tính toán độ gần (proximity) ELO],
  <algo_elo_prox>
)
trong đó $sigma = 400$.

=== Embedding sở thích và cosine similarity

Sở thích người dùng được chuyển thành vector 384 chiều thông qua mô hình nhúng ngữ nghĩa.
Cosine similarity được dùng để đo độ gần về sở thích, thay vì so khớp từ khóa. Cách làm
này cho phép hai người dùng dùng từ khác nhau nhưng có ý nghĩa gần nhau vẫn được đánh giá
cao hơn.

=== Trọng số tổng hợp

Giới thiệu xếp hạng cuối cùng được tính theo trọng số của PCA, ELO và hobbies dựa trên cấu hình hệ thống, chi tiết tại #ref(<algo_hybrid_score>):

#outline_algo(
  [
    - *Trường hợp không sử dụng sở thích*:
      - Nếu ELO bật: $S = 0.8 dot P + 0.2 dot p$
      - Nếu ELO tắt: $S = P$
    - *Trường hợp sử dụng sở thích*:
      - Nếu ELO bật: $S = 0.5 dot P + 0.2 dot p + 0.3 dot H$
      - Nếu ELO tắt: $S = 0.55 dot P + 0.45 dot H$
    Trong đó: $P$ là độ tương đồng PCA, $p$ là hệ số gần nhau ELO, $H$ là độ tương đồng sở thích.
  ],
  [Thuật toán tính điểm giới thiệu tổng hợp],
  <algo_hybrid_score>
)

Để minh họa, xét ba người dùng A, B, C khi A đang tìm giới thiệu. Giả sử A có PCA tương đồng
với B và C gần bằng nhau (ví dụ 0.90), nhưng B có sở thích gần hơn (hobbies 0.85) trong khi
C có ELO gần hơn (proximity 1.0 so với 0.7). Trong cấu hình có ELO và hobbies, điểm giới thiệu cuối của B được tính như sau:
$ S_B = 0.5 dot 0.90 + 0.2 dot 0.70 + 0.3 dot 0.85 = 0.845 $
và của C:
$ S_C = 0.5 dot 0.90 + 0.2 dot 1.00 + 0.3 dot 0.55 = 0.815 $
Kết quả là B sẽ đứng trước C trong danh sách giới thiệu. Sơ đồ trọng số tổng hợp được mô tả tại #ref(<fig_score_weights>):

#figure(
  image("../images/ch2_score_logic.png", width: 90%),
  caption: [Sơ đồ trọng số tính giới thiệu xếp hạng],
) <fig_score_weights>

== Luồng dữ liệu chi tiết theo tác nhân

=== Thiết bị người dùng

Thiết bị thực hiện các bước sau:

- Thu thập câu trả lời và chấm điểm Big Five.
- Chuẩn hóa và chuyển đổi PCA-4.
- Gửi dữ liệu thô tới Edge Function để mã hoá.
- Gửi văn bản sở thích để tạo vector, rồi lưu ciphertext và vector nhúng.

=== Edge Function

Edge Function đảm nhận:

- Mã hoá/giải mã Big Five bằng AES-256-GCM.
- Gọi dịch vụ nhúng để sinh vector sở thích.
- Trả về ciphertext, iv và vector nhúng cho thiết bị.

=== Cơ sở dữ liệu

Cơ sở dữ liệu lưu trữ:

- Vector PCA (pca_dim1..4).
- Ciphertext và iv cho Big Five (b5_cipher, b5_iv).
- Ciphertext cho hobbies và vector nhúng.

Luồng dữ liệu được ghi nhận qua nhật ký hệ thống tại #ref(<fig_dataflow_sequence>):

#figure(
  image("../images/ch4_edge_logs.png", width: 90%),
  caption: [Đoạn log tại edge function thể hiện quá trình mã hoá dữ liệu được gửi từ người dùng.],
) <fig_dataflow_sequence>

#pagebreak()