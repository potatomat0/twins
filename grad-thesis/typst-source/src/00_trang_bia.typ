#let trang_bia(title, authors) = {
  rect(
    stroke: 5pt,
    inset: 7pt,
    rect(
      width: 100%,
      height: 100%,
      inset: 15pt,
      stroke: 1.7pt,
      [
        #set align(center)
        #text(12pt, strong("ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH")) \
        #text(13pt, strong("TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN")) \
        #text(13pt, strong("KHOA KHOA HỌC VÀ KỸ THUẬT THÔNG TIN"))
        
        #v(0.6cm)
        #image("/images/UIT.png", width: 25%)
        
        #v(1cm)
        #text(14pt, strong("HOÀNG MINH NHẬT - 24550031"))
        
        #v(2cm)
        #text(16pt, strong("KHÓA LUẬN TỐT NGHIỆP"))
        #v(0.5cm)
        #text(18pt, strong(upper(title)))
        #v(0.5cm)
        #text(14pt, fill: rgb("#FF0000"), strong("On-device personality-based friend recommendation for privacy-preserving social networking"))
        
        #v(2.5cm)
        #text(14pt, strong("CỬ NHÂN NGÀNH CÔNG NGHỆ THÔNG TIN"))
        
        #v(1fr)
        #text(12pt, strong("TP. HỒ CHÍ MINH, 2025"))
      ]
    )
  )
}