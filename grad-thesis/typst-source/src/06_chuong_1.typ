#import "/template.typ" : *

#[
  = Giới thiệu <chuong1>
]

== Bối cảnh và vấn đề

=== Mạng xã hội và nhu cầu kết nối theo tính cách

Twins là một ứng dụng mạng xã hội theo hướng bán khép kín, tập trung vào các cộng đồng
nhỏ và chất lượng. Ứng dụng hướng tới việc tìm bạn có tính cách và sở thích tương đồng,
lấy cảm hứng từ cơ chế lướt của Tinder và yếu tố kết nối thân mật của Locket. Khác với
những nền tảng đại trà, Twins ưu tiên kết nối có chiều sâu thay vì số lượng tương tác.
Mục tiêu này dẫn tới việc giảm bớt các tín hiệu bề mặt và tăng trọng số cho các yếu tố
phản ánh đặc trưng cá nhân ổn định hơn. Về mặt trải nghiệm, người dùng được dẫn qua một
chuỗi câu hỏi ngắn gọn để trích xuất tính cách, sau đó dùng kết quả này như một “dấu vân
tính cách” phục vụ giới thiệu và phân nhóm.

Các nền tảng mạng xã hội và ứng dụng kết nối hiện nay thường tối ưu cho tốc độ ghép cặp và
số lượt tương tác, dựa trên yếu tố vị trí, sở thích bề mặt hoặc mạng bạn bè sẵn có. Cách
tiếp cận này tạo ra nhiều kết quả, nhưng chưa chắc dẫn tới sự tương hợp lâu dài. Trong khi
đó, các mô hình tính cách như Big-5 được xem là khung tham chiếu ổn định, có khả năng
giải thích xu hướng hành vi và mức độ phù hợp giữa các cá nhân @tupes1961recurrent@john1999bigfive.

Ở góc nhìn của đề tài, nhu cầu kết nối theo tính cách có ý nghĩa vì nó gắn với các đặc
trưng ít thay đổi theo thời gian, nên phù hợp cho bài toán giới thiệu dài hạn. Lựa chọn này cũng
tránh việc phụ thuộc quá nhiều vào dữ liệu tương tác ngắn hạn, vốn dễ bị ảnh hưởng bởi bối
cảnh, tâm trạng hoặc hiệu ứng thuật toán. #ref(<fig_context_social_apps>) minh họa bối
cảnh ứng dụng và mục tiêu kết nối theo tính cách.

#figure(
  image("../images/ch1_context.png", width: 85%),
  caption: [Bối cảnh ứng dụng mạng xã hội và nhu cầu kết nối theo tính cách],
) <fig_context_social_apps>

=== Rủi ro dữ liệu tính cách và yêu cầu bảo vệ

Dữ liệu tính cách có thể được suy diễn từ hành vi số hoặc từ bài trắc nghiệm, và thường
được xem là dữ liệu nhạy cảm vì nó liên quan trực tiếp đến xu hướng tâm lý và hành vi của
người dùng. Nhiều nghiên cứu chỉ ra rằng đặc điểm tính cách có thể dự đoán từ dữ liệu số
và có mức độ ổn định cao @youyou2015computer. Đồng thời, các đặc điểm này có thể bị khai
thác để tác động đến hành vi, ví dụ trong các kịch bản thao túng nội dung hoặc quảng cáo
cá nhân hóa quá mức @meng2021tiktok. Việc thu thập và lưu trữ tập trung vì thế cần được
xem xét cẩn trọng về quyền riêng tư.

Trong những năm gần đây, nhiều nền tảng lớn liên tục bị cơ quan quản lý chỉ trích và xử
phạt vì vi phạm quyền riêng tư. Ví dụ, FTC đã áp mức phạt 5 tỉ USD với Facebook vì các
vi phạm về dữ liệu cá nhân @ftc2019facebook. Ở châu Âu, CNIL áp phạt Google vì thiếu minh
bạch và không có cơ sở pháp lý đầy đủ cho việc xử lý dữ liệu @cnil2019google. Các vụ việc
này cho thấy áp lực pháp lý ngày càng tăng đối với những hệ thống thu thập dữ liệu người
dùng quy mô lớn. Trong bối cảnh đó, việc thiết kế một quy trình (pipeline) có cơ chế bảo vệ dữ liệu ngay
từ đầu là nhu cầu thực tế, không chỉ là lựa chọn kỹ thuật.

Trong bối cảnh đó, đề tài đặt ra yêu cầu bảo vệ dữ liệu tính cách ở mức tương tự như các
loại dữ liệu nhạy cảm khác (tin nhắn, mật khẩu). Thay vì để dữ liệu gốc tồn tại dạng
văn bản thuần (plaintext) trên máy chủ, hệ thống cần có cơ chế chuyển đổi và mã hoá để giảm thiểu rủi ro rò rỉ.
#ref(<fig_privacy_risks>) mô tả các rủi ro chính khi xử lý dữ liệu tính cách theo
mô hình tập trung.

#figure(
  image("../images/ch1_privacy_risk.png", width: 85%),
  caption: [Rủi ro khi xử lý dữ liệu tính cách theo mô hình tập trung],
) <fig_privacy_risks>

== Mục tiêu và phạm vi

=== Mục tiêu chính

Mục tiêu của đề tài là xây dựng một quy trình giới thiệu và bảo vệ dữ liệu tính cách, trong
đó dữ liệu gốc được xử lý trên thiết bị, chuyển sang biểu diễn gọn hơn, và chỉ lưu trữ
trên máy chủ dưới dạng mã hoá. Bên cạnh đó, hệ thống vẫn phải giữ khả năng so khớp và giới thiệu người dùng một cách hiệu quả.

Các mục tiêu chính gồm:

- Xây dựng cơ chế chuyển đổi điểm Big Five sang không gian đặc trưng nhỏ gọn bằng Phân tích Thành phần chính (Principal Component Analysis - PCA) với 4 chiều (PCA-4).
- Thiết kế cơ chế mã hoá theo Chuẩn mã hóa tiên tiến ở chế độ Galois/Counter (AES-GCM) để bảo vệ dữ liệu tính cách khi lưu trữ.
- Duy trì khả năng so khớp dựa trên độ tương đồng cosine (cosine similarity) để phục vụ quy trình giới thiệu.

=== Phạm vi thực hiện

Đề tài tập trung vào khía cạnh chuyển đổi dữ liệu và bảo mật, không đi sâu vào triển khai
giao diện hay tối ưu hóa trải nghiệm người dùng. Phạm vi hệ thống bao gồm:

- Thiết bị người dùng thực hiện chấm điểm Big Five và chuyển đổi PCA-4.
- Một hàm thực thi biên (Edge Function) chịu trách nhiệm mã hoá và giải mã bằng AES-GCM.
- Cơ sở dữ liệu lưu trữ vector PCA và dữ liệu đã mã hoá (ciphertext) thay vì dữ liệu thô.

Ngoài ra, từ các biểu diễn đã chuyển đổi này, hệ thống giới thiệu sẽ khai thác thêm các nguồn
dữ liệu đã được nhúng vector (embedding) từ sở thích và tương tác, nhằm tạo ra kết quả giới thiệu có
ý nghĩa thực tế nhưng vẫn giữ được nguyên tắc bảo mật thông tin cá nhân.

== Bài toán và cách tiếp cận

=== Bài toán chuyển đổi dữ liệu tính cách

Bài toán đặt ra là chuyển đổi vector Big Five 5 chiều thành biểu diễn nhỏ gọn nhưng vẫn
giữ được tính phân biệt đủ cao cho việc so khớp. Có nhiều hướng thay thế như dùng mô hình
nhúng ngữ nghĩa hoặc học sâu, nhưng các hướng này thường yêu cầu dữ liệu huấn luyện
lớn hơn và khó giải thích.

Trong đề tài, PCA được chọn vì Big Five là mô hình tâm lý chuẩn hóa, đã có dữ liệu công
khai quy mô lớn và ổn định theo quốc gia @tupes1961recurrent@john1999bigfive. PCA cho phép
giảm chiều mà vẫn giữ được phần lớn phương sai. Kết quả từ notebook thực nghiệm cho thấy
PCA-4 giữ khoảng hơn 90% phương sai của dữ liệu gốc, trong khi PCA-2 hoặc PCA-3 mất đáng
kể thông tin @automoto2023bigfive. #ref(<fig_pca_pipeline>) mô tả quy trình giới thiệu
Big Five sang PCA-4.

Một điểm quan trọng là tính cách khác với ngôn ngữ tự nhiên. Đối với ngôn ngữ, việc nhúng
văn bản thường dựa trên các mô hình ngữ nghĩa (semantic model) lớn vì nội dung có tính mơ hồ, đa nghĩa và phụ
thuộc ngữ cảnh. Trong khi đó, Big Five đã là một mô hình tâm lý chuẩn hóa, có cấu trúc dữ
liệu rõ ràng và nguồn dữ liệu đủ lớn. Vì vậy PCA và độ tương đồng cosine phù hợp hơn cho
phần tính cách, giúp giữ tính diễn giải và ổn định. Các mô hình ngữ nghĩa vẫn được sử dụng
cho phần sở thích (hobbies), nơi dữ liệu là văn bản tự do và cần ánh xạ ngữ nghĩa.

Nói cách khác, đề tài không tìm cách “học lại” tính cách bằng mô hình ngôn ngữ, mà tận
dụng một hệ đo đã có sẵn trong tâm lý học. PCA chỉ là bước nén và sắp xếp lại thông tin,
không thay đổi ý nghĩa gốc của Big Five. Điều này giúp tránh lệch chuẩn khi dùng mô hình
học sâu khó giải thích, đồng thời giảm phụ thuộc vào dữ liệu huấn luyện nội bộ. Tính cách
vì thế được xử lý như một tín hiệu có cấu trúc, còn ngôn ngữ được xử lý như tín hiệu mở.

Ở cấp độ thu thập, hệ thống sử dụng bộ câu hỏi tính cách lớn hơn, sau đó chọn ngẫu nhiên
25 câu cho mỗi lượt làm bài. Mỗi 5 câu đại diện cho một nhóm đặc điểm (trait), và điểm số được cộng
hoặc trừ tùy theo hướng câu hỏi. Mô hình không phụ thuộc nội dung câu hỏi mà chỉ quan tâm
đến hướng (key) và trait tương ứng. Cách tiếp cận này giúp duy trì tính nhất quán của
thang đo trong khi giảm tải thời gian trả lời cho người dùng.

#figure(
  image("../images/ch1_pca_pipeline.png", width: 85%),
  caption: [Quy trình giới thiệu Big Five sang vector PCA-4],
) <fig_pca_pipeline>

=== Bài toán bảo mật dữ liệu

PCA không phải cơ chế bảo mật. Các thành phần PCA có thể bị suy ngược gần đúng nếu biết
tham số mô hình. Vì vậy, dữ liệu gốc vẫn cần được mã hoá. Trong số các phương án, AES-256-GCM
được chọn vì phù hợp với khối lượng dữ liệu (payload) nhỏ, tốc độ cao và có tính toàn vẹn dữ liệu (integrity)
nhờ GCM @nistel2007gcm. So với RSA hoặc Bcrypt, AES-GCM ít tốn tài nguyên hơn cho dữ liệu
dạng JSON, và phù hợp với mô hình hàm thực thi biên.

Trong hệ thống, khóa AES chỉ nằm ở phía máy chủ (Edge Function). Thiết bị người dùng không
giữ khóa, nhằm tránh nguy cơ bị trích xuất từ ứng dụng và vẫn cho phép khôi phục dữ liệu
khi đăng nhập lại trên thiết bị khác. #ref(<fig_encrypt_flow>) mô tả luồng mã hoá và
lưu trữ dữ liệu tính cách.

#figure(
  image("../images/ch1_encrypt_flow.png", width: 85%),
  caption: [Luồng mã hoá AES-GCM và lưu trữ dữ liệu tính cách],
) <fig_encrypt_flow>


== Đóng góp chính

=== Đóng góp về mô hình chuyển đổi

Đề tài xây dựng quy trình chuyển đổi Big Five sang PCA-4 chạy trên thiết bị, đảm bảo giảm
kích thước dữ liệu nhưng vẫn giữ phần lớn thông tin. Hệ số PCA được huấn luyện trên tập
dữ liệu công khai quy mô lớn, giúp kết quả có tính ổn định và tái lập.

=== Đóng góp về bảo mật

Đề tài đề xuất cơ chế mã hoá AES-256-GCM qua Edge Function, đảm bảo dữ liệu gốc không lưu
dưới dạng văn bản thuần trên cơ sở dữ liệu. Cách tiếp cận này cân bằng giữa khả năng so khớp và yêu cầu
bảo mật dữ liệu nhạy cảm.

=== Đóng góp về tài liệu kỹ thuật và minh chứng

Toàn bộ mã nguồn cốt lõi của ứng dụng, bao gồm quy trình xử lý trên thiết bị, các hàm thực thi biên và cấu trúc cơ sở dữ liệu, được cung cấp đính kèm cùng báo cáo này. Đây là nguồn tài liệu minh chứng cho quá trình hiện thực, đồng thời phục vụ công tác thẩm định và đối soát kết quả của Hội đồng.

== Cấu trúc của báo cáo

Phần còn lại của báo cáo được trình bày như sau:
- @chuong2: Trình bày quy trình tổng thể của hệ thống Twins, từ thu thập dữ liệu đến giới thiệu.
- @chuong3: Phân tích chi tiết PCA-4, dữ liệu huấn luyện và cách chuyển đổi.
- @chuong4: Trình bày cơ chế bảo mật và luồng mã hoá/giải mã.
- @chuong5: Trình bày hệ giới thiệu (PCA, ELO, hobbies) và cách tính trọng số.
- @chuong6: Thực nghiệm và đánh giá hệ thống.
- @ketluan: Kết luận và hướng phát triển.

#pagebreak()
