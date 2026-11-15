# SPEC — Công nợ khách hàng, theo dõi bán hàng và duyệt tín dụng

- **Module:** `sales-credit`  •  **Use Case:** UC-29, UC-62 – UC-66
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`), đã điều chỉnh theo mô hình thực tế của nhóm (chốt Trường hợp A & gắn duyệt tín dụng vào thanh toán POS ngày 12/11/2026).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Sales Accountant xem công nợ, hạn mức, nợ quá hạn của khách và ghi nhận kết quả nhắc nợ. Manager theo dõi đơn hàng, tình trạng xuất hàng, công nợ và quyết định các yêu cầu tín dụng.

## 2. Scope

**Trong phạm vi**
- Xem công nợ khách, ghi chú nhắc nợ (UC-29)
- Theo dõi đơn bán (UC-63), xuất hàng (UC-65), công nợ và quá hạn (UC-66)
- Duyệt yêu cầu tín dụng (UC-64)

**Ngoài phạm vi**
- Tạo phiếu thu (specs/finance-reports)
- Đặt hạn mức (specs/master-data)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Sales Accountant | Quyền xem công nợ khách | Code: PARTNER_READ |
| Manager | Quyền theo dõi bán hàng và duyệt tín dụng | Code: chưa có chức năng duyệt |

## 4. Preconditions and Postconditions

**Preconditions**
- Đã đăng nhập và có quyền tương ứng

**Postconditions**
- Thông tin được hiển thị; ghi chú nhắc nợ được lưu
- Quyết định tín dụng được ghi và gửi cho Sales Accountant

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-12 | Điều kiện hạn mức khi xuất hóa đơn ghi nợ tại POS (bán nhanh hoặc xử lý từ đơn đặt). |
| BR-13 | Manager duyệt một lần, duyệt hạn mức mới, hoặc từ chối; không tính lãi. |
| BR-15 | Quy tắc tăng giảm phải thu. |
| BR-17 | *(Điều chỉnh theo Trường hợp A)* Giao thiếu từ đơn đặt giữ nguyên đơn đặt ở trạng thái `DELIVERING` theo dõi phần còn lại. |
| BR-18 | Hạn nợ = ngày xuất + kỳ hạn thanh toán; quá hạn nếu chưa trả sau hạn. |
| BR-49 | Ghi audit quyết định tín dụng. |
| BR-50 | Quyết định ghi người duyệt, thời gian, ghi chú; từ chối phải có lý do. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-CRD-01 | Hiển thị dư nợ, hạn mức, tín dụng còn lại, nợ quá hạn, số ngày quá hạn | Một phần | Có dư nợ và hạn mức ở màn Khách hàng; không có quá hạn |
| FR-CRD-02 | Lọc theo khách hoặc chỉ quá hạn; xem phiếu xuất chưa trả, hạn trả, thanh toán đã nhận | Một phần | Xem được hóa đơn và phiếu thu của khách; không có hạn trả |
| FR-CRD-03 | Ghi chú nhắc nợ: ngày liên hệ, kết quả, ngày hẹn trả | Chưa có | — |
| FR-CRD-04 | Manager xem KPI bán hàng, yêu cầu tín dụng chờ duyệt, tình trạng xuất hàng | Chưa có | Route /dashboard chưa có dữ liệu thật |
| FR-CRD-05 | Theo dõi đơn đặt hàng (`BOOKING`) và hóa đơn (`INVOICE`) theo khách, giá trị, trạng thái | Một phần | Xem qua màn Đặt hàng và Hóa đơn |
| FR-CRD-06 | Duyệt yêu cầu tín dụng khi công nợ vượt hạn mức: duyệt giao dịch một lần, duyệt hạn mức mới, từ chối kèm lý do | Chưa có | Đang triển khai (bảng `trx_credit_limit_requests` đã có) |
| FR-CRD-07 | Theo dõi tiến độ giao hàng của đơn đặt (SL đặt, đã giao, còn lại) trên màn Manager | Chưa có | — |
| FR-CRD-08 | Manager (Kế toán trưởng) cài hạn mức mặc định cho khách mới; điều chỉnh hạn mức từng khách hoặc hàng loạt (đặt cố định, tăng/giảm %, về mặc định), bắt buộc lý do; xem lịch sử thay đổi hạn mức | Có (15/11/2026) | Thiết lập công nợ có ô "Hạn mức mặc định cho khách mới"; màn Khách hàng có nút "Điều chỉnh hạn mức" (chi tiết khách và thanh chọn nhiều) và tab "Lịch sử hạn mức". Quyền `SALES_APPROVE` + chức năng `feat-credit-approvals` |

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
| Từ chối | Phải có lý do | Chưa có |
| Hạn mức mới | Không thấp hơn hạn mức hiện tại | Chưa có |
| Điều chỉnh hạn mức (FR-CRD-08) | 0 – 999.999.999.999 đ; không thấp hơn dư nợ hiện tại (kiểm trong câu UPDATE); không áp cho khách lẻ KH00000; bắt buộc lý do ≤ 500 ký tự; % khác 0, trong (-100, 1000], làm tròn 1.000 đ; hàng loạt tối đa 500 khách, khách không đổi được thì bỏ qua và báo lý do | FE + BE |
| Hạn mức mặc định | 0 – 999.999.999.999 đ; chỉ áp cho khách tạo sau khi lưu | FE + BE |
| Yêu cầu | Phải còn ở trạng thái chờ | Chưa có |

## 9. Main Flow

1. Mở Công nợ khách hàng (hoặc màn Duyệt tín dụng / Báo cáo với Manager)
2. Hệ thống hiển thị dữ liệu tổng hợp công nợ & các yêu cầu vượt hạn mức chờ duyệt (từ màn Bán hàng / Hóa đơn POS)
3. Chọn khách hoặc yêu cầu cần xem
4. Hệ thống hiển thị chi tiết / xử lý quyết định (duyệt xong mới cho hoàn tất xuất hóa đơn ghi nợ)

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A29.1 Ghi chú nhắc nợ | Nhập ngày liên hệ, kết quả, ngày hẹn; lưu |
| A62.2 Duyệt tín dụng | Mở yêu cầu; xem hạn mức, dư nợ, giá trị, tiền trả, số vượt, nợ quá hạn, lý do; chọn quyết định; hệ thống ghi người duyệt, thời gian, cập nhật hạn mức nếu có, thông báo Sales |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E29.1 | Không có khách khớp bộ lọc | MSG62 |
| E62.1 | Từ chối thiếu lý do hoặc hạn mức mới thấp hơn hiện tại | Không lưu quyết định |
| E62.2 | Yêu cầu đã được xử lý hoặc đã hủy | MSG57; làm mới danh sách |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| GET | /api/customers | PARTNER_READ | Danh sách khách kèm dư nợ, hạn mức, lọc theo tình trạng nợ | Một phần |
| GET | /api/customers/{id} | PARTNER_READ | Hồ sơ khách, lịch sử | Một phần |
| GET | /api/customers/stats | PARTNER_READ | Số liệu tổng hợp | Ngoài tài liệu |
| PATCH | /api/customers/{id}/credit-limit | SALES_APPROVE | Điều chỉnh hạn mức một khách (FR-CRD-08) | Có |
| PATCH | /api/customers/credit-limit/batch | SALES_APPROVE | Điều chỉnh hạn mức hàng loạt: `SET`, `PERCENT`, `RESET_DEFAULT` | Có |
| GET | /api/customers/{id}/credit-limit-history | PARTNER_READ | Lịch sử thay đổi hạn mức | Có |
| GET / PUT | /api/settings/debt-warning | PARTNER_READ / SALES_APPROVE | Thiết lập công nợ, gồm `defaultCreditLimit` | Có |
| — | Ghi chú nhắc nợ | — | A29.1 | Chưa có |
| — | Danh sách và quyết định yêu cầu tín dụng | — | UC-64 | Chưa có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| mst_business_partners | Hạn mức, dư nợ | Thiếu kỳ hạn thanh toán (BR-18) |
| trx_credit_limit_requests | Yêu cầu tín dụng và quyết định | Có bảng, không có code |
| trx_orders, trx_financial_transactions | Hóa đơn còn nợ, phiếu thu | Có |
| trx_credit_limit_histories | Lịch sử đổi hạn mức: cũ, mới, nguồn (`INITIAL`, `MANUAL`, `BULK`, `REQUEST_APPROVED`), lý do, người đổi, thời gian (BR-49 cho hạn mức) | Có (migration AddCreditLimitHistoryAndDefaultLimitSetting) |
| mst_debt_warning_settings.default_credit_limit | Hạn mức mặc định cho khách mới, mặc định 200.000.000 đ | Có |

## 14. Acceptance Criteria

- **AC-CRD-01.** Dư nợ hiển thị bằng tổng hóa đơn còn nợ trừ thanh toán và trả hàng.
- **AC-CRD-02.** Khách quá hạn được đánh dấu và lọc được.
- **AC-CRD-03.** Quyết định tín dụng ghi đủ người duyệt, thời gian, ghi chú.
- **AC-CRD-04.** Yêu cầu đã xử lý không quyết định lại được.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-CRD-01 | Xem công nợ sau bán nợ, thu tiền, trả hàng | Dư nợ khớp | Integration |
| TS-CRD-02 | Lọc khách quá hạn | Đúng danh sách (chưa kiểm thử được: thiếu kỳ hạn) | System |
| TS-CRD-03 | Duyệt, duyệt hạn mức mới, từ chối | Chưa kiểm thử được | System |
| TS-CRD-04 | Từ chối không nhập lý do | Bị từ chối (chưa kiểm thử được) | System |

## 16. Dependencies and Constraints

- specs/order-consolidation (nguồn phát sinh yêu cầu duyệt tín dụng khi thanh toán hóa đơn vượt hạn mức)
- specs/master-data (hạn mức, kỳ hạn)
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. UC-64 (duyệt yêu cầu tín dụng vượt hạn mức) và phần ghi chú nhắc nợ đang trong quá trình triển khai; cần gắn điểm kích hoạt vào `CreatePosOrderCommand` (`POST /api/orders/pos`).
2. Không có kỳ hạn thanh toán nên chưa tính được nợ quá hạn (BR-18).
3. Dư nợ khách có thể bị ghi đè trực tiếp qua API sửa khách hàng (xem specs/master-data).
4. Không có màn tổng hợp cho Manager (UC-62).

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/Customers/Queries/*.cs`
- `StockFlow_Backend/StockFlow.API/Controllers/CustomersController.cs`

**Frontend**
- `StockFlow_Frontend/src/features/customers/screens/CustomersScreen.tsx`
