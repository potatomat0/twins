#import "/template.typ" : *

#[
  #set heading(numbering: "Chương 1.1")
  = Chuyển đổi dữ liệu tính cách (PCA‑4) <chuong3>
]

== Mục tiêu của chương

Chương này trình bày chi tiết quy trình chuyển đổi dữ liệu Big Five sang vector PCA‑4,
bao gồm cách chuẩn hóa điểm, cách huấn luyện PCA và cách triển khai trên thiết bị. Mục
đích là làm rõ vì sao PCA‑4 được chọn thay vì PCA‑2/3 hoặc các mô hình embedding khác.

== Big Five trong bối cảnh các mô hình tính cách

Trong tâm lý học có nhiều khung mô tả tính cách, không có mô hình nào tuyệt đối hoàn hảo.
Big Five được sử dụng vì đã có lịch sử nghiên cứu dài, hệ thống câu hỏi chuẩn hóa và dữ
liệu công khai phong phú. So với các mô hình khác như MBTI hoặc HEXACO, Big Five có ưu thế
về tính tái lập và độ phủ dữ liệu, phù hợp cho bài toán chuyển đổi số liệu quy mô lớn
@john1999bigfive@ashton2007hexaco. Vì vậy, đề tài chấp nhận giới hạn của mô hình nhưng coi
Big Five là lựa chọn thực tế nhất để làm nền cho pipeline chuyển đổi dữ liệu.

=== Mô hình MBTI (Myers-Briggs Type Indicator)

MBTI phân loại người dùng theo các cặp đối lập, tạo ra 16 nhóm tính cách. Cách biểu diễn
này dễ truyền thông nhưng thiên về phân loại rời rạc, trong khi dữ liệu thực tế thường có
phân bố liên tục. Với bài toán gợi ý cần đo mức độ gần nhau, dạng nhãn rời rạc làm giảm
khả năng xếp hạng chi tiết và khó phản ánh mức độ “gần” giữa hai cá nhân. MBTI cũng có
vấn đề về độ ổn định theo thời gian, nhiều người thay đổi nhóm khi làm lại bài test. Điều
này làm cho dữ liệu khó tái lập và khó dùng cho pipeline so khớp dài hạn. Ngoài ra, MBTI
ít có dữ liệu mở quy mô lớn theo chuẩn hóa số điểm, nên khó dùng cho chuyển đổi PCA và
huấn luyện ổn định. Ví dụ, hai người thuộc nhóm INFP và ENFP có thể khác nhau mạnh về
hướng ngoại nhưng vẫn bị xem là hai nhãn rời rạc. Hình #ref(<fig_mbti_overview>) minh họa
cách MBTI chia nhóm tính cách.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Minh họa mô hình MBTI và cách phân nhóm tính cách],
) <fig_mbti_overview>
#text(10pt, [Gợi ý hình: fig_mbti_overview.png])

=== Mô hình HEXACO

HEXACO mở rộng Big Five bằng cách thêm yếu tố Honesty-Humility. Mô hình này có giá trị về
mặt học thuật, nhưng dữ liệu mở và bộ câu hỏi chuẩn hóa không phổ biến bằng Big Five. Việc
thêm một trait thứ sáu làm tăng số câu hỏi cần thiết để giữ cân bằng độ tin cậy. Điều này
gây áp lực lên trải nghiệm người dùng di động, vì thời gian trả lời dài hơn. Ngoài ra,
chuyển đổi từ HEXACO sang dạng PCA sẽ cần dữ liệu huấn luyện riêng, trong khi dữ liệu chuẩn
không nhiều bằng Big Five. Ví dụ, nếu chỉ dùng 25 câu, mỗi trait sẽ bị giảm số câu đánh
giá, làm tăng nhiễu đo lường. Do đó HEXACO được xem là lựa chọn tham khảo hơn là lựa chọn
chính cho đề tài. Hình #ref(<fig_hexaco_overview>) minh họa cấu trúc HEXACO.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Minh họa cấu trúc 6 yếu tố của HEXACO],
) <fig_hexaco_overview>
#text(10pt, [Gợi ý hình: fig_hexaco_overview.png])

== Chuẩn hóa điểm Big Five

=== Thang đo và hướng câu hỏi

Mỗi câu trả lời được chấm theo thang Likert 1–5. Với câu hỏi hướng dương, điểm giữ nguyên
thứ tự 1→5. Với câu hỏi hướng âm, điểm được đảo chiều. Sau đó các điểm trong cùng trait
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
trait. PCA được dùng để rút gọn chiều và tách các trục phương sai lớn nhất. PCA‑2 hoặc
PCA‑3 giảm nhiều hơn nhưng mất đáng kể thông tin, làm giảm khả năng phân biệt giữa các hồ
sơ gần nhau. PCA‑4 là điểm cân bằng: giảm chiều từ 5 xuống 4 nhưng vẫn giữ phần lớn phương
sai, giúp hệ gợi ý hoạt động ổn định khi đo cosine similarity. Vì vậy, PCA‑4 được chọn sau
bước chuẩn hóa như một lớp chuyển đổi tối ưu cho dữ liệu tính cách.

== Đề xuất PCA‑4

Đề tài đề xuất PCA‑4 như mức giảm chiều tối ưu cho Big Five trong bối cảnh gợi ý bạn bè.
Giảm từ 5 xuống 4 chiều giúp tiết kiệm lưu trữ mà vẫn giữ phần lớn cấu trúc dữ liệu. PCA‑4
cũng là dạng biểu diễn dễ triển khai trên thiết bị với phép nhân ma trận thuần. Mức giảm
nhẹ này giúp hạn chế rủi ro mất thông tin so với PCA‑2 hoặc PCA‑3. Ngoài ra, PCA‑4 giữ
được tính diễn giải tương đối, phù hợp với việc so sánh cosine similarity ổn định. Hình
#ref(<fig_pca_proposal>) gợi ý một minh họa quyết định chọn PCA‑4 dựa trên phương sai.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Minh họa tiêu chí lựa chọn PCA‑4],
) <fig_pca_proposal>
#text(10pt, [Gợi ý hình: fig_pca_proposal.png])

== Huấn luyện PCA

=== Nguồn dữ liệu và quy mô

PCA được huấn luyện từ tập dữ liệu Big Five công khai quy mô lớn, sử dụng tệp
`big_five_scores.csv` (khoảng 307 nghìn bản ghi) @automoto2023bigfive@kaggle2018bigfive.
Dữ liệu bao gồm thông tin theo quốc gia và đã chuẩn hóa điểm về thang 0–1. Trong quá trình
thăm dò, thống kê cho thấy dữ liệu trải rộng khoảng hơn 200 quốc gia và vùng lãnh thổ,
với các phân phối điểm khá ổn định giữa các nhóm quốc gia lớn. Một số bản ghi thiếu nhãn
quốc gia, nhưng các cột điểm số vẫn đầy đủ, vì vậy không ảnh hưởng đến việc huấn luyện PCA.

Phân tích EDA trong notebook cho thấy chênh lệch trung bình giữa các quốc gia tồn tại nhưng
không đủ lớn để cần một mô hình riêng theo vùng. Do đó, PCA được huấn luyện trên toàn bộ
tập dữ liệu để nắm bắt phương sai tổng thể. Đây là quyết định thực tế giúp mô hình ổn định
và tái lập, đồng thời tránh việc phải duy trì nhiều mô hình theo vùng.

Đề tài không huấn luyện mô hình học sâu cho tính cách vì mục tiêu chính là biến đổi và nén
dữ liệu đã có cấu trúc. PCA cho phép giữ tính giải thích, dễ triển khai trên thiết bị và
không cần dữ liệu nhãn bổ sung. Nếu dùng mô hình phức tạp hơn, chi phí huấn luyện và suy
diễn sẽ tăng, trong khi lợi ích bổ sung không rõ ràng vì dữ liệu đã được chuẩn hóa.

=== Công thức chiếu PCA

PCA thực hiện phép chiếu tuyến tính trên dữ liệu đã được trừ mean. Với vector đầu vào $x$
(dài 5), ta có:

#numbered_equation(
  $ z = (x - mu) times W^T $,
  <pca_project>,
)

trong đó $mu$ là vector mean và $W$ là ma trận thành phần chính @jolliffe2002pca. Vector $z$ là PCA‑4 và
được lưu dưới dạng 4 chiều. Hình #ref(<fig_pca_math>) mô tả phép chiếu và định dạng đầu ra.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Minh họa phép chiếu PCA và định dạng vector đầu ra],
) <fig_pca_math>
#text(10pt, [Gợi ý hình: fig_pca_math.png])

=== So sánh PCA‑2, PCA‑3, PCA‑4

Trong notebook thực nghiệm, PCA‑2 chỉ giữ khoảng 63% phương sai, PCA‑3 khoảng 80%, trong
khi PCA‑4 giữ hơn 90% phương sai dữ liệu gốc. Sự chênh lệch này ảnh hưởng trực tiếp đến
khả năng phân biệt giữa các người dùng khi so khớp. Vì vậy PCA‑4 được chọn để giảm mất
thông tin mà vẫn đảm bảo kích thước nhỏ gọn.

Hình #ref(<fig_pca_variance>) minh họa đồ thị phương sai giải thích theo số chiều.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Đồ thị phương sai giải thích theo số chiều PCA],
) <fig_pca_variance>
#text(10pt, [Gợi ý hình: fig_pca_variance.png])

== Triển khai PCA trên thiết bị

=== Cách triển khai

Thay vì chạy mô hình học sâu, PCA‑4 được triển khai bằng phép nhân ma trận thuần trên
thiết bị. Hệ số mean và components được trích từ notebook huấn luyện và lưu cố định trong
ứng dụng. Cách này giảm phụ thuộc vào thư viện ML và hạn chế kích thước bundle.

=== Định dạng lưu trữ

Kết quả PCA‑4 được lưu dưới dạng 4 trường số: pca_dim1..pca_dim4. Các giá trị này được
lưu song song với ciphertext của Big Five. Việc lưu PCA dạng số thực giúp tính cosine
similarity trực tiếp ở phía server khi gợi ý.

== Thảo luận lựa chọn PCA

PCA là phép biến đổi tuyến tính, có thể giải thích và kiểm soát. Các lựa chọn thay thế
như embedding học sâu hoặc semantic embedding không phù hợp vì dữ liệu tính cách đã có
cấu trúc rõ ràng và ít phụ thuộc ngôn ngữ. Ngoài ra, PCA giúp duy trì tính ổn định giữa
các phiên bản, tránh lệch kết quả do thay đổi mô hình.

#pagebreak()
