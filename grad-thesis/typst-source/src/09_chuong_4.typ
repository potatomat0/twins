#import "/template.typ" : *

#[
  = Bảo mật và mã hoá dữ liệu <chuong4>
]

== Mục tiêu của chương

Chương này trình bày cách dữ liệu được nhập từ góc độ người dùng, cách dữ liệu được chuyển
đổi và mã hoá trước khi lưu trữ, cùng với lý do lựa chọn cơ chế AES-256-GCM. Trọng tâm là
luồng dữ liệu và các tác nhân, không đi sâu vào mã nguồn chi tiết.

== Tổng quan về cơ chế AES-GCM

=== Nguyên lý cơ bản



AES là thuật toán mã hoá đối xứng khối, hoạt động trên các khối dữ liệu cố định và cần một khóa

chung cho cả quá trình mã hoá lẫn giải mã. Chế độ GCM (Galois/Counter Mode) kết hợp

giữa mã hoá dạng bộ đếm (counter mode) và cơ chế xác thực dữ liệu.



#outline_algo(

  [

    1.  *Khởi tạo*: Tạo khóa bí mật $K$ và vector khởi tạo ngẫu nhiên $I V$.

    2.  *Mã hoá*: $C = E_K(I V, P)$, trong đó $P$ là văn bản thuần, $C$ là văn bản mã hoá.

    3.  *Xác thực*: Sinh thẻ xác thực $T$ dựa trên $K, I V$ và $C$.

    4.  *Lưu trữ*: Lưu cặp $(C, I V, T)$ vào cơ sở dữ liệu.

    5.  *Giải mã*: Kiểm tra $T$ trước khi khôi phục $P = D_K(I V, C)$.

  ],

  [Quy trình mã hoá và xác thực dữ liệu bằng AES-256-GCM],

  <algo_aes_gcm>

)



Nhờ đó, ngoài dữ liệu đã mã hoá (ciphertext), hệ thống còn có thể kiểm tra tính toàn vẹn (integrity) của dữ liệu @nistel2007gcm.

 Trong ngữ cảnh dữ liệu tính cách,
yếu tố này rất quan trọng để đảm bảo dữ liệu không bị thay đổi trái phép mà không bị phát hiện.

Một phiên làm việc AES-GCM tạo ra thêm thẻ xác thực (authentication tag), giúp phát hiện bất kỳ sự thay đổi nào đối với dữ liệu
hoặc vector khởi tạo (Initialization Vector - IV). Nếu thẻ xác thực không khớp, dữ liệu sẽ bị từ chối giải mã. Cơ chế này làm giảm nguy cơ
người dùng nhận phải dữ liệu sai lệch hoặc đã bị chỉnh sửa khi truyền qua mạng. Với dữ liệu nhạy cảm
như tính cách và sở thích, việc đảm bảo tính toàn vẹn quan trọng không kém việc giữ bí
mật. Vì vậy, AES-GCM phù hợp hơn các chế độ chỉ mã hoá mà không đi kèm xác thực.

=== Đầu vào và đầu ra của AES-GCM

Đầu vào bao gồm dữ liệu gốc (dưới dạng JSON chứa điểm Big Five hoặc danh sách sở thích), khóa bí mật, và một IV
ngẫu nhiên. Đầu ra bao gồm dữ liệu đã mã hoá (ciphertext) và IV tương ứng. Trong triển khai của đề tài, IV được lưu trữ riêng
trong cơ sở dữ liệu để phục vụ quá trình giải mã sau này. #ref(<fig_aes_io>) mô tả cấu trúc đầu vào và
đầu ra của quy trình này.

Việc lưu trữ thẻ xác thực đi kèm ciphertext cho phép hệ thống kiểm tra tính toàn vẹn ngay tại thời điểm giải mã. Nếu phát hiện sai lệch, hệ thống sẽ từ chối giải mã và
ghi nhận lỗi, ngăn chặn việc trả về dữ liệu sai. Cách lưu trữ này bảo vệ dữ liệu cá nhân khỏi các thay
đổi ngầm ở cấp độ cơ sở dữ liệu hoặc trong quá trình truyền tải.

#figure(
  image("../images/ch4_aes_io.png", width: 85%),
  caption: [Định dạng đầu vào/đầu ra của AES-GCM],
) <fig_aes_io>

== Dữ liệu đầu vào từ góc nhìn người dùng

=== Trải nghiệm nhập liệu và ranh giới dữ liệu nhạy cảm

Người dùng thực hiện bộ câu hỏi tính cách gồm 25 câu hỏi trong một lượt. Các câu trả lời
này được xem là dữ liệu nhạy cảm vì có thể dùng để suy diễn đặc trưng tâm lý. Ngay khi người dùng hoàn tất,
hệ thống chỉ lưu lại các điểm số đã được tổng hợp theo mô hình Big Five, không lưu trữ câu trả
lời gốc cho từng câu hỏi. Việc này giúp giảm thiểu rủi ro rò rỉ dữ liệu thô và hạn chế khả năng định danh gián tiếp.

#ref(<fig_ui_quiz_flow>) minh họa bố trí giao diện và vị trí bước tổng hợp điểm trong luồng
ứng dụng.

#figure(
  image("../images/ch4_ui_flow.png", width: 85%),
  caption: [Luồng giao diện và vị trí tổng hợp điểm Big Five],
) <fig_ui_quiz_flow>

=== Chuyển đổi trên thiết bị

Sau khi tổng hợp, điểm Big Five được chuẩn hóa và chuyển đổi sang không gian PCA-4 ngay trên thiết bị người dùng.
Kết quả PCA là dữ liệu đã giảm chiều, đủ cho mục đích so khớp nhưng không thay thế hoàn toàn được dữ liệu
thô. Tuy nhiên, vì PCA là phép biến đổi tuyến tính, thông tin gốc vẫn có thể bị suy ngược gần đúng nếu biết tham
số mô hình. Do đó, dữ liệu gốc vẫn cần được mã hoá trước khi lưu trữ.

== Mã hóa dữ liệu bằng AES-256-GCM

=== Đề xuất AES-GCM

Đề tài đề xuất sử dụng AES-256-GCM làm cơ chế mã hoá chính cho dữ liệu tính cách và
sở thích. Lý do là dữ liệu có kích thước nhỏ, yêu cầu tốc độ xử lý nhanh và cần khả năng giải mã để
hiển thị lại trên giao diện người dùng. AES-GCM đáp ứng tốt ba yêu cầu: tốc độ, xác thực và dễ dàng triển khai trên
các hàm thực thi biên (Edge Function). Cơ chế này cũng cho phép lưu trữ IV riêng biệt để tái tạo dữ liệu khi người dùng
đăng nhập lại. Trong phạm vi khóa luận, AES-GCM là lựa chọn tối ưu để cân bằng giữa bảo mật
và khả năng vận hành thực tế.

=== Lý do chọn AES-GCM

AES-GCM được lựa chọn vì phù hợp với các gói dữ liệu (payload) nhỏ, tốc độ cao, và tích hợp sẵn cơ chế xác thực dữ liệu
(integrity) cùng lúc với mã hoá @nistel2007gcm. So với RSA hoặc Bcrypt, AES-GCM tiêu tốn ít tài
nguyên hơn khi mã hoá các chuỗi JSON ngắn, và dễ dàng tích hợp trong môi trường Edge Function.

=== Lựa chọn thay thế: RSA

RSA là thuật toán mã hoá bất đối xứng, thường dùng để trao đổi khóa hoặc ký số @rivest1978rsa.
Trong bối cảnh dữ liệu tính cách, RSA không phù hợp để mã hoá trực tiếp dữ liệu vì chi phí
tính toán lớn và giới hạn về kích thước dữ liệu đầu vào. Nếu sử dụng RSA cho mỗi lần cập nhật hồ sơ, hệ thống
sẽ gặp vấn đề về độ trễ và khó mở rộng trên thiết bị di động. Ngoài ra, RSA thường đi
kèm các cơ chế đệm (padding) phức tạp, dễ phát sinh lỗi nếu không được triển khai cẩn trọng. Vì vậy, RSA
được xem là phương án thay thế nhưng không phù hợp làm cơ chế mã hoá chính cho dữ liệu người dùng, như minh họa tại #ref(<fig_rsa_alt>).
Ví dụ, việc mã hoá một gói tin JSON nhỏ bằng RSA đòi hỏi nhiều bước xử lý đệm và tách khối, gây chậm
trễ đáng kể khi người dùng cập nhật hồ sơ liên tục.

#figure(
  image("../images/ch4_rsa_alt.png", width: 85%),
  caption: [Ví dụ chi phí tính toán khi dùng RSA cho payload nhỏ],
) <fig_rsa_alt>

=== Lựa chọn thay thế: Bcrypt/Scrypt

Bcrypt và Scrypt là các hàm băm mật khẩu (password hashing function) @provos1999bcrypt. Ưu điểm của chúng
là làm chậm các cuộc tấn công dò khóa (brute-force), nhưng nhược điểm là dữ liệu sau khi băm không thể giải mã để lấy lại nội dung gốc. Trong hệ thống Twins,
người dùng cần xem lại kết quả tính cách và sở thích của mình, do đó yêu cầu bắt buộc là phải giải mã được dữ liệu. Nếu dùng
bcrypt, hệ thống chỉ có thể so khớp chuỗi băm mà không thể trả lại dữ liệu gốc cho giao diện (#ref(<fig_bcrypt_alt>)). Điều này đi
ngược lại yêu cầu về trải nghiệm người dùng và giới hạn chức năng của ứng dụng. Vì vậy, các hàm băm này không phù hợp.
Ví dụ, sở thích “chạy bộ” sau khi băm sẽ trở thành một chuỗi ký tự ngẫu nhiên và không thể khôi phục để hiển thị lại là “chạy bộ”.

#figure(
  image("../images/ch4_hashing.png", width: 85%),
  caption: [So sánh dữ liệu băm và dữ liệu có thể giải mã],
) <fig_bcrypt_alt>

=== Lựa chọn thay thế: Homomorphic encryption

Mã hoá đồng hình (Homomorphic encryption) cho phép thực hiện tính toán trực tiếp trên dữ liệu đã mã hoá mà không cần giải mã @gentry2009fully.
Đây là hướng đi rất mạnh về bảo mật, nhưng chi phí tính toán cực kỳ cao và việc triển khai rất phức tạp. Với
bài toán giới thiệu cần phản hồi nhanh, việc áp dụng mã hoá đồng hình sẽ làm tăng độ trễ hệ thống
và đòi hỏi hạ tầng phần cứng đặc biệt (#ref(<fig_homomorphic_alt>)). Ngoài ra, mô hình này chưa thực sự cần thiết vì đề tài không yêu cầu tính toán
phức tạp trực tiếp trên dữ liệu mã hoá mà chỉ cần lưu trữ an toàn và giải mã khi cần thiết. Do đó, mã hoá đồng hình
vượt quá phạm vi thực tế của khóa luận.
Ví dụ, một phép so khớp cosine trên dữ liệu mã hoá đồng hình có thể chậm hơn nhiều lần so với trên dữ liệu
văn bản thuần, gây trải nghiệm kém mượt mà trên thiết bị di động.

#figure(
  image("../images/ch4_he.png", width: 85%),
  caption: [Minh họa độ phức tạp của mã hoá đồng hình],
) <fig_homomorphic_alt>

=== Lựa chọn thay thế: Differential privacy

Sự riêng tư biệt lập (Differential privacy) tập trung vào việc ẩn danh hóa khi công bố các số liệu thống kê @dwork2006dp. Phương pháp
này phù hợp cho dữ liệu tổng hợp, nhưng không giải quyết được bài toán lưu trữ và giải mã dữ
liệu cho từng cá nhân cụ thể. Nếu chỉ áp dụng sự riêng tư biệt lập, người dùng vẫn cần truy cập vào dữ liệu
gốc của chính mình, dẫn tới vấn đề bảo mật vẫn tồn tại ở cấp độ lưu trữ (#ref(<fig_dp_alt>)). Trong hệ thống Twins, yêu cầu là bảo vệ dữ
liệu của từng người nhưng vẫn cho phép họ xem lại nội dung đó. Vì vậy, sự riêng tư biệt lập
được coi như một kỹ thuật bổ trợ chứ không thể thay thế cho AES-GCM.
Ví dụ, nếu cộng thêm nhiễu vào điểm Big Five để bảo vệ tính ẩn danh trong thống kê, kết quả giới thiệu cá nhân hóa cho người dùng sẽ
bị giảm độ chính xác và khó giải thích.

#figure(
  image("../images/ch4_dp.png", width: 85%),
  caption: [So sánh sự riêng tư biệt lập và mã hoá dữ liệu cá nhân],
) <fig_dp_alt>

=== Vai trò của Edge Function và khóa bí mật

Khóa AES chỉ tồn tại ở phía Edge Function (máy chủ biên). Thiết bị người dùng không lưu trữ khóa này, nhằm tránh nguy cơ
bị trích xuất từ ứng dụng. Đồng thời, cách thiết kế này cho phép người dùng phục hồi dữ liệu
khi đăng nhập lại trên một thiết bị khác. Đây là sự cân bằng hợp lý giữa bảo mật và khả năng
khôi phục dữ liệu.

#ref(<fig_edge_logs>) minh họa nhật ký (log) của Edge Function cho quá trình mã hoá và giải mã.


#figure(
  image("../images/ch4_edge_logs.png", width: 85%),
  caption: [Nhật ký Edge Function khi mã hoá và giải mã dữ liệu], 
) <fig_edge_logs>

=== Lưu trữ và giới hạn truy cập

Cơ sở dữ liệu chỉ lưu trữ dữ liệu đã mã hoá và IV cho Big Five (các trường `b5_cipher`, `b5_iv`). Điều này có nghĩa
là quản trị viên cơ sở dữ liệu không thể đọc trực tiếp dữ liệu tính cách dưới dạng văn bản thuần. Dữ liệu
chỉ được giải mã khi người dùng đã xác thực thành công và gửi yêu cầu thông qua Edge Function. Cách làm này hạn chế
nguy cơ giám sát hàng loạt (mass surveillance) từ bảng dữ liệu chưa mã hoá, đồng thời vẫn đảm bảo tính năng xem
lại kết quả cho người dùng.

#ref(<fig_cipher_sample>) minh họa mẫu dữ liệu đã mã hoá được lưu trong cơ sở dữ liệu.

#figure(
  image("../images/ch4_db_sample.png", width: 85%),
  caption: [Ví dụ dữ liệu đã mã hoá của Big Five trong bảng profiles],
) <fig_cipher_sample>

== Dữ liệu sở thích và mã hóa

Sở thích người dùng được nhập dưới dạng văn bản tự do, sau đó được nhúng thành vector 384
chiều. Dữ liệu văn bản này cũng được mã hoá theo cơ chế AES-GCM tương tự như Big Five. Do đó, giao diện ứng dụng có
thể hiển thị lại sở thích sau khi giải mã, nhưng cơ sở dữ liệu hoàn toàn không lưu trữ văn bản thuần.

#ref(<fig_hobby_encrypt>) mô tả luồng dữ liệu sở thích từ nhập liệu đến lưu trữ.

#figure(
  image("../images/ch4_hobby_flow.png", width: 85%),
  caption: [Luồng mã hoá dữ liệu sở thích và lưu trữ vector nhúng],
) <fig_hobby_encrypt>

#pagebreak()
