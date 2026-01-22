#import "/template.typ" : *

#[
  = Hệ giới thiệu và cơ chế xếp hạng <chuong5>
]


Chương này mô tả cách hệ giới thiệu kết hợp ba nguồn tín hiệu: tính cách (PCA), hành vi xã giao
(ELO) và sở thích được nhúng vector (embedding hobbies). Đồng thời, chương giải thích vì sao từng tín hiệu
vẫn cần thiết, ngay cả khi người dùng đã khai báo sở thích, và đi sâu vào các luận điểm
thiết kế đằng sau mỗi thành phần.

== Vì sao vẫn cần tính cách khi đã có sở thích

Sở thích (interests) phản ánh các chủ đề người dùng quan tâm, nhưng không đủ để mô tả mức độ tương hợp
về cách suy nghĩ và hành vi. Hai người cùng thích “chụp ảnh” có thể khác nhau rõ rệt về
cách giao tiếp, nhịp sống và mức độ ổn định cảm xúc. Với các kết nối dài hạn, các khác
biệt này thường quan trọng hơn sở thích bề mặt. Hơn nữa, sở thích có thể mang tính thời điểm
hoặc thay đổi theo xu hướng, trong khi các đặc điểm tính cách cốt lõi theo mô hình Big Five
có xu hướng ổn định hơn nhiều trong suốt cuộc đời của một người trưởng thành.

Vì vậy, tính cách được xác định là *trục ổn định* (stable axis) của hệ giới thiệu, đảm bảo các
kết nối có nền tảng vững chắc và chiều sâu. Sở thích đóng vai trò *trục ngữ cảnh*
(contextual axis), giúp bổ trợ, phá vỡ các trường hợp hòa điểm và tìm ra các điểm chung
tức thời. Việc kết hợp cả hai giúp hệ thống vừa ổn định trong dài hạn, vừa linh hoạt
trong ngắn hạn.

== Đề xuất thuật toán ELO

Trong hệ thống, ELO được dùng như một tín hiệu hành vi ẩn. ELO không nói người dùng “tốt”
hơn hay “xấu” hơn, mà phản ánh mức độ xã giao thể hiện qua lượt like/skip. Công thức cập
nhật dựa trên kỳ vọng thắng thua gốc của Elo @elo1978rating, được điều chỉnh để phù hợp
với bối cảnh kết nối, nơi lượt like là một tín hiệu hợp tác. Cách cập nhật chi tiết đã
được mô tả ở #ref(<algo_elo_expect>) và #ref(<algo_elo_prox>). Việc giới hạn điểm trong khoảng 800–2000 giúp tránh
việc điểm bị trôi quá xa và làm giảm tác dụng phân nhóm hành vi.

#ref(<fig_elo_behavior>) minh họa trực quan cách ELO phản ánh hành vi xã giao qua các
chuỗi like/skip khác nhau.

#figure(
  image("../images/ch5_elo_chart.png", width: 85%),
  caption: [Ví dụ ELO phản ánh hành vi xã giao qua chuỗi tương tác],
) <fig_elo_behavior>


Điểm ELO phản ánh mức độ like/skip trong thực tế. Đây là tín hiệu hành vi, không phải kết
quả tự khai báo. Nó đóng vai trò là một cơ chế hiệu chỉnh, giúp giảm sai lệch giữa những gì
người dùng *nói* họ là (qua bài trắc nghiệm) và những gì họ *làm* (qua hành vi lướt).
Khi người dùng thường xuyên skip, điểm ELO giảm và hệ thống ưu tiên giới thiệu
những người có mức xã giao tương đồng.

ELO trong hệ thống là hệ số ẩn, được cập nhật sau mỗi tương tác và giới hạn trong khoảng
800–2000. Mặc dù cập nhật theo kiểu hợp tác dẫn tới lạm phát điểm, mục tiêu chính là gom
nhóm hành vi thay vì xếp hạng cạnh tranh.


Việc điều chỉnh thuật toán ELO cho bối cảnh mạng xã hội thay vì một trò chơi đối kháng tổng bằng không
(zero-sum game) là một quyết định thiết kế quan trọng.

- *Quy tắc cập nhật "hợp tác"*: Trong cờ vua, một người thắng thì người kia thua. Trong một
  tương tác "like", cả hai đều có thể nhận được giá trị. Việc tăng điểm cho cả hai bên
  khuyến khích tương tác tích cực và tránh "trừng phạt" người được yêu thích. Ngược lại,
  chỉ người chủ động "skip" bị trừ điểm, vì đây là hành động đơn phương thể hiện sự không
  phù hợp từ phía họ.
- *Hệ số K (K-factor)*: Hệ số K=12 được chọn là một giá trị tương đối nhỏ. Điều này làm cho
  điểm ELO thay đổi từ từ, phản ánh một quá trình xây dựng "danh tiếng xã giao" dài hạn
  thay vì biến động mạnh sau vài tương tác. Nó giúp điểm số ổn định hơn và tránh bị lạm dụng.
- *Cơ chế Giới hạn (Clamping) (800-2000)*: Việc giới hạn điểm số trong một khoảng nhất định ngăn chặn
  hiện tượng "lạm phát ELO" vô hạn và giữ cho sự khác biệt về điểm số luôn nằm trong một
  phạm vi có ý nghĩa, đảm bảo thành phần ELO proximity trong công thức tổng hợp không trở
  nên quá lớn hoặc quá nhỏ.

== Ngưỡng sử dụng sở thích

Sở thích chỉ được dùng khi người dùng nhập đủ số lượng tối thiểu (3 mục). Điều
này tránh việc dùng dữ liệu quá ít dẫn tới nhiễu hoặc thiên lệch do một sở thích đơn lẻ.
Khi đủ ngưỡng, vector nhúng (embedding vector) được tạo và dùng độ tương đồng cosine để tính điểm gần nhau
về sở thích. Quy tắc ngưỡng này cũng giúp người dùng mới không bị bất lợi nếu chưa kịp
khai báo đầy đủ sở thích, tạo ra một sân chơi công bằng hơn.

== Đề xuất mô hình ngữ nghĩa (semantic model)

Đề tài sử dụng mô hình ngữ nghĩa của Jina (semantic model) để chuyển đổi văn bản sở thích
thành vector 384 chiều. Lý do chính là khả năng nắm bắt tương đồng ngữ nghĩa thay vì trùng
từ khóa, phù hợp với cách người dùng mô tả sở thích bằng nhiều cách khác nhau. Công thức tính độ tương đồng cosine được trình bày tại #ref(<algo_cosine_similarity>):

#outline_algo(
  $ text("sim")(A, B) = cos(theta) = (A dot B) / (||A|| times ||B||) = (sum_(i=1)^n A_i B_i) / (sqrt(sum_(i=1)^n A_i^2) times sqrt(sum_(i=1)^n B_i^2)) $,
  [Công thức tính độ tương đồng cosine (Cosine Similarity)],
  <algo_cosine_similarity>
)

Mô hình kiểu nhúng câu (sentence embedding) cũng ổn định khi so khớp độ tương đồng cosine, dễ triển khai và ít tốn tài
nguyên hơn so với các mô hình sinh lớn @reimers2019sbert. #ref(<fig_semantic_model>)
mô tả luồng chuyển đổi từ văn bản sang vector và cách dùng độ tương đồng cosine trong giới thiệu.

Trong triển khai hiện tại, hệ thống ghép sở thích thành một chuỗi ngắn theo mẫu
`interests: ...` rồi sinh một vector duy nhất. Cách làm này là một sự đánh đổi có chủ đích
giữa độ chính xác và hiệu năng. Việc chỉ có một vector cho mỗi người dùng giúp giảm chi phí
so sánh xuống O(N), thay vì O(N*k^2) nếu mỗi người có k sở thích và phải so sánh chéo.
Điều này giúp hệ thống có khả năng mở rộng tốt hơn. Quan điểm của đề tài là ưu tiên tính ổn
định và khả năng mở rộng, và chỉ xem xét mô hình đa vector khi có hạ tầng đủ mạnh.

#figure(
  image("../images/ch5_semantic.png", width: 85%),
  caption: [Mức độ tương đồng ngữ nghĩa của hai từ được so sánh bằng cosine similarity.],
) <fig_semantic_model>


TF‑IDF là cách biểu diễn văn bản theo trọng số từ khóa @manning2008ir. Điểm mạnh của TF‑IDF
là đơn giản, dễ giải thích, và chạy nhanh trên thiết bị. Tuy nhiên, TF‑IDF không hiểu ngữ
nghĩa nên khó nhận biết các từ đồng nghĩa như “jogging” và “chạy bộ”. Ngoài ra, TF‑IDF tạo
vector thưa và kích thước lớn, làm tăng chi phí lưu trữ và so khớp khi số lượng từ vựng
tăng. Trong bối cảnh sở thích ngắn và đa dạng, TF‑IDF dễ bị nhiễu bởi các từ hiếm (#ref(<fig_tfidf_alt>)). Vì vậy,
TF‑IDF được coi là lựa chọn thay thế tham khảo chứ không phù hợp làm lõi giới thiệu.

#figure(
  image("../images/ch5_TF‑IDF.png", width: 85%),
  caption: [TF-IDF vượt trội ở khả năng tìm kiếm từ khoá quan trọng.],
) <fig_tfidf_alt>


Word2Vec tạo vector cho từng từ dựa trên ngữ cảnh @mikolov2013efficient. Cách này nắm bắt
được một phần quan hệ ngữ nghĩa, nhưng vẫn gặp khó khi chuyển sang mức câu hoặc cụm sở
thích ngắn. Người dùng thường nhập cụm như “đi phượt cuối tuần” hoặc “nấu ăn healthy”,
trong khi Word2Vec cần thêm bước gộp nhiều vector (ví dụ: lấy trung bình) để đại diện
cho cả cụm. Việc gộp thủ công làm mất sắc thái và không ổn định giữa các mẫu khác nhau (#ref(<fig_word2vec_alt>)).
Do đó, các mô hình nhúng câu được ưu tiên vì xử lý trực tiếp cụm sở thích,
ổn định hơn trong so khớp.

#figure(
  image("../images/ch5_word2vec.png", width: 85%),
  caption: [Word2Vec vượt trội trong việc tìm quan hệ ngữ nghĩa giữa các từ.],
) <fig_word2vec_alt>

== Công thức xếp hạng tổng hợp

Hệ thống tính điểm theo các trọng số đã nêu ở Chương 2. Về bản chất, PCA là trục chính,
ELO là trục hành vi, và hobbies là trục ngữ nghĩa.

Việc đặt PCA làm trục chính giúp kết quả ổn định hơn theo thời gian, vì tính cách thay
đổi chậm và ít bị ảnh hưởng bởi các biến động ngắn hạn. ELO chỉ đóng vai trò điều chỉnh,
tránh trường hợp hai người có tính cách gần nhau nhưng hành vi xã giao quá khác biệt.
Hobbies được dùng như một tín hiệu làm mượt, giúp hệ giới thiệu nhận ra các chủ đề tương đồng
mà tính cách không nắm bắt được. Cấu trúc này giảm rủi ro hệ thống chỉ dựa vào một nguồn
dữ liệu duy nhất, vốn dễ gây thiên lệch hoặc thiếu đa dạng.


Việc lựa chọn và phân bổ các trọng số trong công thức giới thiệu tổng hợp (ví dụ: 60% PCA, 15% ELO, 25% Hobbies) là một quy trình cân nhắc kỹ lưỡng nhằm đạt được sự cân bằng giữa tính ổn định dài hạn và các yếu tố ngữ cảnh tức thời. *Xác định tính cách là nền tảng cốt lõi* đóng vai trò quyết định trong việc duy trì một mối quan hệ bền vững, do đó trọng số cho sự tương đồng PCA luôn được thiết lập ở mức ưu tiên cao nhất, thường chiếm trên 50% tổng điểm giới thiệu. Việc đặt trọng số này ở mức chủ đạo giúp hệ thống lọc ra những người dùng có "sóng não" và xu hướng tâm lý tương hợp dựa trên mô hình Big-5, từ đó giảm thiểu rủi ro của các kết nối bề mặt vốn dễ dẫn đến sự ngắt quãng sau một thời gian ngắn tương tác.

*Sử dụng hành vi xã giao làm yếu tố hiệu chỉnh* thông qua điểm số ELO nhằm tinh chỉnh danh sách giới thiệu sao cho phù hợp với mức độ năng động của từng cá nhân trong thực tế. Trọng số ELO được giữ ở mức thấp nhất trong bộ quy tắc vì nó không phản ánh sự tương hợp về bản chất con người mà chỉ đóng vai trò như một bộ lọc hành vi. Cơ chế này giúp tránh tình trạng giới thiệu "lệch pha" giữa một người dùng quá năng nổ với một người dùng có xu hướng khắt khe hoặc thụ động hơn, từ đó làm mượt trải nghiệm lướt và tăng tỷ lệ phản hồi tích cực dựa trên sự tương đồng về phong cách giao tiếp.

*Coi sở thích cá nhân là chất xúc tác và cầu nối ngữ cảnh* để tạo ra những chủ đề trò chuyện cụ thể ngay từ giai đoạn đầu của việc kết nối. Với trọng số đáng kể nhưng thấp hơn tính cách, thành phần nhúng ngữ nghĩa của sở thích giúp phá vỡ thế hòa điểm giữa các ứng viên có độ tương đồng PCA ngang nhau, đồng thời cung cấp những giới thiệu mang tính thời điểm và thực tế cao hơn. Điều này cho phép người dùng dễ dàng tìm thấy tiếng nói chung thông qua các hoạt động hoặc đam mê cụ thể, từ đó tạo tiền đề cho việc khám phá sâu hơn về tính cách trong tương lai. Các trọng số này có thể được hiệu chỉnh linh hoạt thông qua các thử nghiệm thực tế hoặc cá nhân hóa cho từng nhóm người dùng, nhưng cấu hình hiện tại được xem là một điểm khởi đầu cân bằng, đảm bảo tính khoa học và hiệu quả của hệ thống giới thiệu.


Xét người dùng A đang xem giới thiệu, với ba ứng viên B và C. Giả sử hệ thống đang áp dụng trọng số: 50% PCA, 20% ELO proximity, và 30% Hobbies. Các chỉ số tương đồng thành phần như sau:

- *PCA Similarity*: $text("sim")_P(A, B) = 0.90$, $text("sim")_P(A, C) = 0.90$ (hòa nhau).
- *Hobbies Similarity*: $text("sim")_H(A, B) = 0.85$, $text("sim")_H(A, C) = 0.55$.
- *ELO Proximity*: $p(A, B) = 0.70$, $p(A, C) = 1.00$.

Điểm tổng hợp được tính toán:
$ S_B = 0.5 dot 0.90 + 0.2 dot 0.70 + 0.3 dot 0.85 = 0.845 $
$ S_C = 0.5 dot 0.90 + 0.2 dot 1.00 + 0.3 dot 0.55 = 0.815 $

Trong kịch bản này, mặc dù C có mức độ xã giao (ELO) tương đồng tuyệt đối với A, nhưng lợi thế về sở thích của B đủ lớn để đẩy B lên vị trí cao hơn trong danh sách giới thiệu. Ví dụ này cho thấy các nguồn tín hiệu có thể phá vỡ thế hòa PCA theo các hướng khác nhau, tạo ra kết quả giới thiệu đa chiều và phù hợp với thực tế tương tác.

== Bảo vệ dữ liệu sở thích và quyền riêng tư

Mặc dù UI có thể hiển thị sở thích đã giải mã, cơ sở dữ liệu không lưu văn bản thuần (plaintext). Điều
này tránh việc quản trị viên có thể quét hàng loạt sở thích từ bảng dữ liệu. Người dùng
chỉ thấy sở thích khi đã được xác thực và giải mã thông qua Edge Function.

Ngoài ra, việc lưu ciphertext giúp giảm rủi ro lộ dữ liệu ở cấp độ hệ quản trị. Người
dùng vẫn nhìn thấy sở thích trên UI vì dữ liệu được giải mã theo phiên đăng nhập hợp lệ,
nhưng cơ sở dữ liệu không có điểm tập trung văn bản thuần để khai thác hàng loạt. Đây là điểm
khác biệt quan trọng so với cách lưu trữ sở thích truyền thống trong nhiều ứng dụng mạng
xã hội.

#pagebreak()
