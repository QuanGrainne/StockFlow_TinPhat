# SPEC — Hủy hàng tồn kho

- **Module:** `inventory-disposal`  •  **Use Case:** UC-43, UC-76
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Warehouse Accountant lập phiếu hủy cho hàng hỏng, hết hạn hoặc phế phẩm và gửi Manager. Tồn kho chỉ giảm sau khi Manager duyệt.

## 2. Scope

**Trong phạm vi**
- Lập, sửa, hủy phiếu hủy hàng (UC-43)
- Manager duyệt / từ chối (UC-76)

**Ngoài phạm vi**
- Phân loại hàng trả thành Scrap (specs/sales-returns)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Warehouse Accountant | Quyền hủy hàng + quyền kho | Code: chưa có |
| Manager | Quyền duyệt tồn kho | Code: chưa có |

## 4. Preconditions and Postconditions

**Preconditions**
- Có quyền hủy hàng và quyền kho

**Postconditions**
- Phiếu Waiting for Approval; duyệt thì tồn giảm và phiếu Completed; từ chối thì tồn giữ nguyên

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-04 | Chỉ thao tác kho được gán. |
| BR-44 | Số lượng hủy không vượt số khả dụng và phải có lý do; tồn chỉ giảm sau khi Manager duyệt. |
| BR-42 | Đang kiểm kê thì không xác nhận hủy. |
| BR-49 | Ghi audit. |
| BR-50 | Quyết định ghi người duyệt, thời gian, ghi chú. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-DSP-01 | Hiển thị hàng Waiting for Disposal và cho chọn hàng khác của kho | Chưa có | — |
| FR-DSP-02 | Chọn hàng, lô, số lượng, nhập lý do, gửi duyệt | Chưa có | — |
| FR-DSP-03 | Sửa hoặc hủy phiếu trước khi duyệt | Chưa có | — |
| FR-DSP-04 | Manager duyệt: giảm tồn, phiếu Completed; từ chối: Rejected | Chưa có | — |

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
| Số lượng | > 0 và ≤ số khả dụng | Chưa có |
| Lý do | Bắt buộc | Chưa có |
| Ghi chú từ chối | Bắt buộc | Chưa có |

## 9. Main Flow

1. Mở Hủy hàng, bấm Tạo
2. Hệ thống hiển thị hàng Waiting for Disposal
3. Chọn hàng, lô, số lượng, nhập lý do
4. Bấm Gửi
5. Hệ thống kiểm tra
6. Lưu Waiting for Approval, thông báo Manager
7. Manager duyệt: giảm tồn, Completed; từ chối: Rejected

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A43.1 Sửa / hủy nháp | Trước khi duyệt |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E43.1 | Số lượng ≤ 0 hoặc vượt khả dụng | MSG54 |
| E43.2 | Thiếu lý do | MSG40 |
| E72.1 | Từ chối thiếu ghi chú | Không lưu |
| E72.2 | Phiếu đã được quyết định | MSG57 |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| — | Toàn bộ API hủy hàng | — | UC-43, UC-76 | Chưa có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| trx_inventory_disposals | Đầu phiếu hủy | Có bảng, không có code |
| dtl_inventory_disposal_items | Dòng hủy | Có bảng, không có code |

## 14. Acceptance Criteria

- **AC-DSP-01.** Gửi phiếu thì tồn chưa đổi.
- **AC-DSP-02.** Duyệt thì tồn giảm đúng số hủy và có thẻ kho.
- **AC-DSP-03.** Từ chối thì tồn giữ nguyên.
- **AC-DSP-04.** Không hủy quá số khả dụng.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-DSP-01 | Lập phiếu, duyệt | Tồn giảm sau duyệt | System |
| TS-DSP-02 | Số lượng vượt khả dụng, thiếu lý do | Bị từ chối | Unit |
| TS-DSP-03 | Từ chối không ghi chú | Bị từ chối | System |
| TS-DSP-04 | Duyệt phiếu đã duyệt | MSG57 | Integration |

## 16. Dependencies and Constraints

- specs/sales-returns (hàng Scrap)
- IInventoryLedger
- Luồng duyệt của Manager
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. Toàn bộ chức năng chưa được triển khai (chỉ có bảng). Mọi test scenario ở trạng thái chưa kiểm thử được.
2. Cần nhóm chốt có giữ trong phạm vi nghiệm thu không.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Domain/Entities/TrxInventoryDisposal.cs`
- `StockFlow_Backend/StockFlow.Domain/Entities/DtlInventoryDisposalItem.cs`

**Frontend**
- `Không có`
