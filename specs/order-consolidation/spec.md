# SPEC — Gộp đơn đặt hàng, thanh toán và xử lý hóa đơn

- **Module:** `order-consolidation`  •  **Use Case:** UC-23 – UC-27
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`), đã điều chỉnh theo mô hình thực tế của nhóm (chốt Trường hợp A & bỏ Yêu cầu xuất kho chờ duyệt ngày 12/11/2026).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Nhân viên Đặt hàng (`feat-sales-booking`) gộp các đơn đặt hàng cùng một khách hàng thành một đơn đặt hàng mới. Khi đến bước giao và thanh toán, người có quyền Bán hàng (`feat-pos`) bấm **Xử lý đơn hàng** trên đơn đặt để chuyển sang màn POS, ghi nhận thanh toán (trừ tiền đặt cọc nếu có), kiểm tra hạn mức tín dụng và **xuất kho lập hóa đơn ngay** (không qua bước tạo Yêu cầu xuất `Waiting for Issue` chờ Thủ kho duyệt). Nếu công nợ vượt hạn mức, giao dịch gửi yêu cầu duyệt tín dụng chờ Manager quyết định.

## 2. Scope

**Trong phạm vi**
- Chọn và gộp các đơn đặt hàng cùng khách (UC-24)
- Xử lý đơn đặt thành hóa đơn, ghi nhận thanh toán (UC-25), sinh mã QR (UC-26)
- Kiểm tra hạn mức công nợ và gửi yêu cầu duyệt tín dụng khi vượt hạn mức (UC-27)
- Xuất hóa đơn & trừ kho ngay khi thanh toán hợp lệ (UC-23 điều chỉnh theo Trường hợp A)

**Ngoài phạm vi**
- Manager duyệt tín dụng (specs/sales-credit)
- Chi tiết trừ tồn kho & giao thiếu (specs/sales-stock-issue)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Nhân viên Đặt hàng | `SALES_UPDATE` + chức năng `feat-sales-booking` | Gộp các đơn đặt cùng khách trong kho được gán |
| Người bán / Xử lý hóa đơn | `SALES_CREATE` + chức năng `feat-pos` | Mở đơn đặt để xử lý hóa đơn, thanh toán và xuất kho trong kho được gán |

## 4. Preconditions and Postconditions

**Preconditions**
- Đã đăng nhập, có đúng quyền chức năng tương ứng (`feat-sales-booking` để gộp; `feat-pos` để xử lý hóa đơn thanh toán)
- Khách hàng có đơn đặt ở trạng thái `DRAFT` hoặc `CONFIRMED` chưa có hóa đơn giao

**Postconditions**
- Gộp đơn thành công: các đơn nguồn chuyển `CANCELLED` (trỏ `consolidated_into_order_id`), tạo 1 đơn đặt mới tổng hợp số lượng
- Xử lý hóa đơn & thanh toán thành công: tạo hóa đơn `INVOICE` + phiếu xuất `COMPLETED`, trừ tồn, ghi phiếu thu, đơn đặt gốc chuyển `DELIVERING` hoặc `FINISHED`
- Vượt hạn mức tín dụng: không tạo hóa đơn/không trừ tồn; gửi yêu cầu duyệt tín dụng (đang triển khai)

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-10 | Chỉ gộp đơn đặt của cùng một khách hàng (code hiện đang ràng buộc thêm cùng chi nhánh xử lý). |
| BR-12 | Xuất hóa đơn ghi nợ chỉ thực hiện khi `Dư nợ + (Tổng − Đã trả) ≤ Hạn mức`, hoặc Manager đã duyệt ngoại lệ tín dụng. |
| BR-13 | Manager quyết định yêu cầu tín dụng: duyệt một lần, duyệt hạn mức mới, hoặc từ chối. |
| BR-14 | Thanh toán hỗ trợ tiền mặt, chuyển khoản, QR, ghi nợ; tự động trừ tiền đặt cọc còn lại của đơn đặt; tiền trả ghi là phiếu thu. |
| BR-45 | Số tiền chưa gồm VAT. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-CONS-01 | Liệt kê đơn đặt chưa giao của khách, chọn nhiều đơn cùng 1 khách để gộp, cộng dồn số lượng và lưu tham chiếu đơn nguồn | Một phần | `MergeSalesBookingsCommand` gộp đơn cùng khách **và cùng kho** thành một đơn đặt mới; đơn gốc chuyển `CANCELLED` có `consolidated_into_order_id` |
| FR-CONS-02 | Kiểm tra kho xử lý nằm trong các kho được gán | Có | Đơn gộp giữ kho của đơn gốc và kiểm tra `HasWarehouseAccessAsync` |
| FR-CONS-03 | Khi xử lý hóa đơn: nhập tiền trả, phương thức thanh toán, trừ tiền đặt cọc trước và ghi phiếu thu | Một phần | `CreatePosOrderCommand` xử lý thanh toán, trừ tiền cọc và ghi phiếu thu; chưa có trường số tham chiếu chuyển khoản |
| FR-CONS-04 | Sinh mã QR có số tiền và mã giao dịch | Chưa có | Màn POS hiện ghi "Chưa cấu hình tài khoản ngân hàng" |
| FR-CONS-05 | Tính Nợ mới dự kiến và kiểm tra hạn mức khi thanh toán | Một phần | Có kiểm tra ở `CreatePosOrderCommand`: vượt hạn mức thì từ chối; chưa an toàn khi đồng thời |
| FR-CONS-06 | Gửi yêu cầu duyệt tín dụng kèm lý do khi vượt hạn mức (`trx_credit_limit_requests`) | Chưa có | Bảng `trx_credit_limit_requests` đã có trong DB; đang triển khai luồng gửi duyệt |
| FR-CONS-07 | Thanh toán hợp lệ thì lập hóa đơn, xuất kho ngay (`COMPLETED`) và cập nhật đơn đặt gốc sang `DELIVERING`/`FINISHED` | Có | `POST /api/orders/pos` nhận `bookingOrderId`, tạo hóa đơn + phiếu xuất `COMPLETED`, tính lại trạng thái đơn đặt (Trường hợp A) |

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
| Đơn được chọn | Cùng khách, trạng thái `DRAFT`/`CONFIRMED`, chưa có hóa đơn giao | BE: cùng khách, cùng kho, `DRAFT`/`CONFIRMED`, chưa có hóa đơn |
| Tiền trả | ≥ 0; khách lẻ phải trả đủ | POS cho trả nhiều hơn (thối tiền hoặc trừ nợ cũ) |
| Số tham chiếu chuyển khoản | Tùy chọn / theo cấu hình thanh toán | Chưa có trường riêng |
| Hạn mức | `Dư nợ + nợ mới ≤ hạn mức` (hoặc có ngoại lệ duyệt) | POS: có kiểm tra, chưa khóa đồng thời |

## 9. Main Flow

1. Nhân viên Đặt hàng (`feat-sales-booking`) mở màn Đặt hàng, chọn các đơn đặt cùng khách rồi bấm Gộp đơn (nếu cần gộp trước khi giao)
2. Hệ thống kiểm tra điều kiện và tạo 1 đơn đặt hàng mới (đơn nguồn chuyển `CANCELLED`)
3. Người bán / xử lý hóa đơn (`feat-pos`) mở đơn đặt và bấm **Xử lý đơn hàng** sang màn POS
4. Điều chỉnh số lượng thực tế có thể giao (giao đủ hoặc giao 1 phần), chọn phương thức và nhập tiền thanh toán
5. Hệ thống kiểm tra hạn mức tín dụng (`Dư nợ + Nợ mới ≤ Hạn mức`)
6. Nếu hợp lệ: tạo hóa đơn `INVOICE`, xuất kho `COMPLETED` ngay, ghi phiếu thu, cập nhật đơn đặt sang `DELIVERING`/`FINISHED`
7. Nếu vượt hạn mức: gửi yêu cầu duyệt tín dụng chờ Manager quyết định (đang triển khai)

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A23.2 Thanh toán | Chọn tiền mặt hoặc chuyển khoản / QR; trừ tiền khách đặt cọc trước (nếu có) |
| A23.3 Xin duyệt tín dụng | Vượt hạn mức: tăng tiền trả, bỏ bớt hàng, hoặc gửi yêu cầu kèm lý do và hạn mức đề xuất chờ Manager duyệt; duyệt xong mới cho thanh toán xuất hóa đơn |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E23.1 | Các đơn chọn gộp khác khách hàng (hoặc khác chi nhánh) | Không cho gộp, báo lỗi cụ thể |
| E23.2 | Tiền trả âm, khách lẻ trả thiếu, hoặc vượt quá khả năng thanh toán hợp lệ | Không cho tạo hóa đơn |
| E23.3 | Vượt hạn mức, chưa có ngoại lệ được duyệt | Chặn xuất hóa đơn (hoặc chuyển sang luồng xin duyệt tín dụng) |
| — | Chưa cấu hình tài khoản ngân hàng | Không sinh được QR |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| POST | /api/sales-bookings/merge | SALES_UPDATE + feat-sales-booking | Gộp đơn đặt cùng khách, cùng kho | Có |
| POST | /api/orders/pos | SALES_CREATE + feat-pos | Tạo hóa đơn bán nhanh hoặc xử lý đơn đặt (`bookingOrderId`), thanh toán & xuất kho ngay | Có |
| — | Yêu cầu duyệt tín dụng | — | UC-27 (gắn lúc thanh toán vượt hạn mức) | Chưa có |
| — | Sinh QR thanh toán động | — | UC-26 | Chưa có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| trx_orders.consolidated_into_order_id | Đơn được gộp vào | Có, dùng cho gộp đơn đặt |
| trx_orders.booking_order_id | Hóa đơn giao của đơn đặt hàng | Có |
| trx_stock_issues | Phiếu xuất kho (tạo trạng thái COMPLETED khi thanh toán hóa đơn) | Có |
| trx_credit_limit_requests | Yêu cầu duyệt tín dụng khi quá hạn mức | Có bảng, đang phát triển |
| trx_financial_transactions | Phiếu thu | Có |

## 14. Acceptance Criteria

- **AC-CONS-01.** Không gộp được đơn của hai khách hàng khác nhau.
- **AC-CONS-02.** Người chỉ có `feat-sales-booking` gộp được đơn nhưng không gọi được API thanh toán xuất hóa đơn (`feat-pos`).
- **AC-CONS-03.** Xử lý đơn đặt và thanh toán thành công thì hóa đơn + phiếu xuất `COMPLETED` được tạo ngay, tồn kho giảm và đơn đặt chuyển `DELIVERING`/`FINISHED`.
- **AC-CONS-04.** Vượt hạn mức mà chưa được duyệt thì không cho xuất hóa đơn ghi nợ.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-CONS-01 | Gộp hai đơn cùng khách | Số lượng cộng dồn đúng, đơn cũ chuyển `CANCELLED` có tham chiếu đơn mới | Integration |
| TS-CONS-02 | Gộp đơn khác khách | Bị từ chối | Unit |
| TS-CONS-03 | Thanh toán hóa đơn từ đơn đặt đã có tiền cọc | Trừ đúng tiền cọc vào hóa đơn; cập nhật trạng thái đơn đặt | Integration |
| TS-CONS-04 | Vượt hạn mức rồi gửi yêu cầu duyệt | Yêu cầu lưu chờ Manager duyệt (đang triển khai) | System |
| TS-CONS-05 | Sinh QR | QR đúng số tiền và mã (chưa kiểm thử được) | System |

## 16. Dependencies and Constraints

- specs/pending-orders
- specs/sales-credit (duyệt tín dụng)
- specs/sales-stock-issue
- specs/roles-permissions (`feat-sales-booking`, `feat-pos`)
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. Cần chốt lại điều kiện gộp đơn: hiện `MergeSalesBookingsCommand` bắt buộc cùng khách **và cùng chi nhánh** — nếu nhóm cho phép gộp đơn của cùng 1 khách ở khác chi nhánh thì cần điều chỉnh.
2. UC-26 (sinh QR động) và UC-27 (gửi duyệt tín dụng vượt hạn mức) chưa triển khai xong trong nhánh `dev` (đang làm).
3. Kiểm tra hạn mức ở POS hiện chưa có khóa đồng thời (race condition nếu 2 hóa đơn ghi nợ cùng lúc).

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/SalesBookings/Commands/SalesBookingCommands.cs (MergeSalesBookingsCommand)`
- `StockFlow_Backend/StockFlow.Application/Features/Orders/Commands/CreatePosOrderCommand.cs`

**Frontend**
- `StockFlow_Frontend/src/features/sales-bookings/screens/SalesBookingsScreen.tsx`
- `StockFlow_Frontend/src/features/pos/screens/PosScreen.tsx`
