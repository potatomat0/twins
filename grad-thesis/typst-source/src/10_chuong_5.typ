#import "/template.typ" : *

#[
  #set heading(numbering: "Chương 1.1")
  = Hệ gợi ý và cơ chế xếp hạng <chuong5>
]

== Mục tiêu của chương

Chương này mô tả cách hệ gợi ý kết hợp ba nguồn tín hiệu: tính cách (PCA), hành vi xã giao
(ELO) và sở thích (embedding hobbies). Đồng thời, chương giải thích vì sao từng tín hiệu
vẫn cần thiết, ngay cả khi người dùng đã khai báo sở thích.

== Vì sao vẫn cần tính cách khi đã có sở thích

Sở thích phản ánh các chủ đề người dùng quan tâm, nhưng không đủ để mô tả mức độ tương hợp
về cách suy nghĩ và hành vi. Hai người cùng thích “chụp ảnh” có thể khác nhau rõ rệt về
cách giao tiếp, nhịp sống và mức độ ổn định cảm xúc. Với các kết nối dài hạn, các khác
biệt này thường quan trọng hơn sở thích bề mặt. Vì vậy, tính cách vẫn là trục chính để
bảo đảm kết nối có chiều sâu, còn sở thích đóng vai trò bổ trợ. Hệ gợi ý dùng PCA như
trục ổn định, còn sở thích giúp tinh chỉnh trong các trường hợp hòa điểm.

== Đề xuất thuật toán ELO

Trong hệ thống, ELO được dùng như một tín hiệu hành vi ẩn. ELO không nói người dùng “tốt”
hơn hay “xấu” hơn, mà phản ánh mức độ xã giao thể hiện qua lượt like/skip. Công thức cập
nhật dựa trên kỳ vọng thắng thua gốc của Elo @elo1978rating, được điều chỉnh để phù hợp
với bối cảnh kết nối, nơi lượt like là một tín hiệu hợp tác. Cách cập nhật chi tiết đã
được mô tả ở @elo_expect và @elo_prox. Việc giới hạn điểm trong khoảng 800–2000 giúp tránh
việc điểm bị trôi quá xa và làm giảm tác dụng phân nhóm hành vi.

Hình #ref(<fig_elo_behavior>) minh họa trực quan cách ELO phản ánh hành vi xã giao qua các
chuỗi like/skip khác nhau.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Ví dụ ELO phản ánh hành vi xã giao qua chuỗi tương tác],
) <fig_elo_behavior>
#text(10pt, [Gợi ý hình: fig_elo_behavior.png])

== Vai trò của ELO trong hành vi xã giao

Điểm ELO phản ánh mức độ like/skip trong thực tế. Đây là tín hiệu hành vi, không phải kết
quả tự khai báo. Khi người dùng thường xuyên skip, điểm ELO giảm và hệ thống ưu tiên gợi ý
những người có mức xã giao tương đồng. Điều này giúp giảm sai lệch giữa câu trả lời trắc
nghiệm và hành vi thực tế.

ELO trong hệ thống là hệ số ẩn, được cập nhật sau mỗi tương tác và giới hạn trong khoảng
800–2000. Mặc dù cập nhật theo kiểu hợp tác dẫn tới lạm phát điểm, mục tiêu chính là gom
nhóm hành vi thay vì xếp hạng cạnh tranh.

== Ngưỡng sử dụng sở thích

Sở thích chỉ được dùng khi người dùng nhập đủ số lượng tối thiểu (ví dụ 3–5 mục). Điều
này tránh việc dùng dữ liệu quá ít dẫn tới nhiễu hoặc thiên lệch do một sở thích đơn lẻ.
Khi đủ ngưỡng, vector embedding được tạo và dùng cosine similarity để tính điểm gần nhau
về sở thích. Quy tắc ngưỡng này cũng giúp người dùng mới không bị bất lợi nếu chưa kịp
khai báo đầy đủ sở thích.

== Đề xuất mô hình ngữ nghĩa (semantic model)

Đề tài sử dụng mô hình ngữ nghĩa của Jina (semantic model) để chuyển đổi văn bản sở thích
thành vector 384 chiều. Lý do chính là khả năng nắm bắt tương đồng ngữ nghĩa thay vì trùng
từ khóa, phù hợp với cách người dùng mô tả sở thích bằng nhiều cách khác nhau. Mô hình kiểu
sentence embedding cũng ổn định khi so khớp cosine similarity, dễ triển khai và ít tốn tài
nguyên hơn so với các mô hình sinh lớn @reimers2019sbert. Hình #ref(<fig_semantic_model>)
mô tả luồng chuyển đổi từ văn bản sang vector và cách dùng cosine similarity trong gợi ý.

Trong triển khai hiện tại, hệ thống ghép sở thích thành một chuỗi ngắn theo mẫu
`interests: ...` rồi sinh một vector duy nhất. Cách làm này giúp giảm chi phí so sánh,
vì mỗi người chỉ có một vector để tính cosine similarity. Nếu muốn tối ưu độ chính xác,
có thể sinh nhiều vector cho từng sở thích riêng và so khớp theo tổ hợp nhiều ma trận.
Tuy nhiên, cách này làm độ phức tạp tăng rất nhanh theo số sở thích và số ứng viên, đồng
thời tăng tải lưu trữ và truy vấn trên pgvector. Quan điểm của đề tài là ưu tiên tính ổn
định và khả năng mở rộng, nên dùng một vector tổng hợp ở giai đoạn hiện tại và chỉ xem
xét mô hình đa vector khi có hạ tầng đủ mạnh.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Luồng tạo embedding sở thích bằng semantic model],
) <fig_semantic_model>
#text(10pt, [Gợi ý hình: fig_semantic_model.png])

=== Lựa chọn thay thế: TF‑IDF

TF‑IDF là cách biểu diễn văn bản theo trọng số từ khóa @manning2008ir. Điểm mạnh của TF‑IDF
là đơn giản, dễ giải thích, và chạy nhanh trên thiết bị. Tuy nhiên, TF‑IDF không hiểu ngữ
nghĩa nên khó nhận biết các từ đồng nghĩa như “jogging” và “chạy bộ”. Ngoài ra, TF‑IDF tạo
vector thưa và kích thước lớn, làm tăng chi phí lưu trữ và so khớp khi số lượng từ vựng
tăng. Trong bối cảnh sở thích ngắn và đa dạng, TF‑IDF dễ bị nhiễu bởi các từ hiếm. Vì vậy,
TF‑IDF được coi là lựa chọn thay thế tham khảo chứ không phù hợp làm lõi gợi ý.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Ví dụ hạn chế của TF‑IDF khi so khớp sở thích],
) <fig_tfidf_alt>
#text(10pt, [Gợi ý hình: fig_tfidf_alt.png])

=== Lựa chọn thay thế: Word2Vec

Word2Vec tạo vector cho từng từ dựa trên ngữ cảnh @mikolov2013efficient. Cách này nắm bắt
được một phần quan hệ ngữ nghĩa, nhưng vẫn gặp khó khi chuyển sang mức câu hoặc cụm sở
thích ngắn. Người dùng thường nhập cụm như “đi phượt cuối tuần” hoặc “nấu ăn healthy”,
trong khi Word2Vec cần thêm bước gộp nhiều vector để đại diện cho cả cụm. Việc gộp thủ
công làm mất sắc thái và không ổn định giữa các mẫu khác nhau. Do đó, các mô hình sentence
embedding được ưu tiên vì xử lý trực tiếp cụm sở thích, ổn định hơn trong so khớp.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [So sánh Word2Vec và sentence embedding trên cụm sở thích],
) <fig_word2vec_alt>
#text(10pt, [Gợi ý hình: fig_word2vec_alt.png])

== Công thức xếp hạng tổng hợp

Hệ thống tính điểm theo các trọng số đã nêu ở Chương 2. Về bản chất, PCA là trục chính,
ELO là trục hành vi, và hobbies là trục ngữ nghĩa. Hình #ref(<fig_rank_flow>) mô tả cây
quyết định tính điểm và cách nhánh ELO/hobbies được bật tắt.

Việc đặt PCA làm trục chính giúp kết quả ổn định hơn theo thời gian, vì tính cách thay
đổi chậm và ít bị ảnh hưởng bởi các biến động ngắn hạn. ELO chỉ đóng vai trò điều chỉnh,
tránh trường hợp hai người có tính cách gần nhau nhưng hành vi xã giao quá khác biệt.
Hobbies được dùng như một tín hiệu làm mượt, giúp hệ gợi ý nhận ra các chủ đề tương đồng
mà tính cách không nắm bắt được. Cấu trúc này giảm rủi ro hệ thống chỉ dựa vào một nguồn
dữ liệu duy nhất, vốn dễ gây thiên lệch hoặc thiếu đa dạng.

#figure(
  image("/images/placeHolderImage.png", width: 90%),
  caption: [Cây quyết định tính điểm gợi ý],
) <fig_rank_flow>
#text(10pt, [Gợi ý hình: fig_rank_flow.png])

== Ví dụ minh họa xếp hạng

Xét người dùng A đang xem gợi ý, với ba ứng viên B và C. Giả sử:

- PCA similarity: A‑B = 0.90, A‑C = 0.90 (hòa nhau).
- Hobbies similarity: A‑B = 0.85, A‑C = 0.55.
- ELO proximity: A‑B = 0.70, A‑C = 1.00.

Trong cấu hình bật cả ELO và hobbies, điểm cuối của B sẽ tăng nhờ hobbies, còn C tăng nhờ
ELO. Nếu trọng số hobbies lớn hơn phần chênh lệch ELO, B sẽ đứng trước. Nếu ngược lại,
C sẽ đứng trước. Ví dụ này cho thấy các nguồn tín hiệu có thể phá vỡ thế hòa PCA theo các
hướng khác nhau.

== Bảo vệ dữ liệu sở thích và quyền riêng tư

Mặc dù UI có thể hiển thị sở thích đã giải mã, cơ sở dữ liệu không lưu plaintext. Điều
này tránh việc quản trị viên có thể quét hàng loạt sở thích từ bảng dữ liệu. Người dùng
chỉ thấy sở thích khi đã được xác thực và giải mã thông qua Edge Function.

Ngoài ra, việc lưu ciphertext giúp giảm rủi ro lộ dữ liệu ở cấp độ hệ quản trị. Người
dùng vẫn nhìn thấy sở thích trên UI vì dữ liệu được giải mã theo phiên đăng nhập hợp lệ,
nhưng cơ sở dữ liệu không có điểm tập trung plaintext để khai thác hàng loạt. Đây là điểm
khác biệt quan trọng so với cách lưu trữ sở thích truyền thống trong nhiều ứng dụng mạng
xã hội.

#pagebreak()
