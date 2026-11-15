# 06 — Trạng thái và quy tắc nghiệp vụ đề xuất

Mọi nội dung ở đây là **đề xuất**. Code hiện chưa có hằng trạng thái hay quy tắc nào cho kế hoạch sản xuất. Cột "Nguồn" cho biết quy tắc dựa trên gì:

- **ERD**: database đã ràng buộc sẵn.
- **Code**: đã có quy tắc tương đương cho lệnh sản xuất, tái sử dụng được.
- **Đề xuất**: suy ra từ phân tích, chưa ai xác nhận.
- **Cần xác nhận**: có hơn một cách hiểu hợp lý; đề xuất mặc định được nêu kèm. **Đã chốt theo mặc định ngày 14/11/2026 (xem mục 3).**

## 1. Vòng đời trạng thái đề xuất

```
DRAFT ──gửi duyệt──► PENDING_APPROVAL ──duyệt──► APPROVED ──đóng──► CLOSED
  ▲                        │                        │
  │                        └──từ chối──► REJECTED   └──hủy (chưa có lệnh còn hiệu lực)──► CANCELLED
  └──────(rút lại, nếu chọn Q6)                │
                                               └──sửa rồi gửi duyệt lại──► PENDING_APPROVAL
DRAFT / REJECTED / PENDING_APPROVAL ──hủy──► CANCELLED
```

| Trạng thái | Ý nghĩa | Sửa | Lập lệnh |
|---|---|---|---|
| DRAFT | Đang soạn | Toàn bộ | Không |
| PENDING_APPROVAL | Chờ Manager duyệt | Không | Không |
| APPROVED | Đã duyệt, đang thực hiện | Hạn chế (BR-PP-13) | Có |
| REJECTED | Bị từ chối, chờ sửa | Toàn bộ | Không |
| CLOSED | Kết thúc; phần chưa lập lệnh bị bỏ | Không | Không |
| CANCELLED | Hủy, không thực hiện | Không | Không |

Mọi giá trị đều vừa cột `status varchar(20)`. Tiến độ ("chưa lập lệnh", "đã lập một phần", "đã lập đủ") là số liệu **tính ra để hiển thị**, không phải trạng thái lưu.

### Bảng chuyển trạng thái

| Từ | Hành động | Đến | Ai | Điều kiện |
|---|---|---|---|---|
| — | Lưu mới | DRAFT | Người lập | Dữ liệu hợp lệ |
| DRAFT, REJECTED | Gửi duyệt | PENDING_APPROVAL | Người lập | Có ≥ 1 dòng; mọi thành phẩm có BOM đang áp dụng |
| PENDING_APPROVAL | Duyệt | APPROVED | Manager | — |
| PENDING_APPROVAL | Từ chối | REJECTED | Manager | Có lý do |
| PENDING_APPROVAL | Rút lại | DRAFT | Người lập | Chỉ khi nhóm chọn có chức năng này (Q6) |
| DRAFT, REJECTED, PENDING_APPROVAL | Hủy | CANCELLED | Người lập hoặc Manager | Có lý do |
| APPROVED | Hủy | CANCELLED | Manager | Không có lệnh nào khác `CANCELLED` |
| APPROVED | Đóng | CLOSED | Manager | — |

## 2. Quy tắc nghiệp vụ

### Lập và sửa kế hoạch

| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-PP-01 | Mã kế hoạch do hệ thống sinh, duy nhất | ERD (chỉ mục duy nhất `uq_trx_production_plans_code`); cách sinh: Đề xuất, theo sequence như các chứng từ khác |
| BR-PP-02 | Kế hoạch phải có tên, kỳ (từ ngày ≤ đến ngày) và ít nhất một dòng | ERD (cột bắt buộc) + Đề xuất |
| BR-PP-03 | Mỗi dòng: số lượng > 0; ngày bắt đầu ≤ ngày kết thúc | Đề xuất (ERD không có CHECK) |
| BR-PP-04 | Thời gian của dòng nằm trong kỳ kế hoạch | Cần xác nhận. Mặc định: bắt buộc nằm trong kỳ |
| BR-PP-05 | Chỉ chọn sản phẩm là thành phẩm đang hoạt động | Code (lập lệnh và BOM đang áp dụng quy tắc này) |
| BR-PP-06 | Mỗi thành phẩm chỉ xuất hiện một dòng trong một kế hoạch | Cần xác nhận (Q3). Mặc định: có. ERD không ràng buộc |
| BR-PP-07 | Kho nhận thành phẩm là tùy chọn; nếu chọn thì phải là kho đang hoạt động và người dùng có quyền | ERD (cột cho phép rỗng) + Code (cô lập dữ liệu theo kho) |
| BR-PP-08 | Lập kế hoạch không làm thay đổi tồn kho và không giữ chỗ vật tư | Đề xuất |
| BR-PP-12 | Chỉ sửa toàn bộ khi kế hoạch ở DRAFT hoặc REJECTED | Đề xuất |
| BR-PP-13 | Kế hoạch APPROVED chỉ sửa được: số lượng (không thấp hơn số đã lập lệnh), ngày của dòng, kho nhận, ghi chú. Không xóa dòng đã có lệnh | Đề xuất. Có phải duyệt lại khi tăng số hoặc thêm dòng: Cần xác nhận (Q5) |

### Định mức và nhu cầu vật tư

| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-PP-09 | Thành phẩm chưa có BOM đang áp dụng: được lưu nháp kèm cảnh báo, không được gửi duyệt | Đề xuất; dựa trên Code (lập lệnh bắt buộc có BOM đang áp dụng) |
| BR-PP-14 | Nhu cầu vật tư dự kiến = Σ theo dòng (số lượng × định mức × (1 + hao hụt)), cộng dồn theo vật tư; tính khi xem, không lưu | Code (`ProductionPolicy.CalculateRequirement`, BR-31) + Đề xuất phần cộng dồn |
| BR-PP-15 | Thiếu vật tư chỉ là cảnh báo; không chặn lưu, gửi duyệt hay duyệt | Cần xác nhận (Q8 liên quan). Mặc định: chỉ cảnh báo |

### Duyệt

| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-PP-16 | Chỉ kế hoạch APPROVED mới được dùng để lập lệnh | Đề xuất |
| BR-PP-17 | Từ chối phải có lý do. Người duyệt và thời điểm duyệt được ghi lại | ERD (`approved_by`, `approval_date`); lý do: Đề xuất, hiện chỉ ghi được vào `notes` |
| BR-PP-18 | Người lập có được tự duyệt kế hoạch của mình không | Cần xác nhận (Q2). Mặc định: Manager duyệt được mọi kế hoạch, kể cả do mình lập |

### Lập lệnh từ kế hoạch

| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-PP-10 | Số đã lập lệnh của một thành phẩm = tổng số lượng trên các dòng lệnh thuộc kế hoạch, không tính lệnh `CANCELLED` | Đề xuất; tính được từ ERD khi BR-PP-06 được chọn |
| BR-PP-11 | Số còn lại = số kế hoạch − số đã lập lệnh; là số tính ra, không lưu | Đề xuất |
| BR-PP-19 | Một kế hoạch lập được nhiều lệnh; một lệnh thuộc tối đa một kế hoạch | ERD (`trx_production_orders.production_plan_id`) |
| BR-PP-20 | Số lập lệnh của một thành phẩm không vượt số còn lại | Cần xác nhận (Q7). Mặc định: chặn |
| BR-PP-21 | Lệnh thuộc kế hoạch bị hủy thì số lượng của nó trở lại số còn lại | Đề xuất (hệ quả của BR-PP-10) |
| — | Lệnh lập trực tiếp, không thuộc kế hoạch nào, vẫn hợp lệ | ERD (cột cho phép rỗng) + Code (đang chạy như vậy). Có giữ không: Cần xác nhận (Q4). Mặc định: giữ |

### Hủy và đóng

| Mã | Quy tắc | Nguồn |
|---|---|---|
| BR-PP-22 | Không hủy kế hoạch đang có lệnh khác `CANCELLED`; dùng "Đóng" thay thế | Đề xuất |
| BR-PP-23 | Hủy hoặc đóng kế hoạch không làm thay đổi các lệnh đã lập | Đề xuất |
| BR-PP-24 | Kế hoạch không bị xóa khỏi database; chỉ chuyển trạng thái | Đề xuất; ERD chặn xóa khi còn dòng hoặc lệnh liên kết |

### Quy tắc đang có, áp dụng nguyên trạng

| Mã | Quy tắc | Nơi có |
|---|---|---|
| BR-31 | Công thức nhu cầu vật tư theo định mức và hao hụt | `Domain/Services/ProductionPolicy.cs` |
| — | Mỗi thành phẩm tối đa một BOM đang áp dụng | Chỉ mục duy nhất trên `mst_boms` |
| — | Một lệnh không có hai dòng cùng thành phẩm | `ProductionOrderRules` |
| — | Lệnh chỉ hủy được khi chưa xuất vật tư | `TrxProductionOrder.Status.cs`, `CancelProductionOrderCommand` |
| — | Cô lập dữ liệu theo kho | `ICurrentUserService.HasWarehouseAccessAsync` |

## 3. Quyết định đã chốt (14/11/2026)

**Ninh đã xác nhận ngày 14/11/2026: chọn phương án mặc định cho toàn bộ Q1–Q12.** Cột "Quyết định đã chốt" dưới đây là nghiệp vụ áp dụng. Các quy tắc ở mục 2 ghi nguồn "Cần xác nhận" nay áp dụng theo giá trị mặc định đã nêu. Nội dung vẫn chưa có trong Report 3; cần đưa vào Report 3 trước khi triển khai.

Còn mở (chưa có đề xuất mặc định, nhóm quyết khi triển khai): tên mã chức năng cho kế hoạch sản xuất; dùng lại `PROD_APPROVE` hay tách quyền duyệt riêng.

| # | Câu hỏi | Quyết định đã chốt | Ảnh hưởng nếu chọn khác |
|---|---|---|---|
| Q1 | Ai lập kế hoạch: Production Accountant, Manager, hay cả hai? | Cả hai lập được; chỉ Manager duyệt | Quyết định mã quyền và có cần bước duyệt hay không |
| Q2 | Manager có được duyệt kế hoạch do chính mình lập không? | Có | Nếu không: cần một người duyệt khác, hiện hệ thống chỉ có Manager và Admin ở vai trò quản lý |
| Q3 | Một thành phẩm có được xuất hiện ở nhiều dòng (nhiều đợt) trong một kế hoạch không? | Không; chia đợt bằng nhiều lệnh | Nếu có: phải đổi ERD (file 07, phương án B) |
| Q4 | Sau khi có kế hoạch, lệnh sản xuất lập trực tiếp không qua kế hoạch còn được phép không? | Có, giữ nguyên | Nếu không: phải sửa quy trình lập lệnh đang chạy và xử lý lệnh cũ không có kế hoạch |
| Q5 | Sửa kế hoạch đã duyệt (tăng số lượng, thêm dòng) có phải duyệt lại không? | Không duyệt lại; chỉ Manager được sửa kế hoạch đã duyệt | Nếu có: thêm chuyển trạng thái APPROVED → PENDING_APPROVAL và phải quyết định lệnh đang mở xử lý thế nào trong lúc chờ |
| Q6 | Có cần chức năng rút lại kế hoạch đang chờ duyệt không? | Không; Manager từ chối để trả về | Thêm một chuyển trạng thái |
| Q7 | Lập lệnh vượt số còn lại của kế hoạch: chặn hay chỉ cảnh báo? | Chặn; muốn làm thêm thì tăng số trên kế hoạch | Nếu cảnh báo: số còn lại có thể âm, cần quy ước hiển thị |
| Q8 | Khi so tồn vật tư, có trừ phần vật tư các lệnh đang mở chưa xuất không? | Không trừ; hiển thị tồn thực tế kèm ghi chú | Nếu trừ: phép tính phức tạp hơn và cần thống nhất với màn lập lệnh đang có |
| Q9 | Kế hoạch có tự đóng khi đã lập đủ lệnh và mọi lệnh kết thúc không? | Không; Manager đóng bằng tay | Nếu có: phải móc vào các lệnh đóng, hủy, nhập thành phẩm của Production Execution |
| Q10 | Kế hoạch có bị giới hạn xem theo kho không? Đầu kế hoạch không có kho, chỉ dòng có kho nhận tùy chọn | Không giới hạn xem; chỉ kiểm quyền kho khi chọn kho nhận và khi xem tồn | Nếu có: cần quy ước cho kế hoạch gồm dòng của nhiều kho hoặc không có kho |
| Q11 | Có cần liên kết kế hoạch với đơn đặt hàng của khách không? | Không (ngoài phạm vi) | Nếu có: phải thêm bảng liên kết |
| Q12 | Mã Use Case và Business Rule chính thức trong Report 3 là gì? | Dùng mã tạm UC-PP, BR-PP cho tới khi nhóm cấp số | — |
