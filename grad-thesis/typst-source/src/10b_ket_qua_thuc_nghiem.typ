#import "/template.typ" : *

== Kết quả thực nghiệm chi tiết

Phần này trình bày các số liệu định lượng thu được từ các kịch bản kiểm thử tự động trên hệ thống thật. Các phép đo được thực hiện ở hai trạng thái: trước và sau khi áp dụng các kỹ thuật tối ưu hoá cơ sở dữ liệu.

=== 1. Hiệu năng quy trình tạo tài khoản (Upsert Pipeline)

Kịch bản kiểm thử đo độ trễ toàn trình cho việc tạo hồ sơ người dùng mới (bao gồm xác thực, mã hoá 2 lớp và lưu trữ), kết quả được ghi nhận tại #ref(<tab_upsert_latency>):

#figure(
  table(
    columns: (1fr, 1fr),
    inset: 10pt,
    align: (left, center),
    table.header([*Chỉ số*], [*Giá trị đo được*]),
    [Thời gian trung bình (Warm)], [~1.80 giây],
    [Thời gian thấp nhất], [1.46 giây],
    [Thời gian cao nhất (Cold)], [3.78 giây],
  ),
  caption: [Hiệu năng quy trình tạo tài khoản],
) <tab_upsert_latency>

=== 2. Phân tích kết quả giới thiệu và Hiệu quả tối ưu hoá

Kịch bản kiểm thử sự thay đổi hiệu năng của hàm `recommend-users` sau khi tối ưu hoá chính sách bảo mật hàng (RLS) và bổ sung chỉ mục (Index) như mô tả tại #ref(<tab_optimize_performance>):

#figure(
  table(
    columns: (1fr, 1fr, 1fr),
    inset: 10pt,
    align: (left, center, center),
    table.header([*Trạng thái*], [*Độ trễ phản hồi (ms)*], [*Độ trễ xử lý tại Server (ms)*]),
    [Trước tối ưu (Warm)], [2640.58], [2451],
    [Sau tối ưu (Warm)], [2343.39], [2175],
    [*Cải thiện*], [*~11.2%*], [*~11.3%*],
  ),
  caption: [So sánh hiệu năng giới thiệu trước và sau tối ưu hoá],
) <tab_optimize_performance>

*Nhận xét*: Việc chuyển đổi các chính sách RLS sang dạng truy vấn con (subquery) để tận dụng bộ nhớ đệm của PostgreSQL đã mang lại sự cải thiện rõ rệt (~300ms). Mặc dù con số tuyệt đối vẫn trên 2 giây do đặc thù của hạ tầng Serverless (Free Tier), xu hướng giảm độ trễ khẳng định tính đúng đắn của phương pháp tối ưu.

Danh sách 5 người dùng được gợi ý hàng đầu sau tối ưu hoá được trình bày tại #ref(<tab_top5_results>):

#figure(
  table(
    columns: (auto, 2fr, 1fr, 1fr, 1fr, 1fr),
    inset: 8pt,
    align: (center, left, center, center, center, center),
    table.header([*Hạng*], [*Username*], [*Tổng điểm*], [*PCA*], [*ELO*], [*Sở thích*]),
    [1], [Match_PCA], [0.771], [0.771], [1220.2], [0.558],
    [2], [MockUser1], [0.758], [0.758], [1489.0], [0.839],
    [3], [MockUser17], [0.555], [0.555], [1384.0], [0.074],
    [4], [MockUser6], [0.476], [0.476], [1438.0], [0.485],
    [5], [MockUser04], [0.408], [0.408], [1474.0], [0.071],
  ),
  caption: [Kết quả xếp hạng thực tế sau khi tối ưu hoá],
) <tab_top5_results>

=== 3. Logic cập nhật ELO thực tế

Dựa trên dữ liệu từ script benchmark, sự thay đổi điểm ELO của Viewer (Actor) và đối tượng tương tác (Target) được ghi nhận như sau. Giả sử $R_A = 1500$ (Viewer) và $R_B = 1230$ (Match_PCA), với hệ số $K = 12$:

*Trường hợp hành động Like (Hợp tác)*:
Kỳ vọng thắng được tính toán:
$ E_A = 1 / (1 + 10^((1230 - 1500) / 400)) approx 0.825 $
$ E_B = 1 - E_A approx 0.175 $

Điểm số mới sau khi tương tác:
$ R_A' = 1500 + 12 dot (1 - 0.825) = 1502.1 $
$ R_B' = 1230 + 12 dot (1 - 0.175) = 1239.9 $

*Nhận xét*: Actor tăng nhẹ (~2.1 điểm), trong khi Target tăng mạnh hơn (~9.9 điểm). Điều này minh chứng cho cơ chế khuyến khích tương tác hai chiều và ưu tiên bảo vệ điểm số cho người được yêu thích.

*Trường hợp hành động Skip*:
$ R_A'' = 1500 + 12 dot (0 - 0.825) = 1490.1 $
$ R_B'' = 1230 $

*Nhận xét*: Actor bị trừ điểm (~9.9 điểm), Target không bị ảnh hưởng. Đây là cơ chế phạt hành vi lựa chọn khắt khe để cân bằng hệ sinh thái.

*Độ trễ hành động (Warm)*: ~1.0 - 1.7 giây.
