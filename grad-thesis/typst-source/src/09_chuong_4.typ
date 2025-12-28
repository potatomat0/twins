#import "/template.typ" : *

#[
  #set heading(numbering: "Chương 1.1")
  = Bảo mật và mã hóa dữ liệu <chuong4>
]

== Mục tiêu của chương

Chương này trình bày cách dữ liệu được nhập từ góc độ người dùng, cách dữ liệu được chuyển
đổi và mã hóa trước khi lưu trữ, cùng với lý do lựa chọn cơ chế AES‑256‑GCM. Trọng tâm là
luồng dữ liệu và các tác nhân, không đi sâu vào mã nguồn.

== Tổng quan về cơ chế AES‑GCM

=== Nguyên lý cơ bản

AES là thuật toán mã hóa đối xứng khối, hoạt động trên các block cố định và cần một khóa
chung cho cả mã hóa lẫn giải mã. GCM (Galois/Counter Mode) là chế độ hoạt động kết hợp
giữa mã hóa dạng counter và xác thực dữ liệu. Nhờ đó, ngoài ciphertext, hệ thống còn có
thể kiểm tra tính toàn vẹn của dữ liệu @nistel2007gcm. Trong ngữ cảnh dữ liệu tính cách,
đây là điểm quan trọng vì tránh tình trạng ciphertext bị chỉnh sửa âm thầm.

Một phiên AES‑GCM tạo ra thêm authentication tag, giúp phát hiện việc thay đổi dữ liệu
hoặc iv. Nếu tag không khớp, dữ liệu sẽ bị từ chối giải mã. Cơ chế này làm giảm nguy cơ
người dùng nhận dữ liệu sai hoặc bị chỉnh sửa khi truyền qua mạng. Với dữ liệu nhạy cảm
như tính cách và sở thích, việc đảm bảo tính toàn vẹn quan trọng không kém việc giữ bí
mật. Vì vậy AES‑GCM phù hợp hơn các chế độ chỉ mã hóa mà không xác thực.

=== Đầu vào và đầu ra của AES‑GCM

Đầu vào gồm dữ liệu gốc (JSON điểm Big Five hoặc danh sách hobbies), khóa bí mật, và iv
ngẫu nhiên. Đầu ra gồm ciphertext và iv. Trong triển khai của đề tài, iv được lưu riêng
trong cơ sở dữ liệu để phục vụ giải mã. Hình #ref(<fig_aes_io>) mô tả cấu trúc đầu vào và
đầu ra của AES‑GCM.

Ngoài ciphertext, AES‑GCM còn sinh authentication tag. Tag được lưu kèm ciphertext để khi
giải mã có thể kiểm tra tính toàn vẹn. Nếu tag không khớp, hệ thống từ chối giải mã và
ghi log lỗi để tránh trả dữ liệu sai. Cách lưu trữ này giúp dữ liệu cá nhân không bị thay
đổi âm thầm ở cấp độ cơ sở dữ liệu hoặc trong quá trình truyền tải.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Định dạng đầu vào/đầu ra của AES‑GCM],
) <fig_aes_io>
#text(10pt, [Gợi ý hình: fig_aes_io.png])

== Dữ liệu đầu vào từ góc nhìn người dùng

=== Trải nghiệm nhập liệu và ranh giới dữ liệu nhạy cảm

Người dùng đi qua bộ câu hỏi tính cách với 25 câu trên một lượt làm bài. Các câu trả lời
này là dữ liệu nhạy cảm vì có thể suy diễn đặc trưng tâm lý. Ngay khi người dùng hoàn tất
bài trả lời, hệ thống chỉ lưu lại các điểm đã tổng hợp theo Big Five, không lưu câu trả
lời gốc. Việc này giảm bớt rủi ro rò rỉ dữ liệu thô và hạn chế các điểm nhận dạng gián
 tiếp.

Hình #ref(<fig_ui_quiz_flow>) gợi ý bố trí UI và vị trí bước tổng hợp điểm trong luồng
ứng dụng.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Luồng UI và vị trí tổng hợp điểm Big Five],
) <fig_ui_quiz_flow>
#text(10pt, [Gợi ý hình: fig_ui_quiz_flow.png])

=== Chuyển đổi trên thiết bị

Sau khi tổng hợp, điểm Big Five được chuẩn hóa và chuyển đổi PCA‑4 ngay trên thiết bị.
Kết quả PCA là dữ liệu đã giảm chiều, đủ cho so khớp nhưng không thay thế được dữ liệu
thô. Tuy vậy, PCA vẫn là phép biến đổi tuyến tính có thể suy ngược gần đúng nếu biết tham
số. Vì vậy, dữ liệu gốc vẫn cần mã hóa trước khi lưu trữ.

== Mã hóa dữ liệu bằng AES‑256‑GCM

=== Đề xuất AES‑GCM

Đề xuất của đề tài là sử dụng AES‑256‑GCM làm cơ chế mã hóa chính cho dữ liệu tính cách và
sở thích. Lý do là dữ liệu có kích thước nhỏ, cần mã hóa nhanh và phải giải mã được để
hiển thị trên UI. AES‑GCM đáp ứng được ba yêu cầu: tốc độ, xác thực và dễ triển khai trên
Edge Function. Cơ chế này cũng cho phép lưu trữ iv riêng để tái tạo dữ liệu khi người dùng
đăng nhập lại. Trong phạm vi đồ án, AES‑GCM là lựa chọn thực tế nhất để cân bằng bảo mật
và khả năng vận hành.

=== Lý do chọn AES‑GCM

AES‑GCM được chọn vì phù hợp với payload nhỏ, tốc độ tốt, và có cơ chế xác thực dữ liệu
(integrity) cùng lúc với mã hóa @nistel2007gcm. So với RSA hoặc Bcrypt, AES‑GCM ít tốn tài
nguyên hơn khi mã hóa dữ liệu JSON ngắn, và dễ tích hợp trong môi trường Edge Function.

=== Lựa chọn thay thế: RSA

RSA là thuật toán bất đối xứng, thường dùng để trao đổi khóa hoặc ký số @rivest1978rsa.
Trong bối cảnh dữ liệu tính cách, RSA không phù hợp để mã hóa payload trực tiếp vì chi phí
tính toán lớn và giới hạn kích thước dữ liệu. Nếu dùng RSA cho mỗi lượt cập nhật, hệ thống
sẽ tăng thời gian phản hồi và khó mở rộng trên thiết bị di động. Ngoài ra, RSA thường đi
kèm cơ chế padding phức tạp, dễ phát sinh lỗi khi triển khai không cẩn thận. Vì vậy RSA
được xem là lựa chọn thay thế, không phù hợp làm cơ chế mã hóa chính.
Ví dụ, chỉ một payload JSON nhỏ cũng phải qua nhiều bước padding và tách khối, gây chậm
trễ rõ rệt khi người dùng cập nhật hồ sơ liên tục.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Ví dụ chi phí tính toán khi dùng RSA cho payload nhỏ],
) <fig_rsa_alt>
#text(10pt, [Gợi ý hình: fig_rsa_alt.png])
#text(10pt, [Gợi ý hình: fig_rsa_alt.png])

=== Lựa chọn thay thế: Bcrypt/Scrypt

Bcrypt và Scrypt là các hàm băm thiết kế cho mật khẩu @provos1999bcrypt. Ưu điểm của chúng
là làm chậm tấn công brute‑force, nhưng điểm yếu là không thể giải mã. Trong hệ thống Twins,
người dùng cần xem lại kết quả tính cách và sở thích nên cần giải mã dữ liệu. Nếu dùng
bcrypt, hệ thống chỉ có thể so khớp băm, không thể trả dữ liệu gốc cho UI. Điều này đi
ngược yêu cầu trải nghiệm và giới hạn chức năng. Vì vậy bcrypt/scrypt không phù hợp.
Ví dụ, sở thích “chạy bộ” sau khi băm sẽ không thể khôi phục để hiển thị lại trong ứng dụng.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [So sánh dữ liệu băm và dữ liệu có thể giải mã],
) <fig_bcrypt_alt>
#text(10pt, [Gợi ý hình: fig_bcrypt_alt.png])
#text(10pt, [Gợi ý hình: fig_bcrypt_alt.png])

=== Lựa chọn thay thế: Homomorphic encryption

Homomorphic encryption cho phép tính toán trực tiếp trên dữ liệu đã mã hóa @gentry2009fully.
Đây là hướng rất mạnh về bảo mật, nhưng chi phí tính toán cao và triển khai phức tạp. Với
bài toán gợi ý cần phản hồi nhanh, việc dùng homomorphic encryption sẽ làm tăng độ trễ
và đòi hỏi hạ tầng đặc biệt. Ngoài ra, mô hình này không cần thiết vì đề tài không tính
trực tiếp trên ciphertext mà chỉ lưu trữ và giải mã khi cần. Do đó, homomorphic encryption
vượt quá phạm vi thực tế của đề tài.
Ví dụ, một phép so khớp cosine trên ciphertext có thể chậm hơn nhiều lần so với dữ liệu
plaintext, gây cảm giác lag ở trải nghiệm di động.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Minh họa độ phức tạp của homomorphic encryption],
) <fig_homomorphic_alt>
#text(10pt, [Gợi ý hình: fig_homomorphic_alt.png])
#text(10pt, [Gợi ý hình: fig_homomorphic_alt.png])

=== Lựa chọn thay thế: Differential privacy

Differential privacy tập trung vào ẩn danh khi công bố thống kê @dwork2006dp. Phương pháp
này phù hợp cho dữ liệu tổng hợp, nhưng không giải quyết bài toán lưu trữ và giải mã dữ
liệu cá nhân. Nếu chỉ áp dụng differential privacy, người dùng vẫn cần truy cập dữ liệu
gốc, dẫn tới vấn đề bảo mật ở cấp độ lưu trữ. Trong hệ thống Twins, yêu cầu là bảo vệ dữ
liệu từng người nhưng vẫn cho phép họ xem lại nội dung. Vì vậy, differential privacy
được coi như kỹ thuật bổ trợ chứ không thay thế AES‑GCM.
Ví dụ, nếu cộng nhiễu vào điểm Big Five để bảo vệ thống kê, kết quả gợi ý cá nhân sẽ
giảm chính xác và khó giải thích cho người dùng.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [So sánh differential privacy và mã hóa dữ liệu cá nhân],
) <fig_dp_alt>
#text(10pt, [Gợi ý hình: fig_dp_alt.png])
#text(10pt, [Gợi ý hình: fig_dp_alt.png])

=== Vai trò của Edge Function và khóa bí mật

Khóa AES chỉ tồn tại ở phía Edge Function. Thiết bị người dùng không giữ khóa, nhằm tránh
bị trích xuất từ ứng dụng. Đồng thời, cách làm này cho phép người dùng phục hồi dữ liệu
khi đăng nhập lại trên thiết bị khác. Đây là lựa chọn cân bằng giữa bảo mật và khả năng
khôi phục.

Hình #ref(<fig_crypto_flow>) mô tả luồng dữ liệu mã hóa và giải mã.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Luồng mã hóa/giải mã dữ liệu Big Five qua Edge Function],
) <fig_crypto_flow>
#text(10pt, [Gợi ý hình: fig_crypto_flow.png])

Hình #ref(<fig_edge_logs>) gợi ý log của Edge Function cho quá trình mã hóa và giải mã.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Log Edge Function khi mã hóa và giải mã dữ liệu], 
) <fig_edge_logs>
#text(10pt, [Gợi ý hình: fig_edge_logs.png])

=== Lưu trữ và giới hạn truy cập

Cơ sở dữ liệu chỉ lưu ciphertext và iv cho Big Five (b5_cipher, b5_iv). Điều này có nghĩa
là quản trị viên cơ sở dữ liệu không thể đọc trực tiếp dữ liệu tính cách dạng thô. Dữ liệu
chỉ được giải mã khi người dùng đã xác thực và gọi qua Edge Function. Cách làm này hạn chế
nguy cơ mass surveillance từ bảng dữ liệu plaintext, đồng thời vẫn cho phép người dùng xem
lại kết quả trong UI.

Hình #ref(<fig_cipher_sample>) minh họa mẫu dữ liệu ciphertext lưu trong cơ sở dữ liệu.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Ví dụ ciphertext của Big Five trong bảng profiles],
) <fig_cipher_sample>
#text(10pt, [Gợi ý hình: fig_cipher_sample.png])

== Dữ liệu sở thích và mã hóa

Sở thích người dùng được nhập dưới dạng văn bản tự do, sau đó được nhúng thành vector 384
chiều. Dữ liệu này cũng được mã hóa theo cơ chế AES‑GCM tương tự Big Five. Do đó, UI có
thể hiển thị sở thích sau khi giải mã, nhưng cơ sở dữ liệu không lưu plaintext.

Hình #ref(<fig_hobby_encrypt>) mô tả luồng dữ liệu sở thích từ nhập liệu đến lưu trữ.

#figure(
  image("/images/placeHolderImage.png", width: 85%),
  caption: [Luồng mã hóa dữ liệu sở thích và lưu trữ vector embedding],
) <fig_hobby_encrypt>
#text(10pt, [Gợi ý hình: fig_hobby_encrypt.png])

#pagebreak()
