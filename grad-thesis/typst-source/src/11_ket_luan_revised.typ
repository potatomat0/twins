#import "/template.typ" : *

#[
  #set heading(numbering: none)
  = Kết luận và Hướng phát triển <ketluan>
]

== Tóm tắt bài toán và kết quả đạt được

Khóa luận này giải quyết bài toán xây dựng một hệ thống gợi ý kết bạn trên nền tảng di động, với trọng tâm là sự tương hợp về tính cách và yêu cầu bảo vệ quyền riêng tư cho dữ liệu người dùng. Vấn đề cốt lõi là làm thế nào để vừa có thể so khớp hiệu quả các đặc trưng tâm lý nhạy cảm, vừa giảm thiểu rủi ro rò rỉ thông tin khi lưu trữ và xử lý trên máy chủ.

Để giải quyết bài toán này, khóa luận đã đề xuất và triển khai một pipeline hoàn chỉnh với các đóng góp chính sau:

1.  *Mô hình chuyển đổi tính cách trên thiết bị*: Xây dựng thành công quy trình chuyển đổi điểm tính cách Big Five sang không gian vector 4 chiều (PCA-4). Phép biến đổi này được thực hiện trực tiếp trên thiết bị của người dùng, giúp giảm chiều dữ liệu, giữ lại hơn 90% phương sai và che mờ một phần thông tin gốc trước khi gửi lên máy chủ.

2.  *Cơ chế bảo mật "Privacy by Design"*: Triển khai luồng mã hóa AES-256-GCM cho dữ liệu Big Five gốc và sở thích của người dùng thông qua Edge Function. Kiến trúc này đảm bảo rằng không có dữ liệu nhạy cảm nào được lưu dưới dạng plaintext trong cơ sở dữ liệu, giúp bảo vệ thông tin người dùng ngay cả khi có sự truy cập trái phép vào DB.

3.  *Hệ thống gợi ý lai (Hybrid)*: Xây dựng một thuật toán xếp hạng kết hợp ba nguồn tín hiệu: sự tương đồng về tính cách (từ PCA-4), hành vi xã giao (qua điểm ELO) và sự tương đồng về sở thích (qua semantic embedding). Mô hình lai này cho phép tạo ra các gợi ý vừa có chiều sâu, vừa linh hoạt và phản ánh được hành vi thực tế của người dùng.

Qua thực nghiệm, hệ thống đã chứng minh được tính hiệu quả của các thành phần trên. Mô hình PCA-4 cho thấy khả năng xác định chính xác các cặp người dùng có tính cách tương đồng. Hệ thống gợi ý lai cho kết quả xếp hạng đa dạng và phù hợp hơn. Đồng thời, các cơ chế bảo mật hoạt động ổn định với độ trễ chấp nhận được, không ảnh hưởng tiêu cực đến trải nghiệm người dùng.

== Hạn chế của đề tài

Mặc dù đã đạt được các mục tiêu chính, khóa luận vẫn còn một số hạn chế cần được xem xét:

- *Quy mô thực nghiệm*: Các thử nghiệm được thực hiện trên tập dữ liệu giả lập với quy mô nhỏ. Hiệu năng và chất lượng của hệ thống gợi ý, đặc biệt là thành phần ELO, cần được kiểm chứng thêm với lượng người dùng thực tế lớn hơn.
- *Đánh giá chất lượng gợi ý*: Việc đánh giá hiện tại chủ yếu mang tính định tính và dựa trên các kịch bản được định sẵn. Để có một đánh giá định lượng sâu sắc hơn, cần xây dựng các bộ dữ liệu có "ground truth" hoặc tiến hành các thử nghiệm A/B testing trong môi trường thực tế.
- *Mô hình embedding sở thích*: Mô hình semantic embedding hiện tại dựa trên một dịch vụ bên ngoài. Việc tự huấn luyện (fine-tuning) một mô hình embedding trên tập dữ liệu sở thích của chính ứng dụng có thể mang lại kết quả phù hợp hơn nữa.

== Hướng phát triển trong tương lai

Dựa trên các kết quả và hạn chế, có một số hướng phát triển tiềm năng cho hệ thống:

- *Tối ưu hóa hiệu năng*: Khi lượng người dùng tăng, cần áp dụng các kỹ thuật tối ưu hóa cho hàm gợi ý `recommend-users` như caching, pre-computation, và đặc biệt là geosharding để giảm không gian tìm kiếm.
- *Mở rộng mô hình gợi ý*: Có thể bổ sung thêm các nguồn tín hiệu khác vào mô hình lai, ví dụ như phân tích ẩn danh các mẫu hình tương tác hoặc phong cách giao tiếp trong tin nhắn.
- *Phân tích và giải thích kết quả*: Xây dựng các tính năng cho phép người dùng hiểu tại sao họ được gợi ý một người dùng khác ("Explainable AI"), ví dụ như "bạn và người này cùng có xu hướng hướng ngoại" hoặc "cùng yêu thích phim khoa học viễn tiễn".
- *Bảo mật nâng cao*: Nghiên cứu khả năng áp dụng các kỹ thuật bảo mật tiên tiến hơn như Homomorphic Encryption cho một số tác vụ tính toán đơn giản trên máy chủ mà không cần giải mã dữ liệu.

#pagebreak()
