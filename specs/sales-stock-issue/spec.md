# SPEC — Xuất kho bán hàng & Hóa đơn POS

- **Module:** `sales-stock-issue`  •  **Use Case:** UC-35, UC-36 (điều chỉnh theo mô hình bán tại quầy & xử lý hóa đơn từ đơn đặt)
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`), đã điều chỉnh theo mô hình thực tế của nhóm (chốt Trường hợp A & bỏ Yêu cầu xuất kho chờ duyệt ngày 12/11/2026).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Hệ thống **không có bước gửi Yêu cầu xuất kho (`Waiting for Issue`) chờ Thủ kho duyệt riêng**. Việc xuất kho bán hàng diễn ra ngay khi người có quyền Bán hàng (`feat-pos`) bấm thanh toán hóa đơn (`POST /api/orders/pos`) theo 2 luồng:
1. **Bán nhanh tại quầy:** Lập hóa đơn (`INVOICE`), trừ tồn kho và hoàn tất phiếu xuất (`COMPLETED`) ngay lập tức.
2. **Xử lý hóa đơn từ Đơn đặt hàng (`bookingOrderId`):** Mở đơn đặt hàng, nhập số lượng thực tế có thể giao tại kho (VD: đặt 10, thực tế có 5 $\rightarrow$ xuất hóa đơn 5 cái), thanh toán xong thì trừ tồn & xuất kho ngay; **đơn đặt gốc chuyển sang `DELIVERING` giữ 5 cái còn lại chờ lấy tiếp (Trường hợp A)**.

## 2. Scope

**Trong phạm vi**
- Bán nhanh tại quầy, xuất kho & trừ tồn ngay (`POST /api/orders/pos`)
- Xử lý hóa đơn giao toàn bộ hoặc giao 1 phần từ Đơn đặt hàng (Trường hợp A: giữ đơn gốc ở `DELIVERING`)
- Xem danh sách, xem chi tiết, sửa ghi chú và hủy hóa đơn bán hàng (hoàn tồn, giảm nợ, hủy phiếu thu)

**Ngoài phạm vi**
- Xuất nguyên vật liệu cho sản xuất (specs/production)
- Yêu cầu duyệt xuất kho trung gian `Waiting for Issue` (đã chốt bỏ khỏi mô hình)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Người bán / Xử lý xuất hóa đơn | `SALES_CREATE` + chức năng `feat-pos` | Phải có quyền kho xuất. Người chỉ có `feat-sales-booking` không xuất hóa đơn được |
| Quản lý / Sửa / Hủy hóa đơn | Xem: `SALES_READ`; Sửa/Hủy: `SALES_UPDATE` + `feat-invoices` | Phải có quyền trên kho của hóa đơn |

## 4. Preconditions and Postconditions

**Preconditions**
- Đã đăng nhập, có quyền `feat-pos` (khi lập/xuất hóa đơn) hoặc `feat-invoices` (khi xem/sửa ghi chú/hủy) và có quyền truy cập kho xuất
- Nếu xử lý từ đơn đặt: đơn đặt đang ở trạng thái mở (`DRAFT`, `CONFIRMED`, `DELIVERING`) và cùng khách hàng, cùng chi nhánh

**Postconditions**
- Xuất hóa đơn thành công: hóa đơn `COMPLETED`, phiếu xuất `COMPLETED`, tồn kho giảm, thẻ kho ghi `ISSUE_SALE`, công nợ & phiếu thu cập nhật; đơn đặt gốc (nếu có) chuyển `DELIVERING` hoặc `FINISHED`
- Hủy hóa đơn thành công: hóa đơn & phiếu xuất & phiếu thu chuyển `CANCELLED`, hoàn tồn kho (`ISSUE_SALE_CANCEL`), giảm công nợ khách, mở lại trạng thái đơn đặt gốc (nếu có)
- Thất bại: transaction rollback, tồn kho và công nợ không đổi

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-04 | Chỉ thao tác trên kho được gán quyền. |
| BR-15 | Công nợ khách tăng theo phần chưa thanh toán của hóa đơn (`Total − Paid − DepositApplied`) tại thời điểm xuất hóa đơn; giảm khi thu tiền hoặc hủy/trả hàng. |
| BR-16 | Số thực xuất không vượt tồn khả dụng (trừ khi thiết lập hệ thống "cho phép bán âm") và không vượt số lượng còn lại nếu xuất từ đơn đặt. |
| BR-17 | *(Điều chỉnh theo Trường hợp A)* Khi xuất thiếu từ đơn đặt hàng (VD: đặt 10, thực tế xuất 5), không tạo đơn đặt hàng mới mà cập nhật chính đơn đặt gốc sang trạng thái `DELIVERING` để theo dõi phần còn lại chờ lấy tiếp (hoặc bấm Kết thúc). |
| BR-42 | Hàng đang trong phiên kiểm kê chưa hoàn tất thì không được xác nhận xuất. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-SSI-01 | Bán nhanh tại quầy (`feat-pos`): tạo hóa đơn `INVOICE`, phiếu xuất `COMPLETED`, trừ tồn kho, ghi thẻ kho `ISSUE_SALE`, cập nhật công nợ và phiếu thu | Có | `CreatePosOrderCommand` thực hiện trọn vẹn trong transaction |
| FR-SSI-02 | Xử lý hóa đơn từ đơn đặt (`bookingOrderId`): xuất đủ hoặc xuất 1 phần theo tồn kho thực tế; xuất thiếu giữ đơn đặt gốc ở `DELIVERING` (Trường hợp A) | Có | `CreatePosOrderCommand` + `SalesBookingOps.RecomputeStatusAsync` |
| FR-SSI-03 | Kiểm tra tồn khả dụng (bao gồm hàng khách đặt của đơn khác) và thiết lập "cho bán âm"; chặn 2 giao dịch xuất món cuối cùng lúc | Một phần | Có kiểm tồn & setting bán âm; chưa có khóa bi quan / khóa đồng thời |
| FR-SSI-04 | Chặn xuất kho khi hàng hóa đang kiểm kê (`BR-42`) | Chưa có | Chưa kiểm tra phiên kiểm kê đang mở |
| FR-SSI-05 | Xem danh sách, xem chi tiết, sửa ghi chú và in hóa đơn theo kho được phân quyền | Một phần | Đã có API đầy đủ; `GetPosOrdersQuery` (khi token Admin cũ bị hạ quyền) cần đồng bộ kiểm tra DB realtime (xem `specs/warehouse-access`) |
| FR-SSI-06 | Hủy hóa đơn (`CancelOrderCommand`): hoàn tồn kho, giảm nợ, hủy phiếu thu, tính lại trạng thái đơn đặt gốc; chặn nếu đã có phiếu trả hàng | Có | `CancelOrderCommand` xử lý đủ các bước trong transaction |

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
| Số thực xuất | ≥ 0, ≤ số yêu cầu, ≤ tồn khả dụng | POS: kiểm tồn theo thiết lập "cho bán âm"; kiểm hàng đang giữ cho đơn đặt |
| Quyền kho | Bắt buộc | BE: có |
| (Existing) Số lượng bán | > 0, ≤ 100.000 | BE validator; FE chỉ nhận số nguyên |
| (Existing) Khách lẻ | Phải trả đủ | FE và BE |

## 9. Main Flow

1. **Bán tại quầy:** Người có quyền `feat-pos` chọn hàng, khách hàng, thanh toán $\rightarrow$ bấm Thanh toán để lập hóa đơn và xuất kho ngay (`COMPLETED`).
2. **Xử lý đơn đặt hàng:** Mở đơn đặt (`CONFIRMED` / `DELIVERING`), bấm **Xử lý đơn hàng** sang POS $\rightarrow$ điều chỉnh số lượng thực xuất theo tồn kho hiện có (VD: đặt 10, kho còn 5 $\rightarrow$ giữ 5) $\rightarrow$ thanh toán.
3. Hệ thống kiểm tra tồn khả dụng, hạn mức tín dụng và quyền kho.
4. Hệ thống tạo hóa đơn, phiếu xuất `COMPLETED`, trừ tồn kho, ghi thẻ kho, ghi phiếu thu/công nợ và tự động tính lại trạng thái đơn đặt (`DELIVERING` nếu còn thiếu, `FINISHED` nếu đủ).

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A35.1 Giao một phần (Trường hợp A) | Khi tồn kho chỉ đủ 1 phần (VD: đặt 10, xuất 5): tạo hóa đơn xuất 5 cái; đơn đặt gốc giữ nguyên mã ở trạng thái `DELIVERING` với số còn lại = 5 để xử lý tiếp ở lần sau (hoặc bấm Kết thúc nếu khách không lấy nữa) |
| A35.2 Hủy hóa đơn | Khi hóa đơn chưa có phiếu trả hàng: hủy hóa đơn, hoàn tồn kho (`ISSUE_SALE_CANCEL`), giảm nợ/hủy phiếu thu, mở lại đơn đặt gốc nếu cần |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E35.1 | Số lượng ≤ 0 hoặc vượt tồn khả dụng (khi tắt bán âm) | Không cho xuất hóa đơn, báo lỗi tồn kho |
| E35.2 | Hàng đang trong phiên kiểm kê chưa hoàn tất | Chặn xuất (hiện chưa kiểm tra) |
| E35.3 | Không có quyền `feat-pos` hoặc không có quyền kho xuất | HTTP 403 / thông báo từ chối |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| POST | /api/orders/pos | SALES_CREATE + feat-pos | Bán tại quầy hoặc xử lý đơn đặt (`bookingOrderId`), thanh toán & xuất kho ngay | Có |
| POST | /api/orders/{id}/cancel | SALES_UPDATE + feat-invoices | Hủy hóa đơn, hoàn tồn, giảm nợ, cập nhật lại đơn đặt | Có |
| GET | /api/orders, /api/orders/{id} | SALES_READ + feat-invoices | Danh sách, chi tiết hóa đơn | Có |
| PUT | /api/orders/{id} | SALES_UPDATE + feat-invoices | Sửa ghi chú, người bán hóa đơn | Có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| trx_stock_issues, dtl_stock_issue_items | Phiếu xuất và dòng xuất (`COMPLETED` khi thanh toán hóa đơn) | Có |
| trx_inventory_balances, trx_inventory_transactions | Tồn kho và thẻ kho (`ISSUE_SALE`, `ISSUE_SALE_CANCEL`) | Có |
| mst_business_partners.current_debt | Công nợ phải thu khách hàng | Có |
| trx_orders (order_type = INVOICE / BOOKING) | Hóa đơn bán hàng và đơn đặt hàng gốc (`booking_order_id`) | Có |

## 14. Acceptance Criteria

- **AC-SSI-01.** Bán nhanh tại quầy hoặc xử lý đơn đặt thanh toán thành công thì tồn giảm đúng số xuất, phiếu xuất `COMPLETED` và công nợ/phiếu thu khớp giá trị.
- **AC-SSI-02.** Xuất vượt tồn khi tắt "cho bán âm" bị từ chối.
- **AC-SSI-03.** Giao thiếu (đặt 10, xuất 5) thì hóa đơn xuất 5 cái, đơn đặt gốc chuyển `DELIVERING` giữ 5 cái còn lại chờ giao tiếp (Trường hợp A).
- **AC-SSI-04.** Hủy hóa đơn thì tồn kho, công nợ, phiếu thu và tiến độ đơn đặt gốc đảo lại chính xác.
- **AC-SSI-05.** Hàng đang kiểm kê thì không xuất kho được.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-SSI-01 | Bán / xuất đủ tại quầy | Tồn, thẻ kho, phải thu, phiếu thu khớp nhau | Integration |
| TS-SSI-02 | Xuất vượt tồn khi cấm bán âm | Bị từ chối | Integration |
| TS-SSI-03 | Hai người xuất món cuối cùng cùng lúc | Chỉ một thành công (hiện tại: chưa có khóa đồng thời) | Integration |
| TS-SSI-04 | Đặt 10, vào xử lý xuất 5 | Hóa đơn xuất 5 cái, đơn đặt giữ `DELIVERING` còn lại 5 cái | Integration |
| TS-SSI-05 | Xuất khi đang kiểm kê | Bị chặn (hiện tại: chưa chặn) | Integration |
| TS-SSI-06 | Hủy hóa đơn | Tồn và nợ trở về như trước; đơn đặt gốc mở lại số chưa giao | Integration |

## 16. Dependencies and Constraints

- specs/order-consolidation (gộp đơn & thanh toán xử lý hóa đơn)
- specs/pending-orders (đơn đặt hàng gốc `BOOKING`)
- specs/stocktake (khóa kiểm kê)
- specs/roles-permissions (`feat-pos`, `feat-invoices`)
- Thiết lập đơn hàng (`mst_order_settings`)
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. **BR-42** (chặn xuất khi hàng đang kiểm kê) chưa được triển khai trong `CreatePosOrderCommand`.
2. Thiếu khóa đồng thời (race condition) khi 2 giao dịch cùng bán hết món cuối cùng hoặc vượt hạn mức cùng lúc.
3. Các lỗi tính tiền và dữ liệu biên của bán tại quầy được liệt kê trong `reviewSalesFlow.md` (`BH-03`, `BH-04`, `BH-05`, `BH-07`).

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/Orders/Commands/CreatePosOrderCommand.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Orders/Commands/CancelOrderCommand.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Orders/Queries/*.cs`
- `StockFlow_Backend/StockFlow.API/Controllers/OrdersController.cs`

**Frontend**
- `StockFlow_Frontend/src/features/pos/screens/PosScreen.tsx`
- `StockFlow_Frontend/src/features/orders/screens/OrdersScreen.tsx`
- `StockFlow_Frontend/src/features/orders/screens/OrderDetailScreen.tsx`
