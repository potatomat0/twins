#import "/template.typ" : *

#[
  #set heading(numbering: "Chương 1.1")
  = Chuyển đổi dữ liệu tính cách (PCA‑4) <chuong3>
]

== Mục tiêu của chương

Chương này trình bày chi tiết quy trình chuyển đổi dữ liệu Big Five sang vector PCA‑4,
bao gồm cách chuẩn hóa điểm, cách huấn luyện PCA và cách triển khai trên thiết bị. Mục
đích là làm rõ vì sao PCA‑4 được chọn thay vì PCA‑2/3 hoặc các mô hình nhúng vector khác.

== Big Five trong bối cảnh các mô hình tính cách

Trong tâm lý học có nhiều khung mô tả tính cách, không có mô hình nào tuyệt đối hoàn hảo.
Big Five được sử dụng vì đã có lịch sử nghiên cứu dài, hệ thống câu hỏi chuẩn hóa và dữ
liệu công khai phong phú. So với các mô hình khác như MBTI hoặc HEXACO, Big Five có ưu thế
về tính tái lập và độ phủ dữ liệu, phù hợp cho bài toán chuyển đổi số liệu quy mô lớn
@john1999bigfive@ashton2007hexaco. Do đó, đề tài chấp nhận giới hạn của mô hình nhưng coi
Big Five là lựa chọn thực tế nhất để làm nền cho quy trình chuyển đổi dữ liệu.

=== Mô hình Chỉ báo Phân loại Myers-Briggs (MBTI)

MBTI phân loại người dùng theo các cặp đối lập, tạo ra 16 nhóm tính cách. Cách biểu diễn
này dễ truyền thông nhưng thiên về phân loại rời rạc, trong khi dữ liệu thực tế thường có
phân bố liên tục. Với bài toán giới thiệu cần đo mức độ gần nhau, dạng nhãn rời rạc làm giảm
khả năng xếp hạng chi tiết và khó phản ánh mức độ “gần” giữa hai cá nhân. MBTI cũng có
vấn đề về độ ổn định theo thời gian, nhiều người thay đổi nhóm khi làm lại bài test. Điều
này làm cho dữ liệu khó tái lập và khó dùng cho quy trình so khớp dài hạn. Ngoài ra, MBTI
ít có dữ liệu mở quy mô lớn theo chuẩn hóa số điểm, nên khó dùng cho chuyển đổi PCA và
huấn luyện ổn định. Ví dụ, hai người thuộc nhóm INFP và ENFP có thể khác nhau mạnh về
hướng ngoại nhưng vẫn bị xem là hai nhãn rời rạc. #ref(<fig_mbti_overview>) minh họa
cách MBTI chia nhóm tính cách.

#figure(
  image("../images/ch3_mbti.png", width: 85%),
  caption: [Minh họa mô hình MBTI và cách phân nhóm tính cách],
) <fig_mbti_overview>

=== Mô hình tính cách HEXACO

HEXACO mở rộng Big Five bằng cách thêm yếu tố Trung thực-Khiêm tốn (Honesty-Humility). Mô hình này có giá trị về
mặt học thuật, nhưng dữ liệu mở và bộ câu hỏi chuẩn hóa không phổ biến bằng Big Five. Việc
thêm một đặc điểm (trait) thứ sáu làm tăng số câu hỏi cần thiết để giữ cân bằng độ tin cậy. Điều này
gây áp lực lên trải nghiệm người dùng di động, vì thời gian trả lời dài hơn. Ngoài ra,
chuyển đổi từ HEXACO sang dạng PCA sẽ cần dữ liệu huấn luyện riêng, trong khi dữ liệu chuẩn
không nhiều bằng Big Five. Ví dụ, nếu chỉ dùng 25 câu, mỗi trait sẽ bị giảm số câu đánh
giá, làm tăng nhiễu đo lường. Do đó HEXACO được xem là lựa chọn tham khảo hơn là lựa chọn
chính cho đề tài. #ref(<fig_hexaco_overview>) minh họa cấu trúc HEXACO.

#figure(
  image("../images/ch3_hexaco.png", width: 85%),
  caption: [Minh họa cấu trúc 6 yếu tố của HEXACO],
) <fig_hexaco_overview>

== Chuẩn hóa điểm Big Five

=== Thang đo và hướng câu hỏi

Mỗi câu trả lời được chấm theo thang Likert 1–5. Với câu hỏi hướng dương, điểm giữ nguyên
thứ tự 1→5. Với câu hỏi hướng âm, điểm được đảo chiều. Sau đó các điểm trong cùng một trait
được cộng lại và chuẩn hóa về thang 0–1. Cách chuẩn hóa này giúp các trait có cùng thang
đo, phù hợp cho PCA và so khớp cosine.

=== Ví dụ định dạng dữ liệu đầu vào

Sau bước chuẩn hóa, mỗi người dùng có một vector 5 chiều theo thứ tự trait cố định:

`x = [Extraversion, Agreeableness, Conscientiousness, Emotional Stability, Intellect]`

Ví dụ một người dùng có thể có:

`x = [0.68, 0.55, 0.72, 0.60, 0.47]`

Đây là dạng dữ liệu đầu vào cho bước PCA.

=== Vì sao chọn PCA‑4 sau khi chuẩn hóa

Chuẩn hóa đưa dữ liệu Big Five về cùng thang đo, giúp mỗi trait đóng góp cân bằng khi so
khớp và khi học PCA. Tuy vậy, chuẩn hóa không giải quyết vấn đề dư thừa thông tin giữa các
trait. PCA được dùng để rút gọn chiều và tách các trục phương sai lớn nhất. Trong khi PCA‑2 hoặc
PCA‑3 làm mất đáng kể thông tin, PCA‑4 là điểm cân bằng tối ưu: giảm chiều từ 5 xuống 4 nhưng vẫn giữ phần lớn phương
sai, giúp hệ giới thiệu hoạt động ổn định khi đo độ tương đồng cosine.

== Đề xuất PCA‑4

Đề tài đề xuất PCA‑4 như mức giảm chiều tối ưu cho Big Five trong bối cảnh giới thiệu bạn bè.
Giảm từ 5 xuống 4 chiều giúp tiết kiệm lưu trữ mà vẫn giữ phần lớn cấu trúc dữ liệu. PCA‑4
cũng là dạng biểu diễn dễ triển khai trên thiết bị với phép nhân ma trận thuần. Mức giảm
nhẹ này giúp hạn chế rủi ro mất thông tin so với PCA‑2 hoặc PCA‑3. Ngoài ra, PCA‑4 giữ
được tính diễn giải tương đối, phù hợp với việc so sánh độ tương đồng cosine ổn định.
#ref(<fig_pca_proposal>) trình bày một minh họa quyết định chọn PCA‑4 dựa trên phương sai.

#figure(
  image("../images/ch3_pca_selection.png", width: 85%),
  caption: [Minh họa tiêu chí lựa chọn PCA‑4],
) <fig_pca_proposal>

Trong notebook thực nghiệm, PCA‑2 chỉ giữ khoảng 63% phương sai, PCA‑3 khoảng 80%, trong
khi PCA‑4 giữ hơn 90% phương sai dữ liệu gốc. Sự chênh lệch này ảnh hưởng trực tiếp đến
khả năng phân biệt giữa các người dùng khi so khớp. Vì vậy PCA‑4 được chọn để giảm mất
thông tin mà vẫn đảm bảo kích thước nhỏ gọn.

== Huấn luyện PCA

=== Nguồn dữ liệu và quy mô

PCA được huấn luyện từ tập dữ liệu Big Five công khai quy mô lớn, sử dụng tệp
`big_five_scores.csv` (khoảng 307 nghìn bản ghi) @automoto2023bigfive@kaggle2018bigfive.
Dữ liệu bao gồm thông tin theo quốc gia và đã chuẩn hóa điểm về thang 0–1. Trong quá trình
thăm dò, thống kê cho thấy dữ liệu trải rộng khoảng hơn 190 quốc gia và vùng lãnh thổ,
với các phân phối điểm khá ổn định giữa các nhóm quốc gia lớn. Một số bản ghi thiếu nhãn
quốc gia, nhưng các cột điểm số vẫn đầy đủ, vì vậy không ảnh hưởng đến việc huấn luyện PCA.

Phân tích Dữ liệu Khám phá (Exploratory Data Analysis - EDA) trong notebook `model/pca_evaluator.ipynb` cho thấy chênh lệch trung bình giữa các quốc gia tồn tại nhưng
không đủ lớn để cần một mô hình riêng theo vùng. Do đó, PCA được huấn luyện trên toàn bộ
tập dữ liệu để nắm bắt phương sai tổng thể. Đây là quyết định thực tế giúp mô hình ổn định
và tái lập, đồng thời tránh việc phải duy trì nhiều mô hình theo vùng. Notebook này đóng vai trò quan trọng trong việc trích xuất các hằng số toán học (Mean và ma trận Components) thay vì huấn luyện một mô hình học máy phức tạp, từ đó cho phép hệ thống triển khai logic biến đổi trực tiếp dưới dạng code thuần (hard-coded) trên thiết bị.

Đề tài không huấn luyện mô hình học sâu cho tính cách vì mục tiêu chính là biến đổi và nén
dữ liệu đã có cấu trúc. PCA cho phép giữ tính giải thích, dễ triển khai trên thiết bị và
không cần dữ liệu nhãn bổ sung. Nếu dùng mô hình phức tạp hơn, chi phí huấn luyện và suy
diễn sẽ tăng, trong khi lợi ích bổ sung không rõ ràng vì dữ liệu đã được chuẩn hóa.

=== Công thức chiếu PCA

PCA thực hiện phép chiếu tuyến tính trên dữ liệu đã được trừ đi giá trị trung bình. Với vector đầu vào $x$
(dài 5), ta có:

#numbered_equation(
  $ z = (x - mu) times W^T $,
  <pca_project>,
)

trong đó $mu$ là vector trung bình (mean) và $W$ là ma trận chứa các thành phần chính (components) @jolliffe2002pca. Vector $z$ là PCA‑4 và
được lưu dưới dạng 4 chiều. #ref(<algo_pca_projection>) mô tả phép chiếu và định dạng đầu ra.

#outline_algo(
  $ z = (x - mu) times W = mat(x_1, x_2, x_3, x_4, x_5) times mat(
    w_(1,1), w_(1,2), w_(1,3), w_(1,4);
    w_(2,1), w_(2,2), w_(2,3), w_(2,4);
    dots.v, dots.v, dots.v, dots.v;
    w_(5,1), w_(5,2), w_(5,3), w_(5,4)
  ) = mat(z_1, z_2, z_3, z_4) $,
  [Phép chiếu PCA giảm chiều dữ liệu tính cách],
  <algo_pca_projection>
)


== Triển khai PCA trên thiết bị

=== Cách triển khai

Thay vì chạy mô hình học sâu, PCA‑4 được triển khai bằng phép nhân ma trận thuần trên
thiết bị. Các hệ số trung bình và thành phần chính được trích từ notebook huấn luyện và lưu cố định trong
ứng dụng. Cách này giảm phụ thuộc vào các thư viện học máy (Machine Learning - ML) và hạn chế kích thước gói ứng dụng (bundle).

=== Định dạng lưu trữ

Kết quả PCA‑4 được lưu dưới dạng 4 trường số: pca_dim1..pca_dim4. Các giá trị này được
lưu song song với ciphertext của Big Five. Việc lưu PCA dạng số thực giúp tính độ tương đồng cosine
trực tiếp ở phía máy chủ khi giới thiệu.

== Thảo luận lựa chọn PCA

PCA là phép biến đổi tuyến tính, có thể giải thích và kiểm soát. Các lựa chọn thay thế
như nhúng vector học sâu hoặc nhúng ngữ nghĩa (semantic embedding) không phù hợp vì dữ liệu tính cách đã có
cấu trúc rõ ràng và ít phụ thuộc ngôn ngữ. Ngoài ra, PCA giúp duy trì tính ổn định giữa
các phiên bản, tránh lệch kết quả do thay đổi mô hình.

#pagebreak()