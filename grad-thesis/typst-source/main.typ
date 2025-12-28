#import "template.typ": *

#show: project.with(
  title: "Hệ thống gợi ý kết bạn dựa trên tính cách, xử lý trực tiếp trên thiết bị để bảo vệ quyền riêng tư",
  authors: ((name: "Hoàng Minh Nhật"),),
)

// #include "src/05_bang_thuat_ngu.typ"
// #include "chapters/05_trang_thong_tin_do_an_en.typ"

#counter(page).update(1)
#set page(numbering: "1")
#set heading(numbering: "1.1.", supplement: "Chương")

#include "src/06_chuong_1.typ"
#include "src/07_chuong_2.typ"
#include "src/08_chuong_3.typ"
// TODO: add new chapter files for the rest of the thesis
#include "src/09_chuong_4.typ"
#include "src/10_chuong_5.typ"
// #include "src/11_ket_luan.typ"
// #include "src/12_cong_bo_lien_quan.typ"
#bibliography("ref.bib", style: "elsevier-vancouver")
// #include "src/13_phu_luc.typ"
