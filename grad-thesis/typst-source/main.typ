#import "template.typ": *

#show: project.with(
  title: "Hệ thống giới thiệu kết bạn dựa trên tính cách, xử lý trực tiếp trên thiết bị để bảo vệ quyền riêng tư",
  authors: ((name: "Hoàng Minh Nhật"),),
)

#counter(page).update(1)
#set page(numbering: "1")
#set heading(numbering: "1.1.", supplement: "Chương")

#include "src/06_chuong_1.typ"
#include "src/07_chuong_2.typ"
#include "src/08_chuong_3.typ"
#include "src/09_chuong_4.typ"
#include "src/10_chuong_5.typ"
#include "src/10a_chuong_6.typ"
#include "src/10b_ket_qua_thuc_nghiem.typ"
#include "src/11_ket_luan_revised.typ"
#include "src/12_cong_bo_lien_quan_revised.typ"
#bibliography("ref.bib", style: "elsevier-vancouver")
#include "src/13_phu_luc_revised.typ"
