#import "@preview/touying:0.5.3": *
#import "stargazer.typ": *

#show: stargazer-theme.with(
  aspect-ratio: "16-9",
  config-info(
    subtitle: [Hệ thống giới thiệu kết bạn dựa trên tính cách, xử lý trực tiếp trên thiết bị và bảo vệ quyền riêng tư],
    author: [Hoàng Minh Nhật],
    instructor: [ThS Ngô Khánh Khoa],
    date: "2025",
    institution: [Đại học Quốc gia TP. Hồ Chí Minh],
  ),
)

#set text(font: "New Computer Modern", lang: "vi")
#set heading(numbering: "1.")
#set par(justify: true)
#show figure.caption: set text(14pt)

// ====== COVER (not counted) ======
#slide(navigation: none, progress-bar: false, self => [
  #v(0.4cm)
  #grid(
    columns: (auto, 1fr),
    gutter: 20pt,
    align: center + horizon,
    [
      #image("images/UIT.png", width: 70%)
    ],
    [
      #align(left, [
        #set text(size: 16pt)
        ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH \
        TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN \
        KHOA KHOA HỌC VÀ KỸ THUẬT THÔNG TIN \
        #text(10pt, strong("—o0o—"))
      ])
    ],
  )
  #v(0.6cm)
  #align(center, text(28pt, strong([HỆ THỐNG GIỚI THIỆU KẾT BẠN DỰA TRÊN TÍNH CÁCH, XỬ LÝ TRỰC TIẾP TRÊN THIẾT BỊ VÀ BẢO VỆ QUYỀN RIÊNG TƯ])))
  #v(0.6cm)
  #align(center, [
    #set text(size: 18pt)
    #grid(
      columns: (auto, auto),
      align: (left, left),
      column-gutter: 26pt,
      row-gutter: 16pt,
      [Sinh viên thực hiện:], [*Hoàng Minh Nhật - 24550031*],
      [Giảng viên hướng dẫn:], [*ThS Ngô Khánh Khoa*],
      [Cử nhân ngành:], [Công nghệ thông tin],
    )
  ])
  #v(0.4cm)
  #align(center, text(13pt, fill: red, strong([On-device personality-based friend recommendation for privacy-preserving social networking])))
  #v(1fr)
])

// ====== OUTLINE (content 1/10) ======
#slide[
  = Mục lục
  #v(0.4cm)
  #set list(indent: 1em)
  - Bối cảnh & động lực
  - Mục tiêu & đóng góp
  - Kiến trúc hệ thống tổng thể
  - Dữ liệu tính cách & PCA on-device
  - Bảo mật & lưu trữ dữ liệu nhạy cảm
  - Mô hình gợi ý & xếp hạng
  - Quy trình nghiệp vụ (End-to-End)
  - Hiện thực & công nghệ
  - Đánh giá & kết quả
  - Demo
]

// ====== SLIDE 2 (content 2/10) ======
#slide[
  = Bối cảnh & động lực
  #grid(
    columns: (1.1fr, 1fr),
    gutter: 16pt,
    align: horizon,
    [
      #set list(indent: 1em)
      - Ứng dụng kết bạn cần gợi ý phù hợp nhưng phải tôn trọng quyền riêng tư.
      - Dữ liệu tính cách (Big Five) và sở thích là dữ liệu nhạy cảm.
      - Giải pháp: xử lý trực tiếp trên thiết bị + mã hóa dữ liệu trước khi lưu trữ.
    ],
    [
      #image("images/ch1_privacy_risk.png", width: 100%)
    ],
  )
]

// ====== SLIDE 3 (content 3/10) ======
#slide[
  = Mục tiêu & đóng góp
  #set list(indent: 1em)
  - Xây dựng hệ thống gợi ý kết bạn dựa trên tính cách + sở thích.
  - Thiết kế pipeline xử lý tính cách trên thiết bị (PCA 5D → 4D).
  - Mã hóa dữ liệu nhạy cảm bằng AES-256-GCM qua Edge Functions.
  - Kết hợp điểm tương đồng PCA, ELO và sở thích để xếp hạng gợi ý.
  - Triển khai ứng dụng di động + backend Supabase.
]

// ====== SLIDE 4 (content 4/10) ======
#slide[
  = Kiến trúc hệ thống tổng thể
  #v(0.2cm)
  #image("images/ch2_pipeline_overview.png", width: 98%)
  #v(0.3cm)
  #set list(indent: 1em)
  - Client: thu thập Big Five & sở thích, xử lý PCA on-device.
  - Backend: lưu trữ mã hóa, tính điểm, gợi ý qua Edge Functions.
]

// ====== SLIDE 5 (content 5/10) ======
#slide[
  = Dữ liệu tính cách & PCA on-device
  #grid(
    columns: (1fr, 1fr),
    gutter: 16pt,
    align: horizon,
    [
      #set list(indent: 1em)
      - Thang đo Big Five (IPIP-50).
      - Chuẩn hóa theo mean thống kê.
      - PCA giảm chiều 5 → 4 để tăng tốc và ổn định.
      - Tính toán ngay trên thiết bị, không cần ML server.
    ],
    [
      #image("images/ch1_pca_pipeline.png", width: 100%)
    ],
  )
]

// ====== SLIDE 6 (content 6/10) ======
#slide[
  = Bảo mật & lưu trữ dữ liệu nhạy cảm
  #grid(
    columns: (1fr, 1fr),
    gutter: 16pt,
    align: horizon,
    [
      #set list(indent: 1em)
      - Không lưu plaintext Big Five hoặc sở thích.
      - Mã hóa AES-256-GCM qua Edge Function `score-crypto`.
      - Lưu `b5_cipher`, `hobbies_cipher` + `iv`.
      - Phân quyền và RLS trên Supabase.
    ],
    [
      #image("images/ch4_aes_io.png", width: 100%)
    ],
  )
]

// ====== SLIDE 7 (content 7/10) ======
#slide[
  = Mô hình gợi ý & xếp hạng
  #grid(
    columns: (1fr, 1fr),
    gutter: 16pt,
    align: horizon,
    [
      #set list(indent: 1em)
      - Tương đồng tính cách: cosine trên PCA 4D.
      - Độ gần ELO: ưu tiên mức tương đương.
      - Sở thích: vector embedding + similarity.
      - Điểm tổng: kết hợp có trọng số theo cấu hình.
    ],
    [
      #image("images/ch5_semantic.png", width: 100%)
    ],
  )
]

// ====== SLIDE 8 (content 8/10) ======
#slide[
  = Quy trình nghiệp vụ End-to-End
  #v(0.2cm)
  #image("images/ch4_ui_flow.png", width: 96%)
  #v(0.2cm)
  #set list(indent: 1em)
  - Người dùng trả lời Big Five + chọn sở thích.
  - PCA on-device → mã hóa → lưu DB.
  - Edge Function gợi ý & trả về danh sách.
]

// ====== SLIDE 9 (content 9/10) ======
#slide[
  = Hiện thực & công nghệ
  #grid(
    columns: (1fr, 1fr),
    gutter: 16pt,
    align: horizon,
    [
      #set list(indent: 1em)
      - Frontend: React Native (Expo), Zustand, i18n.
      - Backend: Supabase (Auth, DB, Edge Functions).
      - On-device ML: PCA weights nhúng trong app.
      - Realtime: Supabase Realtime + RealtimeManager.
    ],
    [
      #image("images/ch1_context.png", width: 100%)
    ],
  )
]

// ====== SLIDE 10 (content 10/10) ======
#slide[
  = Đánh giá & kết quả
  #grid(
    columns: (1fr, 1fr),
    gutter: 16pt,
    align: horizon,
    [
      #set list(indent: 1em)
      - Độ tương đồng PCA ổn định sau giảm chiều.
      - Pipeline gợi ý chạy nhanh, đáp ứng realtime.
      - Mã hóa đảm bảo dữ liệu nhạy cảm không lộ.
    ],
    [
      #image("images/ch5_elo_chart.png", width: 100%)
    ],
  )
]

// ====== DEMO (not counted) ======
#slide[
  = Demo (15 phút)
  #set list(indent: 1em)
  - Đăng nhập tài khoản demo.
  - Trả lời một phần Big Five, cập nhật sở thích.
  - Xem danh sách gợi ý và thao tác like/match.
  - Kiểm tra hồ sơ chi tiết và lịch sử match.
]

// ====== ENDING (not counted) ======
#slide[
  = Kết thúc
  #v(0.6cm)
  #align(center, text(26pt, strong([Xin cảm ơn hội đồng và thầy/cô đã lắng nghe])))
  #v(0.4cm)
  #align(center, text(16pt, [Q&A]))
]
