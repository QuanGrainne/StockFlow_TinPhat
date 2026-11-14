# SPEC — Nhập hàng, chi phí nhập và theo dõi mua hàng

- **Module:** `goods-receipt`  •  **Use Case:** UC-31 – UC-34, UC-67 – UC-71
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Warehouse Accountant ghi nhận phiếu nhập theo PO dựa trên biên bản kiểm đếm. Chỉ số lượng chấp nhận được cộng vào tồn; hàng lỗi, thiếu, trả lại được ghi riêng. Sau khi nhập có thể phân bổ chi phí nhập vào giá vốn. Manager theo dõi PO, phiếu nhập, hàng lỗi, chi phí và công nợ nhà cung cấp.

## 2. Scope

**Trong phạm vi**
- Nhập hàng theo PO (UC-31)
- Ghi hàng lỗi / thiếu (UC-32)
- Trả hàng nhà cung cấp, từ chối lô (UC-33)
- Phân bổ chi phí nhập (UC-34)
- Manager theo dõi (UC-67 – UC-71)

**Ngoài phạm vi**
- Phiếu chi trả nhà cung cấp (specs/finance-reports)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Warehouse Accountant | PURCHASE_READ / CREATE / UPDATE; trả tiền hoàn: FIN_CREATE | Phải có quyền kho nhận |
| Manager | Quyền theo dõi mua hàng | Code: PURCHASE_READ, PARTNER_READ |

## 4. Preconditions and Postconditions

**Preconditions**
- PO ở trạng thái Sent to Supplier hoặc Partially Received
- Có quyền kho nhận
- UC-34: phiếu nhập đã Completed

**Postconditions**
- Phiếu nhập Completed; tồn tăng theo số chấp nhận; tiến độ PO, MAC, công nợ nhà cung cấp được cập nhật
- Thất bại: tồn không đổi

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-23 | Phiếu nhập phải tham chiếu PO đang chờ nhận; lũy kế chấp nhận không vượt số đặt. |
| BR-24 | Chỉ số chấp nhận vào tồn; lỗi, hỏng, thiếu ghi riêng kèm lý do; có thể trả nhà cung cấp hoặc từ chối cả lô. |
| BR-25 | Phải trả tăng = số chấp nhận × đơn giá PO; giảm theo phiếu chi. |
| BR-26 | Quy đổi đơn vị về đơn vị cơ sở. |
| BR-27 | Hàng theo dõi lô phải có số lô và hạn dùng. |
| BR-28 | Chi phí nhập chỉ phân bổ cho phiếu Completed, theo giá trị hoặc số lượng; tổng phân bổ bằng tổng chi phí. |
| BR-29 | MAC mới = (Tồn × MAC + Chi phí thêm) / (Tồn + SL thêm), tính lại ở mỗi lần nhập và phân bổ. |
| BR-42 | Đang kiểm kê thì không xác nhận nhập. |
| BR-04 | Chỉ thao tác kho được gán. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-GR-01 | Chọn PO theo mã; nạp nhà cung cấp, kho và số còn lại từng dòng | Một phần | PO là tùy chọn; có kiểm tra trạng thái, nhà cung cấp, kho của PO |
| FR-GR-02 | Nhập số chấp nhận, số lô, hạn dùng, vị trí | Một phần | Nhận số lượng và LotId tùy chọn; không bắt buộc lô, không có vị trí |
| FR-GR-03 | Chặn lũy kế chấp nhận vượt số đặt | Chưa có | Không kiểm tra |
| FR-GR-04 | Xác nhận: cộng tồn, tính MAC, tăng công nợ, cập nhật trạng thái PO, phiếu Completed | Có | Create / CompletePurchaseCommand qua IInventoryLedger trong một transaction; hỗ trợ lưu tạm DRAFT và trả tiền lúc nhập |
| FR-GR-05 | Ghi số lỗi / thiếu kèm lý do, loại khỏi số chấp nhận | Chưa có | Cột có sẵn, luôn ghi 0 |
| FR-GR-06 | Đánh dấu trả nhà cung cấp trên phiếu nhập; từ chối cả lô (Rejected) | Khác tài liệu | Làm thành chứng từ riêng "Trả hàng nhập" sau khi nhập; không có Rejected |
| FR-GR-07 | Phân bổ chi phí nhập theo giá trị hoặc số lượng, tính lại MAC | Chưa có | Có bảng, không có code |
| FR-GR-08 | Chặn khi hàng đang kiểm kê | Chưa có | — |
| FR-GR-09 | Manager xem PO và phiếu nhập, hàng lỗi / trả, chi phí và MAC, công nợ nhà cung cấp | Một phần | Xem qua màn Đặt hàng nhập, Nhập hàng, Trả hàng nhập, Nhà cung cấp; không có màn tổng hợp, hàng lỗi, chi phí nhập |
| FR-GR-10 | (Existing) Sửa và hủy phiếu nhập đã hoàn thành | Ngoài tài liệu | Sửa: đảo tồn và giá vốn rồi áp lại. Hủy: đảo tồn, công nợ; chặn khi có phiếu trả hoặc phiếu chi |

## 7. Non-functional Requirements

- **NFR-01.** Giao diện web cho máy tính, độ phân giải tối thiểu 1366×768; hỗ trợ Chrome, Edge, Firefox bản ổn định (SRS 4.1, 4.2.5).
- **NFR-02.** 95% yêu cầu thường hoàn thành trong 2 giây; thao tác giao dịch trả kết quả trong 3 giây (SRS 4.2.2).
- **NFR-03.** Mọi API phải kiểm tra quyền chức năng và quyền kho ở server; ẩn nút trên giao diện không được coi là phân quyền (SRS 4.2.4, BR-02).
- **NFR-04.** Giao dịch lỗi không được cập nhật dở dang; chỉ báo thành công khi transaction đã commit (SRS 4.2.3).
- **NFR-05.** Thay đổi nhạy cảm phải có nhật ký audit gồm người thực hiện, thời gian, thao tác, giá trị trước và sau (BR-49). **Existing:** hệ thống chưa có bảng audit.
- **NFR-06.** Thông báo hệ thống: SRS yêu cầu tiếng Anh theo mã MSG01–MSG65. **Existing:** toàn bộ thông báo bằng tiếng Việt. Cần nhóm chốt (xem Open Questions).

## 8. Validation Rules

| Trường | Quy tắc (Expected) | Hiện trạng FE / BE |
|---|---|---|
| PO | Tồn tại, Sent / Partially Received | BE: ORDERED / PARTIAL khi có gửi PO |
| Số chấp nhận | ≥ 0, lũy kế ≤ số đặt | Không kiểm tra lũy kế |
| Lô, hạn dùng | Bắt buộc với hàng theo dõi lô | Không có cờ theo dõi lô |
| Quyền kho | Bắt buộc | BE: có |
| Chi phí nhập | Số tiền > 0, có loại chi phí, phiếu có số chấp nhận | Chưa có |

## 9. Main Flow

1. Mở Phiếu nhập, bấm Tạo mới
2. Chọn PO theo mã
3. Hệ thống nạp nhà cung cấp, kho, số còn lại
4. Nhập số chấp nhận theo biên bản kiểm đếm
5. Nhập lô, hạn dùng, vị trí
6. Nhập số lỗi / thiếu nếu có
7. Bấm Xác nhận nhập
8. Hệ thống kiểm tra
9. Hệ thống cộng tồn, tính MAC, tăng công nợ, cập nhật PO
10. Phiếu Completed, báo thành công

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A31.1 Hàng lỗi / thiếu | Nhập số và lý do; ghi riêng |
| A31.2 Trả nhà cung cấp | Đánh dấu số lỗi trả lại; không vào tồn, không vào công nợ. Từ chối cả lô: phiếu Rejected |
| A31.3 Hủy nhập liệu | Bỏ qua trước khi xác nhận |
| A34.1 Sửa chi phí | Đổi số tiền hoặc phương pháp trước khi xác nhận; hệ thống tính lại |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E31.1 | PO không tồn tại, Draft, Completed hoặc Canceled | Không tạo phiếu |
| E31.2 | Lũy kế vượt số đặt | MSG33 |
| E31.3 | Số âm, thiếu lô / hạn dùng, không có quyền kho | MSG01, MSG34 |
| E31.4 | Hàng đang kiểm kê | MSG50 |
| E34.1 | Chi phí không hợp lệ | MSG37 |
| E67.1 | Không lấy được dữ liệu | MSG65 |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| GET | /api/purchases | PURCHASE_READ | Danh sách phiếu nhập | Một phần |
| GET | /api/purchases/{id} | PURCHASE_READ | Chi tiết | Có |
| POST | /api/purchases | PURCHASE_CREATE | Tạo (tạm hoặc hoàn thành) | Một phần |
| PUT | /api/purchases/{id} | PURCHASE_UPDATE | Sửa (kể cả phiếu đã hoàn thành) | Ngoài tài liệu |
| PATCH | /api/purchases/{id}/complete | PURCHASE_CREATE | Hoàn thành phiếu tạm | Có |
| PATCH | /api/purchases/{id}/cancel | PURCHASE_UPDATE | Hủy phiếu | Ngoài tài liệu |
| GET/POST/PUT | /api/purchasereturns… | PURCHASE_* | Trả hàng nhập (chứng từ riêng) | Khác tài liệu |
| POST | /api/purchasereturns/{id}/refunds | FIN_CREATE | Nhà cung cấp hoàn tiền | Ngoài tài liệu |
| — | Phân bổ chi phí nhập | — | UC-34 | Chưa có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| trx_goods_receipts, dtl_goods_receipt_items | Phiếu nhập và dòng (đặt / nhận / chấp nhận / lỗi / hỏng) | Có; cột lỗi, hỏng không dùng |
| trx_purchase_returns, dtl_purchase_return_items | Trả hàng nhập | Có, ngoài SRS |
| trx_inbound_costs, dtl_inbound_cost_allocations | Chi phí nhập | Có bảng, không có code |
| trx_inventory_balances, trx_inventory_transactions | Tồn (có giá vốn theo kho), thẻ kho | Có |
| mst_business_partners.current_payable | Công nợ nhà cung cấp | Có |
| mst_inventory_lots | Lô, hạn dùng | Có bảng |

## 14. Acceptance Criteria

- **AC-GR-01.** Nhập đủ theo PO thì tồn, MAC, công nợ, trạng thái PO cùng được cập nhật.
- **AC-GR-02.** Không nhập được vượt số còn lại của PO.
- **AC-GR-03.** Hàng lỗi không cộng vào tồn và công nợ.
- **AC-GR-04.** Lỗi giữa chừng thì không có gì được lưu.
- **AC-GR-05.** Sau phân bổ chi phí, MAC tăng đúng công thức.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-GR-01 | Nhập đủ một PO | Tồn, MAC, công nợ, thẻ kho, trạng thái PO đúng | Integration |
| TS-GR-02 | Nhập nhiều đợt | PO: Partially Received → Completed | Integration |
| TS-GR-03 | Nhập vượt số đặt | Bị từ chối (hiện tại: nhận) | Integration |
| TS-GR-04 | Sai nhà cung cấp hoặc kho so với PO | Bị từ chối | Integration |
| TS-GR-05 | Hoàn thành phiếu hai lần cùng lúc | Chỉ cộng tồn một lần (hiện tại: không có khóa) | Integration |
| TS-GR-06 | Tính MAC | Đúng công thức BR-29 | Unit |
| TS-GR-07 | Ghi hàng lỗi, phân bổ chi phí | Chưa kiểm thử được | System |
| TS-GR-08 | Nhập khi đang kiểm kê | Bị chặn (hiện tại: không chặn) | Integration |

## 16. Dependencies and Constraints

- specs/purchase-orders
- specs/master-data
- IInventoryLedger (sổ tồn kho dùng chung)
- specs/stocktake
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. PO không bắt buộc và không kiểm tra lũy kế (trái BR-23).
2. UC-32, UC-34 chưa triển khai; BR-27, BR-26 chưa áp dụng.
3. Trả hàng nhà cung cấp là chứng từ riêng (SRS: ghi trong phiếu nhập). Cần sửa SRS hoặc code.
4. Phiếu đã hoàn thành vẫn sửa được nội dung, làm đổi giá vốn hồi tố.
5. Công nợ tính theo giá trên phiếu nhập, không phải giá PO (BR-25).
6. Giá vốn cấp sản phẩm bị ghi đè bằng giá vốn của kho vừa nhập.
7. Danh sách phiếu nhập hiện tất cả khi người dùng chưa có kho.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/Purchases/Commands/*.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Purchases/Helpers/*.cs`
- `StockFlow_Backend/StockFlow.Application/Features/PurchaseReturns/**`
- `StockFlow_Backend/StockFlow.Application/Common/Inventory/InventoryLedger.cs`
- `StockFlow_Backend/StockFlow.API/Controllers/PurchasesController.cs`
- `StockFlow_Backend/StockFlow.API/Controllers/PurchaseReturnsController.cs`

**Frontend**
- `StockFlow_Frontend/src/features/purchases/screens/*.tsx`
- `StockFlow_Frontend/src/features/purchase-returns/screens/*.tsx`
