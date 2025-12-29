#let trang_phu_bia(title, authors) = {
  set page(margin: (left: 3cm, right: 2cm, top: 2cm, bottom: 2cm))
  
  // Trang phụ thường có khung đơn giản hoặc giữ nguyên format
  rect(
    width: 100%,
    height: 100%,
    stroke: 1pt,
    inset: 1cm,
    [
      #set align(center)
      #text(13pt, strong("ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH"))
      #v(0.2cm)
      #text(14pt, strong("TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN"))
      #v(0.2cm)
      #text(14pt, strong("KHOA KHOA HỌC VÀ KỸ THUẬT THÔNG TIN"))

      #v(1.5cm)
      #text(14pt, strong("HOÀNG MINH NHẬT - 24550031"))

      #v(2.5cm)
      #text(16pt, strong("KHÓA LUẬN TỐT NGHIỆP"))
      #v(0.5cm)
      #text(18pt, strong(upper(title)))
      #v(0.5cm)
      #text(14pt, fill: red, strong("On-device personality-based friend recommendation for privacy-preserving social networking"))

      #v(2cm)
      #text(14pt, strong("CỬ NHÂN NGÀNH CÔNG NGHỆ THÔNG TIN"))

      #v(1.5cm)
      #align(center)[
        #text(14pt, strong("CÁN BỘ HƯỚNG DẪN: ThS Ngô Khánh Khoa"))
      ]

      #v(1fr)
      #text(13pt, strong("TP. HỒ CHÍ MINH, 2025"))
    ]
  )
}