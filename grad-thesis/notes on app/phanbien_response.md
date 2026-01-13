# PHAN HOI PHIEU PHAN BIEN (BAN TAM)

Tai lieu nay dung de dien vao bieu mau "TEMPLATE_PhanBienKLTN-PhamNhatDuy.pdf".
Noi dung da tom tat tu khoa luan ve he thong gioi thieu ket ban dua tren tinh cach
va so thich, co xu ly on-device va bao ve quyen rieng tu. Vui long chinh sua
phu hop theo mau chinh thuc.

---

## BANG 1: NOI DUNG VA KET QUA NGHIEN CUU

**De tai / Van de**
- Xay dung he thong gioi thieu ket ban dua tren tinh cach va so thich.
- Dap ung yeu cau bao mat du lieu nhay cam (Big Five, hobbies) va hien thuc tren di dong.

**Du lieu dau vao**
- Diem Big Five (IPIP-50).
- So thich nguoi dung (hobbies).
- Thong tin ho so co ban (profile, gioi thieu, avatar).

**Du lieu dau ra**
- Danh sach goi y nguoi dung tuong dong.
- Trang thai like/match va thong bao.

**Muc tieu**
- Xu ly diem tinh cach tren thiet bi (PCA 5D -> 4D) de giam phu thuoc server.
- Ma hoa du lieu nhay cam truoc khi luu tru (AES-256-GCM).
- Ket hop PCA similarity + ELO proximity + hobby similarity de xep hang goi y.

**Diem moi**
- On-device PCA voi he so mean/components dong goi trong app.
- Luu tru cipher thay vi plaintext (b5_cipher, hobbies_cipher).
- Ket hop nhieu tin hieu (tinh cach + ELO + hobbies) trong quy trinh goi y.

**Net noi bat**
- He thong privacy-first, khong luu diem tinh cach dang ro.
- Quy trinh goi y hoat dong real-time va tu dong cap nhat.
- Dung Supabase Edge Functions cho ma hoa, embedding va goi y.

**Ket qua dat duoc (tom tat)**
- PCA 4D giu ~90.55% phuong sai, van bao toan tuong dong tinh cach.
- Pipeline tu Big Five -> PCA -> ma hoa -> luu DB -> goi y hoat dong on dinh.
- Du lieu nhay cam duoc bao ve, khong xuat hien plaintext trong DB.

**Ket luan va huong phat trien**
- Ket luan: He thong dat yeu cau ve hieu nang va bao mat trong bai toan goi y ket ban.
- Huong phat trien: mo rong tap so thich, cai thien mo hinh embedding,
  toi uu ELO, bo sung kiem thu A/B va danh gia nguoi dung thuc.

---

## BANG 2: KET QUA THI NGHIEM TREN DU LIEU HUAN LUYEN / THU NGHIEM

**Module: PCA tinh cach (on-device)**
- Du lieu huan luyen: Big Five Personality Test dataset (Kaggle),
  big_five_scores.csv (scaled 0-1).
- Du lieu thu nghiem: mau ngau nhien tu dataset + bo diem gia lap.
- Ket qua tren tap huan luyen:
  - PCA 2D: ~63.71% phuong sai
  - PCA 3D: ~80.22% phuong sai
  - PCA 4D: ~90.55% phuong sai
- Ket qua tren tap thu nghiem:
  - Cosine similarity tren PCA 4D gan voi similarity tren 5D goc.
- Ket luan:
  - Giam chieu van giu du thong tin phuc vu goi y va tang toc xu ly.

**Module: Embedding so thich**
- Mo hinh: Jina embeddings (mac dinh `jina-embeddings-v3`), co the tuy chinh qua bien moi truong.
- Duong lui: Supabase AI embeddings, model `gte-small`.
- Huong dan: chi su dung de sinh vector so thich, khong huan luyen lai.
- Ket qua:
  - Cosine similarity giup so sanh so thich nguoi dung hop ly.
- Ket luan:
  - Phu hop de ghep cap khi ket hop voi PCA va ELO.

---

## BANG 3: KET QUA THI NGHIEM HE THONG

**Module xac thuc va phan quyen**
- Dau vao: tai khoan nguoi dung (email/password).
- Moi truong thu nghiem: thiet bi di dong + Supabase Auth.
- Ket qua: dang ky/dang nhap on dinh; phan quyen RLS dung theo tai khoan.
- Ket luan: dam bao an toan truy cap.

**Module quan ly du lieu**
- Du lieu nghiep vu: profile, hobbies_cipher, b5_cipher, PCA dims.
- Kiem thu: them/sua/xoa/thong nhat du lieu, kiem tra khong luu plaintext.
- Ket qua: CRUD chinh xac; du lieu ma hoa duoc luu va truy xuat dung.

**Module giao dien nguoi dung**
- Thu nghiem tren nhieu thiet bi (Android/iOS).
- Ket qua: UI on dinh, hien thi du lieu dung, thao tac mượt.

**Module xu ly nghiep vu chinh**
- Luong: Big Five -> PCA on-device -> ma hoa -> luu DB -> goi y.
- Ket qua: thoi gian phan hoi nhanh, khong can ML server.

**Module bao mat**
- Kiem thu truy cap trai phep, nhap lieu sai.
- Ket qua: du lieu nhay cam chi luu dang ma hoa; RLS hoat dong dung.

**Module luu tru va CSDL**
- He thong: Supabase Postgres + Edge Functions.
- Ket qua: truy van on dinh, thong bao realtime hoat dong dung.

**Module trien khai va van hanh**
- Moi truong: Expo (mobile), Supabase (backend).
- Ket qua: trien khai thanh cong, de mo rong cho demo va thu nghiem.
