#import "/template.typ" : *

#[
  = Tổng quan hệ thống <chuong2>
]

Chương này trình bày quy trình (pipeline) tổng thể của hệ thống Twins, theo thứ
tự từ thu thập dữ liệu trên thiết bị, chuyển đổi và bảo mật, đến giới thiệu người dùng.
Mục tiêu là mô tả rõ các tác nhân tham gia, dữ liệu vào ra ở mỗi bước và cách các điểm
số được kết hợp thành một giới thiệu xếp hạng cuối cùng. Các chương sau sẽ đi sâu vào
từng thành phần. Trong đó, Chương 3 trình bày đề xuất và triển khai, bao gồm chuyển
đổi PCA-4, bảo mật dữ liệu và cơ chế giới thiệu lai. Chương 4 trình bày hiện thực
và đánh giá với các thực nghiệm đo lường hiệu năng và chất lượng giới
thiệu. Chương 5 tổng kết và nêu hướng phát triển tiếp theo.

Về mặt bài toán thực tế, một hệ thống kết nối người dùng phải đồng thời đáp ứng
hai yêu cầu kinh doanh quan trọng: (1) gợi ý đủ chính xác để người dùng cảm thấy “đúng người, đúng nhuầu”,
và (2) bảo vệ dữ liệu nhạy cảm để tạo niềm tin khi sử dụng. Nếu chỉ dựa vào thông
tin bề mặt, chất lượng kết nối sẽ thấp; nếu xử lý dữ liệu thô một cách lỏng lẻ, rủi ro
rò rỉ sẽ cao.

Vì vậy, quy trình (pipeline) của Twins được thiết kế theo hướng “bảo mật theo thiết kế”: dữ liệu được mã hoá/giải
mã có kiểm soát, chỉ dùng các biểu diễn đã mã hoá hoặc đã rút gọn để tính tương đồng, tránh
để lộ nội dung gốc. Về mặt kỹ thuật, hệ thống sử dụng encoding (PCA-4 cho tính cách, embedding cho sở thích) và so sánh bằng cosine similarity để đảm bảo tính nhất quán khi
đo mức độ tương đồng trong không gian vector, đồng thời vẫn giữ được riêng tư nhờ lớp mã hoá tại Edge Functions.

Quy trình này không chỉ dựa trên tính cách, mà còn kết hợp thêm tín hiệu hành vi (ELO) và tín hiệu ngữ nghĩa (Hobbies). ELO phản ánh mức độ tương tác và sự “hợp nhịp” trong quá trình sử dụng, còn Hobbies cho phép người dùng tự do khai báo sở thích và được chuyển thành vector ngữ nghĩa để so khớp mềm. Nhờ đó, hệ thống có thể vừa giữ được độ ổn định của tính cách, vừa linh hoạt điều chỉnh theo hành vi và nội dung quan tâm thực tế.

Các đoạn sau sẽ lần lượt làm rõ nguồn dữ liệu đầu vào, cấu trúc pipeline, và cách ba tín hiệu này được kết hợp thành điểm xếp hạng cuối cùng, đồng thời duy trì các nguyên tắc bảo mật xuyên suốt toàn bộ quy trình.

== Các nguồn dữ liệu đầu vào


Hệ thống sử dụng tập câu hỏi Big Five lớn, được tổng hợp từ các bộ câu hỏi chuẩn như IPIP
50 và các biến thể đã được công bố rộng rãi @goldberg1992ipip. Mỗi lượt làm bài chọn ngẫu
nhiên 25 câu từ một tập hợp (pool) 150 câu, trong đó mỗi 5 câu đại diện cho một đặc điểm (trait). Mỗi câu hỏi có
hướng cộng hoặc trừ vào trait tương ứng, do đó mô hình không phụ thuộc nội dung câu hỏi
mà chỉ phụ thuộc vào hướng (key) và trait của câu hỏi.

Cách lấy mẫu này giúp giảm thời gian làm bài, đồng thời vẫn giữ được cấu trúc cân bằng
giữa các trait. Trên thực tế, hệ thống chỉ cần biết hai thông tin cho mỗi câu: thuộc tính
trait nào và hướng tính điểm (cộng hay trừ). Nội dung câu hỏi được giữ để bảo ngữ cảnh người dùng,
nhưng không ảnh hưởng đến mô hình chuyển đổi. Chi tiết cách tính điểm từ thang Likert và
quy trình chuẩn hóa được trình bày tại @chuong3_1.

Để huấn luyện PCA, đề tài sử dụng tập dữ liệu Big Five công khai với hơn 300 nghìn mẫu từ
nhiều quốc gia @automoto2023bigfive. Dữ liệu đã được chuẩn hóa về thang 0-1 cho từng trait,
phù hợp cho việc ước lượng các thành phần chính. Các kết quả giải thích phương sai sẽ
được nêu ở @chuong3_1. Đây là lợi thế của Big Five: dữ liệu chuẩn hóa, quy mô lớn và đã
được sử dụng rộng rãi trong nghiên cứu, nên PCA có thể học được cấu trúc phân bố ổn định.

Bên cạnh đó, dữ liệu tính cách gốc vẫn cần được mã hoá bằng AES-256-GCM thông qua Edge Function
trước khi lưu trữ; cơ chế này được mô tả tại @chuong3_2.



Sở thích người dùng được nhập dưới dạng văn bản ngắn. Văn bản này không dùng để lưu trữ
trực tiếp, mà được chuyển thành vector 384 chiều thông qua mô hình nhúng ngữ nghĩa (semantic
embedding) từ Jina. Lý do dùng phương pháp nhúng là để so khớp nội dung sở thích theo ngữ nghĩa thay
vì so khớp từ khóa đơn thuần. Cách làm này cho phép các sở thích có nghĩa gần nhau (ví dụ
“chạy bộ” và “jogging”) vẫn được đánh giá tương đồng. Chi tiết quy trình nhúng và
luồng mã hoá dữ liệu sở thích sẽ được mô tả ở @chuong3_3.

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


Khi số lượng người dùng tăng lớn, việc so khớp theo tổ hợp từng cặp sẽ làm chi phí tính
toán tăng nhanh. Một hướng giảm tải là phân mảnh địa lý (geosharding), tức chia người dùng theo vùng địa lý
hoặc cụm vị trí, sau đó ưu tiên so khớp trong cùng một phân mảnh (shard). Cách này phổ biến ở các ứng dụng
hẹn hò vì nó giảm số lượng cặp cần so sánh và tăng tốc phản hồi.

Trong đề tài, geosharding được xem là bước tối ưu hóa dài hạn, chưa ưu tiên ở giai đoạn
thử nghiệm. Khi lượng người dùng đủ lớn và chi phí tính toán trở thành nút thắt, hệ thống
đề xuất bổ sung tầng shard theo vùng để giới hạn không gian tìm kiếm. Điều này không thay
đổi công thức giới thiệu, nhưng làm giảm khối lượng tính toán cho mỗi lượt giới thiệu.

== Mô hình giới thiệu và trọng số trong giới thiệu


Vector PCA-4 được dùng để đo tương đồng giữa hai người dùng bằng cosine similarity.
Phương pháp này phù hợp vì đo góc giữa hai vector, ít bị ảnh hưởng bởi độ lớn tuyệt
đối và ổn định khi dữ liệu đã chuẩn hóa @manning2008ir. Công thức cosine similarity sẽ
được trình bày chi tiết ở Chương 5.


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
Sau đó cập nhật theo $R_a' = R_a + K (S_a - E_a)$. Trong Twins, kết quả like được coi là
một tín hiệu hợp tác nên cả hai phía tăng nhẹ, còn skip chỉ trừ phía chủ động. Cụ thể,
với K=12 và được giới hạn trong [800, 2000], quy tắc cập nhật được chi tiết tại #ref(<algo_elo_update>):

Bên cạnh đó, hệ giới thiệu sử dụng hệ số gần nhau ELO để ưu tiên mức xã giao tương đồng, được tính theo công thức tại #ref(<algo_elo_prox>):
trong đó $sigma = 400$.


Sở thích người dùng được nhập dưới dạng văn bản ngắn. Văn bản này không dùng để lưu trữ
trực tiếp, mà được chuyển thành vector 384 chiều thông qua mô hình nhúng ngữ nghĩa.
Cosine similarity được dùng để đo độ gần về sở thích, thay vì so khớp từ khóa. Cách làm
này cho phép hai người dùng dùng từ khác nhau nhưng có ý nghĩa gần nhau vẫn được đánh giá
cao hơn.


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

Quy trình xử lý dữ liệu được phân chia rõ ràng theo trách nhiệm của từng tác nhân trong hệ thống.

*Thiết bị người dùng* đóng vai trò là điểm khởi đầu của luồng dữ liệu. Tại đây, ứng dụng thu thập câu trả lời trắc nghiệm, thực hiện chấm điểm Big Five, sau đó chuẩn hóa và áp dụng phép chiếu PCA-4 để tạo ra vector đặc trưng. Dữ liệu Big Five gốc cùng với văn bản sở thích thô sau đó được gửi an toàn đến các Edge Function để xử lý ở bước tiếp theo.

*Edge Function* hoạt động như một lớp trung gian an toàn, đảm nhận các tác vụ nhạy cảm. Nó nhận dữ liệu từ thiết bị, tiến hành mã hoá cả điểm Big Five và sở thích bằng thuật toán AES-256-GCM, đồng thời gọi dịch vụ ngoài để chuyển đổi văn bản sở thích thành vector nhúng ngữ nghĩa. Sau khi xử lý, hàm sẽ trả về các giá trị đã được mã hoá (ciphertext, iv) và vector nhúng cho thiết bị.

*Cơ sở dữ liệu* là nơi lưu trữ cuối cùng và được thiết kế theo nguyên tắc "bảo mật theo thiết kế". Nó chỉ chứa các biểu diễn an toàn của dữ liệu, bao gồm vector PCA-4 (dưới các trường `pca_dim1` đến `pca_dim4`) phục vụ cho việc so khớp, cùng với dữ liệu đã mã hoá và vector khởi tạo (`b5_cipher`, `b5_iv`) cho cả Big Five và sở thích. Dữ liệu gốc dưới dạng văn bản thuần không bao giờ được lưu trữ trực tiếp trên cơ sở dữ liệu.

Luồng tương tác này được minh họa qua nhật ký hệ thống thực tế tại #ref(<fig_dataflow_sequence>):

#figure(
  image("../images/ch4_edge_logs.png", width: 90%),
  caption: [Đoạn log tại edge function thể hiện quá trình mã hoá dữ liệu được gửi từ người dùng.],
) <fig_dataflow_sequence>

#pagebreak()