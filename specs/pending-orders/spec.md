# SPEC — Quản lý đơn chờ (đơn đặt hàng của khách)

- **Module:** `pending-orders`  •  **Use Case:** UC-18 – UC-22
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`), đã điều chỉnh theo mô hình thực tế của nhóm (chốt Trường hợp A & phân quyền theo chức năng ngày 12/11/2026).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Nhân viên có chức năng **Đặt hàng (`feat-sales-booking`)** tạo, xem, sửa, xác nhận và hủy đơn đặt hàng (`order_type = BOOKING`) khi khách đặt trước. Đơn đặt hàng chỉ ghi nhận nhu cầu và giữ số "khách đặt", **không trừ tồn kho thực tế**. Việc trừ tồn & xuất kho chỉ xảy ra khi người có chức năng **Bán hàng (`feat-pos`)** bấm **Xử lý đơn hàng** và thanh toán thành hóa đơn; nếu giao một phần (VD: đặt 10, thực xuất 5), chính đơn đặt hàng gốc chuyển sang `DELIVERING` để theo dõi 5 cái còn lại (Trường hợp A, không sinh đơn mới).

## 2. Scope

**Trong phạm vi**
- Tạo đơn chờ (UC-19)
- Xem, tìm, lọc đơn chờ (UC-20)
- Sửa đơn chờ (UC-21)
- Hủy đơn chờ (UC-22)

**Ngoài phạm vi**
- Gộp đơn và tạo yêu cầu xuất kho (specs/order-consolidation)
- Xuất kho (specs/sales-stock-issue)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Nhân viên Đặt hàng | SALES_READ, SALES_CREATE, SALES_UPDATE, SALES_DELETE + chức năng `feat-sales-booking` | Phải có quyền trên kho xử lý của đơn. Người chỉ có `feat-pos` không vào tạo/sửa/gộp đặt hàng được |

## 4. Preconditions and Postconditions

**Preconditions**
- Đã đăng nhập, có quyền đơn chờ
- Khách hàng và hàng hóa có trong danh mục

**Postconditions**
- Thành công: đơn đặt lưu ở `DRAFT` / `CONFIRMED`, được cập nhật, chuyển `FINISHED` (khi bấm Kết thúc hoặc giao đủ), hoặc chuyển `CANCELLED`
- Thất bại: đơn không thay đổi

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-06 | Mã đơn là duy nhất. |
| BR-08 | Tạo, sửa, hủy đơn đặt không thay đổi tồn kho thực tế (chỉ tính số "khách đặt" theo các đơn còn mở). |
| BR-09 | Chỉ đơn `DRAFT` / `CONFIRMED` chưa có hóa đơn giao mới được sửa, hủy, gộp. Đơn đang giao 1 phần (`DELIVERING`) giữ nguyên mã đơn gốc để theo dõi phần còn lại (Trường hợp A) cho đến khi giao đủ hoặc bấm Kết thúc (`FINISHED`). |
| BR-11 | Đơn giá lấy từ bảng giá / giá bán của hàng, người bán được điều chỉnh; giá chưa gồm VAT. |
| BR-45 | Mọi số tiền chưa gồm VAT. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-PO-SALE-01 | Tạo đơn đặt với khách hàng, kho xử lý, hàng hóa, số lượng, đơn giá, giảm giá, ngày giao dự kiến, ghi chú | Có | `SaveSalesBookingCommand` lưu đầy đủ thông tin đơn đặt hàng |
| FR-PO-SALE-02 | Hiển thị hạn mức, dư nợ, tín dụng còn lại của khách để tham khảo | Một phần | Đơn trả về hạn mức và dư nợ; chưa kiểm tra hiển thị trên màn hình |
| FR-PO-SALE-03 | Lưu đơn ở trạng thái `DRAFT` / `CONFIRMED`, không trừ tồn kho thật | Có | Trạng thái `DRAFT` (Phiếu tạm) → `CONFIRMED` (Đã xác nhận); tính số "khách đặt" |
| FR-PO-SALE-04 | Tìm theo mã đơn, khách, điện thoại; lọc trạng thái | Một phần | Có lọc theo kho được phân quyền; chưa đọc hết bộ lọc |
| FR-PO-SALE-05 | Sửa hàng, số lượng, giá của đơn `DRAFT`/`CONFIRMED` chưa có hóa đơn giao | Có | Chỉ sửa được `DRAFT` / `CONFIRMED` chưa có hóa đơn giao |
| FR-PO-SALE-06 | Hủy đơn đặt chưa giao, chọn giữ lại hay hoàn tiền trả trước (nếu có đặt cọc) | Có | Hủy đơn chuyển `CANCELLED`; `keepDeposit=true/false` xử lý tiền cọc và công nợ đúng |
| FR-PO-SALE-07 | Nhận tiền khách trả trước cho đơn đặt và cho phép bấm Kết thúc đơn đang giao 1 phần (`DELIVERING` → `FINISHED`) | Có | Tạo phiếu thu giảm công nợ ngay; nút Kết thúc đóng phần chưa giao |

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
| Khách hàng | Bắt buộc, đang hoạt động, đúng loại khách | BE: có |
| Dòng hàng | Ít nhất 1; số lượng > 0; đơn giá ≥ 0 | BE: validator; số lượng ≤ 100.000 |
| Kho xử lý | Bắt buộc, đang hoạt động, có quyền kho | BE: bắt buộc, đang hoạt động, có quyền kho |
| Tiền trả trước | ≥ 0 và không vượt giá trị đơn | BE: ≥ 0 và không vượt giá trị đơn |
| Hết tồn | Kiểm tra theo thiết lập "cho đặt khi hết hàng" | BE: chặn theo thiết lập "cho đặt khi hết hàng" |

## 9. Main Flow

1. Nhân viên Đặt hàng (`feat-sales-booking`) mở màn Đặt hàng (hoặc tab Đặt hàng ở POS)
2. Hệ thống hiển thị danh sách đơn đặt theo kho được phân quyền
3. Chọn thao tác (tạo, sửa, xác nhận, gộp, hủy, kết thúc)
4. Hệ thống kiểm tra và lưu
5. Hiển thị kết quả

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A18.1 Tạo | Chọn khách và kho xử lý; hệ thống hiện thông tin tín dụng; thêm hàng, giá tự điền; lưu `DRAFT` hoặc `CONFIRMED` |
| A18.2 Xem | Tìm và lọc; hiển thị đơn kèm dòng hàng (đã đặt / đã giao / còn lại) và tổng tiền |
| A18.3 Sửa | Chọn đơn `DRAFT`/`CONFIRMED` chưa có hóa đơn giao, sửa, lưu |
| A18.4 Hủy | Xác nhận hủy (chọn giữ/hoàn cọc nếu có); chuyển `CANCELLED` |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E18.1 | Thiếu khách, không có dòng hàng, số lượng ≤ 0, đơn giá < 0 | Không lưu, báo lỗi chi tiết |
| E18.2 | Đơn đã có hóa đơn giao hoặc đã hủy (`CANCELLED`) | Không cho sửa/gộp/hủy (chỉ được xử lý giao tiếp nếu `DELIVERING`, hoặc Kết thúc) |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| GET | /api/sales-bookings | SALES_READ + feat-sales-booking/feat-pos | Danh sách | Có |
| GET | /api/sales-bookings/{id} | SALES_READ | Chi tiết | Có |
| GET | /api/sales-bookings/reserved | SALES_READ + feat-sales-booking/feat-pos | Số lượng khách đặt theo hàng | Có |
| POST | /api/sales-bookings | SALES_CREATE + feat-sales-booking | Tạo đơn | Có |
| PUT | /api/sales-bookings/{id} | SALES_UPDATE + feat-sales-booking | Sửa đơn | Có |
| PATCH | /api/sales-bookings/{id}/info | SALES_UPDATE + feat-sales-booking | Sửa ghi chú, ngày giao | Có |
| POST | /api/sales-bookings/{id}/confirm | SALES_UPDATE + feat-sales-booking | Xác nhận đơn | Có |
| POST | /api/sales-bookings/{id}/cancel | SALES_DELETE + feat-sales-booking | Hủy đơn | Có |
| POST | /api/sales-bookings/{id}/finish | SALES_UPDATE + feat-sales-booking | Kết thúc đơn đang giao 1 phần | Có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| trx_orders (order_type = BOOKING) | Đầu đơn đặt hàng; dùng chung bảng với hóa đơn | Có |
| dtl_order_items | Dòng hàng | Có |
| trx_financial_transactions | Phiếu thu tiền trả trước | Có |
| mst_business_partners | Khách hàng, dư nợ | Có |

## 14. Acceptance Criteria

- **AC-PO-SALE-01.** Tạo đơn đặt hợp lệ thì tồn kho thực tế không đổi.
- **AC-PO-SALE-02.** Không lưu được đơn thiếu khách hoặc không có hàng.
- **AC-PO-SALE-03.** Đơn đã gộp, đã giao (`DELIVERING`/`FINISHED`) hoặc đã hủy không sửa/hủy/gộp được.
- **AC-PO-SALE-04.** Hủy đơn chuyển trạng thái `CANCELLED` và xử lý tiền cọc theo lựa chọn giữ/hoàn.
- **AC-PO-SALE-05.** Giao thiếu từ đơn đặt chuyển đơn gốc sang `DELIVERING` giữ nguyên phần còn lại (Trường hợp A).

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-PO-SALE-01 | Tạo đơn đặt rồi kiểm tra tồn kho | Tồn thực tế không đổi; cột "Khách đặt" tăng | Integration |
| TS-PO-SALE-02 | Tạo đơn thiếu khách, số lượng 0, giá âm | Bị từ chối | Unit |
| TS-PO-SALE-03 | Sửa đơn đã có hóa đơn giao | Bị từ chối | Integration |
| TS-PO-SALE-04 | Hủy đơn có tiền trả trước, chọn hoàn tiền / giữ tiền | Phiếu thu và công nợ đúng theo lựa chọn | Integration |
| TS-PO-SALE-05 | NV kho A sửa đơn kho B | Bị chặn | Integration |

## 16. Dependencies and Constraints

- specs/master-data (khách, hàng, giá)
- specs/warehouse-access
- specs/roles-permissions (phân tách `feat-sales-booking` và `feat-pos`)
- Thiết lập đơn hàng (mst_order_settings)
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. Giá dòng hàng lấy từ client, server chưa đối chiếu lại với bảng giá gốc.
2. Làm tròn giảm giá % ở đặt hàng (về đồng, kiểu ToEven) khác frontend (làm tròn nửa lên).
3. Cần kiểm tra quyền hiển thị nút "Xử lý đơn hàng" trên màn Đặt hàng nếu tài khoản chỉ có `feat-sales-booking` mà không có `feat-pos`.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/SalesBookings/Commands/SalesBookingCommands.cs`
- `StockFlow_Backend/StockFlow.Application/Features/SalesBookings/Common/SalesBookingOps.cs`
- `StockFlow_Backend/StockFlow.Application/Features/SalesBookings/Queries/SalesBookingQueries.cs`
- `StockFlow_Backend/StockFlow.API/Controllers/SalesBookingsController.cs`

**Frontend**
- `StockFlow_Frontend/src/features/sales-bookings/screens/SalesBookingsScreen.tsx`
- `StockFlow_Frontend/src/features/pos/screens/PosScreen.tsx (tab Đặt hàng)`
