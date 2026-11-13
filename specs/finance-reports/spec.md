# SPEC — Thu chi và báo cáo

- **Module:** `finance-reports`  •  **Use Case:** UC-83 – UC-90
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Manager ghi phiếu thu (khách trả tiền) và phiếu chi (trả nhà cung cấp hoặc hoàn tiền khách), xem dashboard và các báo cáo quản trị. Mọi số tiền chưa gồm VAT.

## 2. Scope

**Trong phạm vi**
- Phiếu thu (UC-84), phiếu chi (UC-85)
- Báo cáo công nợ (UC-86), tồn kho (UC-87), doanh thu – lợi nhuận (UC-88), chi phí (UC-89)
- Dashboard và xuất file (UC-90)

**Ngoài phạm vi**
- Tính VAT, hóa đơn điện tử, tích hợp MISA (SRS 5.3)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Manager | Quyền tài chính và báo cáo | Code: FIN_CREATE, FIN_UPDATE cho phiếu thu / chi |

## 4. Preconditions and Postconditions

**Preconditions**
- Manager đã đăng nhập và có quyền

**Postconditions**
- Phiếu được ghi và công nợ liên quan được cập nhật, hoặc báo cáo được hiển thị / xuất
- Thất bại: không ghi gì

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-15 | Phải thu giảm theo phiếu thu. |
| BR-21 | Refund Due được chi bằng phiếu chi. |
| BR-25 | Phải trả giảm theo phiếu chi. |
| BR-45 | Số tiền chưa gồm VAT. |
| BR-46 | Số tiền phiếu > 0 và ≤ số dư; phiếu đã xác nhận không sửa, sai thì ghi phiếu đảo. |
| BR-47 | Báo cáo chỉ lấy giao dịch đã xác nhận. |
| BR-49 | Phiếu thu / chi được ghi audit. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-FIN-01 | Phiếu thu: chọn khách, hiện dư nợ, nhập số tiền, phương thức, tham chiếu, diễn giải; giảm nợ | Có | CreateCustomerPaymentCommand: có phân bổ vào hóa đơn, phần dư tự trừ hóa đơn cũ nhất |
| FR-FIN-02 | Phiếu chi cho nhà cung cấp: hiện công nợ, giảm công nợ | Có | CreateSupplierPaymentCommand: phân bổ vào phiếu nhập |
| FR-FIN-03 | Phiếu chi hoàn tiền cho khách có Refund Due | Khác tài liệu | Tiền trả khách được chi ngay ở phiếu trả hàng |
| FR-FIN-04 | Phiếu đã xác nhận không sửa, chỉ ghi đảo | Khác tài liệu | Có API sửa (ngày, phương thức, ghi chú) và hủy phiếu thu |
| FR-FIN-05 | Báo cáo công nợ có tuổi nợ | Chưa có | — |
| FR-FIN-06 | Báo cáo tồn kho: đầu kỳ, nhập, xuất, cuối kỳ theo số lượng và giá trị | Chưa có | — |
| FR-FIN-07 | Báo cáo doanh thu, giá vốn theo MAC, lợi nhuận gộp | Chưa có | — |
| FR-FIN-08 | Báo cáo chi phí mua, chi phí nhập, vật tư sản xuất | Chưa có | — |
| FR-FIN-09 | Dashboard KPI, việc chờ duyệt; xuất .xlsx / .pdf | Chưa có | Route /dashboard và /reports chưa có dữ liệu thật; một số màn danh sách có xuất Excel ở trình duyệt |

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
| Số tiền phiếu | > 0 và ≤ số dư | BE: có ở cả phiếu thu và phiếu chi |
| Đối tác | Bắt buộc, đúng loại | BE: có |
| Phân bổ | SRS không mô tả | BE: không vượt số còn nợ của từng chứng từ |
| Thời gian phiếu | SRS không mô tả | BE: không ở tương lai (khi sửa) |

## 9. Main Flow

1. Manager mở Tài chính & Báo cáo
2. Hệ thống hiển thị các chức năng
3. Chọn thao tác
4. Hệ thống xử lý và hiển thị kết quả

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A83.1 Phiếu thu | Chọn khách, nhập số tiền, phương thức, tham chiếu; lưu; giảm nợ |
| A83.2 Phiếu chi | Chọn nhà cung cấp hoặc khách có Refund Due; lưu; giảm công nợ |
| A83.3 – A83.6 | Chọn kỳ và tham số; hiển thị báo cáo |
| A83.7 | Dashboard; xuất .xlsx hoặc .pdf |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E83.1 | Số tiền ≤ 0, thiếu đối tác, vượt số dư | MSG59; không lưu |
| E83.2 | Không lấy được dữ liệu báo cáo | MSG61 |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| POST | /api/customers/{id}/payments | FIN_CREATE | Phiếu thu | Có |
| GET | /api/customers/{id}/receipts/{code} | PARTNER_READ | Xem phiếu thu | Có |
| PUT | /api/customers/{id}/receipts/{code} | FIN_UPDATE | Sửa phiếu thu | Khác tài liệu |
| POST | /api/customers/{id}/receipts/{code}/cancel | FIN_UPDATE | Hủy phiếu thu | Khác tài liệu |
| POST | /api/suppliers/{id}/payments | FIN_CREATE | Phiếu chi nhà cung cấp | Có |
| — | Báo cáo, dashboard, xuất file | — | UC-86 – UC-90 | Chưa có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| trx_financial_transactions | Phiếu thu / chi | Có; tx_code không unique; tham chiếu chứng từ dạng (reference_type, reference_id) không có khóa ngoại |
| mst_business_partners | Dư nợ, công nợ | Có |
| trx_orders, trx_goods_receipts | Chứng từ được phân bổ | Có |

## 14. Acceptance Criteria

- **AC-FIN-01.** Phiếu thu làm nợ khách giảm đúng số tiền.
- **AC-FIN-02.** Phiếu chi làm công nợ nhà cung cấp giảm đúng số tiền.
- **AC-FIN-03.** Số tiền vượt số dư bị từ chối.
- **AC-FIN-04.** Báo cáo chỉ gồm giao dịch đã xác nhận, không gồm nháp và đã hủy.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-FIN-01 | Thu nợ phân bổ vào hóa đơn | Nợ khách và còn nợ hóa đơn giảm | Integration |
| TS-FIN-02 | Thu vượt nợ, số tiền 0 | Bị từ chối | Unit |
| TS-FIN-03 | Hủy phiếu thu | Nợ và còn nợ hóa đơn trở lại đúng một lần (SRS: phải ghi phiếu đảo) | Integration |
| TS-FIN-04 | Chi trả nhà cung cấp vượt công nợ | Bị từ chối | Unit |
| TS-FIN-05 | Báo cáo và xuất file | Chưa kiểm thử được | System |

## 16. Dependencies and Constraints

- specs/sales-credit
- specs/goods-receipt
- specs/sales-returns (Refund Due)
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. Toàn bộ báo cáo và dashboard (UC-86 – UC-90) chưa triển khai.
2. Phiếu thu sửa và hủy được, trái BR-46.
3. Không có luồng Refund Due.
4. Không có audit cho phiếu thu / chi.
5. Mã phiếu thu không có ràng buộc duy nhất ở database.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/Customers/Commands/CreateCustomerPaymentCommand.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Customers/Commands/CancelCustomerReceiptCommand.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Customers/Commands/UpdateCustomerReceiptCommand.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Suppliers/Commands/CreateSupplierPaymentCommand.cs`

**Frontend**
- `StockFlow_Frontend/src/features/customers/components (phiếu thu)`
- `StockFlow_Frontend/src/features/suppliers`
- `StockFlow_Frontend/src/app/(dashboard)/reports`
- `StockFlow_Frontend/src/app/(dashboard)/dashboard`
