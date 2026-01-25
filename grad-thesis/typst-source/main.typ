#import "template.typ": *

#show: project.with(
  title: "Hệ thống giới thiệu kết bạn dựa trên tính cách, xử lý trực tiếp trên thiết bị để bảo vệ quyền riêng tư",
  authors: ((name: "Hoàng Minh Nhật"),),
)


#include "src/06_chuong_1.typ"
#include "src/07_chuong_2.typ"
#include "src/08_chuong_3.typ"
#include "src/09_chuong_4.typ"
#include "src/10_chuong_5.typ"
#include "src/10a_chuong_6.typ"
#include "src/10b_ket_qua_thuc_nghiem.typ"
#include "src/11_ket_luan_revised.typ"
#{
  show heading: none
  heading(numbering: none)[TÀI LIỆU THAM KHẢO]
}
#align(center, text(14pt, weight: "bold", [TÀI LIỆU THAM KHẢO]))
#bibliography("ref.bib", style: "ieee", title: none)
#pagebreak()
#include "src/13_phu_luc_revised.typ"
