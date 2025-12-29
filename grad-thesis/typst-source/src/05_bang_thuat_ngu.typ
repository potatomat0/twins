#import "/template.typ": *

#[
  #set heading(numbering: none)
  = Danh mục Thuật ngữ và Chữ viết tắt <bang_thuat_ngu>
]

#v(1em)

#table(
  columns: (auto, 1.5fr, 3fr),
  inset: 1em,
  align: (left, left, left),
  table.header(
    [*Viết tắt*], [*Tên đầy đủ / Thuật ngữ*], [*Giải thích*]
  ),
  
  // Nhóm 1: Mô hình và Thuật toán cốt lõi
  [PCA], [Principal Component Analysis], [Phân tích thành phần chính. Kỹ thuật giảm chiều dữ liệu được sử dụng để nén vector tính cách 5 chiều xuống 4 chiều nhằm tối ưu hóa lưu trữ và so khớp.],
  
  [Big Five / OCEAN], [Big Five Personality Traits], [Mô hình 5 yếu tố tính cách lớn bao gồm: Cởi mở (Openness), Tận tâm (Conscientiousness), Hướng ngoại (Extraversion), Hòa đồng (Agreeableness), và Bất ổn cảm xúc (Neuroticism).],
  
  [IPIP], [International Personality Item Pool], [Kho ngân hàng câu hỏi trắc nghiệm tâm lý học quốc tế, nguồn dữ liệu gốc cho bộ câu hỏi đánh giá tính cách sử dụng trong hệ thống.],
  
  [Cosine Similarity], [Độ tương đồng Cosine], [Độ đo góc giữa hai vector khác 0 trong không gian tích vô hướng, được dùng để tính toán mức độ phù hợp giữa tính cách của hai người dùng.],
  
  [ELO], [ELO Rating System], [Hệ thống xếp hạng ban đầu dành cho cờ vua, được đề tài cải tiến để mô hình hóa hành vi tương tác xã hội (thích/bỏ qua) của người dùng.],

  // Nhóm 2: Bảo mật và Mật mã
  [AES-256-GCM], [Advanced Encryption Standard - Galois/Counter Mode], [Chuẩn mã hóa đối xứng với độ dài khóa 256-bit kết hợp chế độ xác thực GCM, đảm bảo cả tính bí mật và tính toàn vẹn của dữ liệu tính cách.],
  
  [PbD], [Privacy by Design], [Quyền riêng tư theo thiết kế. Cách tiếp cận kỹ thuật mà trong đó quyền riêng tư được coi là nền tảng mặc định ngay từ khâu thiết kế kiến trúc hệ thống.],
  
  [HE], [Homomorphic Encryption], [Mã hóa đồng hình. Một dạng mã hóa cho phép thực hiện tính toán trực tiếp trên dữ liệu mã hóa mà không cần giải mã (đề cập trong hướng phát triển).],

  // Nhóm 3: Công nghệ và Kiến trúc
  [RLS], [Row Level Security], [Chính sách bảo mật mức hàng trong PostgreSQL, cho phép kiểm soát quyền truy cập dữ liệu chi tiết đến từng bản ghi dựa trên định danh người dùng.],
  
  [BaaS], [Backend-as-a-Service], [Mô hình dịch vụ đám mây cung cấp các chức năng backend (DB, Auth, Storage) đóng gói sẵn. Đề tài sử dụng Supabase làm nền tảng BaaS.],
  
  [Edge Functions], [Edge Computing Functions], [Các hàm thực thi tại biên (serverless) giúp xử lý các tác vụ tính toán nhẹ và mã hóa dữ liệu gần người dùng nhất để giảm độ trễ.],
  
  [Cold Start], [Vấn đề khởi động lạnh], [Tình trạng hệ thống gợi ý hoạt động kém hiệu quả khi người dùng mới tham gia chưa có lịch sử tương tác. Đề tài giải quyết bằng cách dùng tính cách làm dữ liệu khởi tạo.],
  
  [UI / UX], [User Interface / User Experience], [Giao diện người dùng và Trải nghiệm người dùng.],
  
  [JSON], [JavaScript Object Notation], [Định dạng trao đổi dữ liệu văn bản nhẹ, ngôn ngữ độc lập, được sử dụng để truyền tải dữ liệu giữa Client và Server.]
)

#pagebreak()
