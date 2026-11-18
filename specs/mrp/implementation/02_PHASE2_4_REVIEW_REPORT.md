# Báo cáo kiểm tra lại các phase MRP (Phase 1–4)

- **Ngày:** 18/11/2026. **Người phụ trách:** Ninh. **Nhánh:** `feature/mrp` (chưa commit phần này).
- **Yêu cầu:** "chạy lại các phase và kiểm lại tính năng MRP".
- **Hiện trạng trước khi kiểm:**
  - Phase 2 (API) và Phase 3 (màn hình) đã có code: controller, lệnh chạy, 2 reader, 7 truy vấn, màn MRP, menu.
  - Phase 4 dở dang: chưa có ô nhập thời gian giao, ngày giao dự kiến.

## 1. Lỗi tìm thấy và đã sửa

| # | Lỗi | Hậu quả | Đã sửa ở |
|---|---|---|---|
| 1 | Nguồn MRP lấy **mọi hàng có tồn trong kho** (cả thành phẩm, hàng bán) và mọi dòng đơn đặt, dùng `min_safe_stock` làm tồn an toàn (trái Q5) | Đề xuất mua cả hàng không liên quan sản xuất; số NVL của lần chạy bị thổi phồng | `MrpSupplyReader`: chỉ NVL có nhu cầu, tồn an toàn = 0 |
| 2 | Bảng truy vết `dtl_mrp_run_demands` không được ghi | Tab NVL thiếu không chỉ ra kế hoạch / lệnh nào thiếu (AC-05); tab Theo ngày không có nguồn nhu cầu | `RunMrpCommand` ghi phân bổ; `GetMrpShortagesQuery`, `GetMrpDailyRequirementsQuery` đọc ra |
| 3 | 5 truy vấn xem kết quả **không kiểm quyền kho** của lần chạy | Người không có quyền kho vẫn xem được kết quả | `MrpRunAccess.LoadAsync` dùng chung cho mọi truy vấn |
| 4 | "Mở đơn đặt mua tất cả" đưa cùng NVL nhiều lần | Trang đặt hàng có dòng trùng → lưu bị từ chối "một mặt hàng chỉ một dòng" | `MrpScreen.purchaseOrderHref`: gộp theo NVL rồi làm tròn lên |
| 5 | Màn MRP không cuộn được (khung sản xuất `overflow-hidden`); lỗi API bị nuốt (`console.error`, biến `error` không hiển thị); dùng `any` | Bảng dài bị cắt; người dùng không thấy lỗi; vi phạm quy tắc TypeScript | Viết lại `MrpScreen`, sửa `MrpRunDialog`, `MrpProjectionModal` (lint MRP: 6 lỗi + 10 cảnh báo → 0) |
| 6 | `RunBy = UserId ?? 1` | Viết cứng người dùng 1 (trái quy tắc dự án) | Không xác định được người dùng thì báo lỗi |
| 7 | Ngày cần của lệnh lấy theo ngày tạo lệnh; lệnh không có `start_date` bị bỏ | Trái BR-MRP-03; sót nhu cầu | Lệnh chưa bắt đầu thuộc kế hoạch lấy ngày bắt đầu dòng kế hoạch; thành phẩm theo dòng lệnh |
| 8 | Gom tuần dùng năm dương lịch với tuần ISO | Tuần cuối năm bị gán sai năm (VD 01/01/2027 thành "2027-W53") | Gom bằng `MrpPolicy.PeriodStart`, nhãn tuần dùng `ISOWeek.GetYear` |
| 9 | Tồn đầu kỳ hiển thị = tồn dự phóng của dòng ngày chạy | Sai khi hôm nay có nhu cầu / hàng về | `MrpRunAccess.OpeningBalance` = tồn dự phóng + nhu cầu − hàng về |
| 10 | Tồn dự phóng hiển thị tồn an toàn theo giá trị hiện tại của hàng, không phải giá trị đã dùng khi tính | Lệch với kết quả | Hiển thị 0 (Q5) |
| 11 | Đề xuất mua gồm cả NVL đã ngừng kinh doanh | Trái BR-MRP-29 | Lọc trong `GetMrpPurchaseSuggestionsQuery` |
| 12 | Thành phẩm thiếu BOM chỉ có ở lúc chạy, xem lại thì rỗng | Mất cảnh báo khi mở lại lần chạy | Ghi danh sách mã vào ghi chú lần chạy, đọc lại đúng danh sách lúc chạy |
| 13 | Cảnh báo lỗi thời chỉ xét kế hoạch và đơn đặt được sửa | Không báo khi có lệnh mới, đơn đặt mới, nhập / xuất kho NVL | Thêm: lệnh mới, đơn đặt mới, mọi giao dịch kho của NVL trong kỳ |
| 14 | Mã lần chạy tự lấy sequence, không qua bộ sinh mã chung | Trái quy tắc mã chứng từ | Loại `MRP_RUN` trong `TransactionCodeGenerator`, gọi qua `ProductionHelper.NextCodeAsync` |
| 15 | Mặc định quyền frontend thiếu `feat-production-mrp` (backend đã có) | Vai trò chưa cấu hình không thấy menu MRP | `permissionService.ts` |
| 16 | `GET /runs` không kiểm `IsSuccess` | Lỗi trả 200 rỗng | `MrpController` |
| 17 | Phase 4 chưa có ô nhập thời gian giao (hàng hóa) và ngày giao dự kiến (đơn đặt) | MRP không bao giờ tính được hạn đặt hàng; đơn đặt không bao giờ được tính là nguồn | Backend: `LeadTimeDays` / `ClearLeadTime` ở API hàng hóa, `ExpectedDate` ở API đơn đặt (tạo, sửa, gộp, xem). Frontend: ô "Thời gian giao hàng (ngày)" ở form hàng hóa, ô "Ngày giao dự kiến" ở trang đặt hàng nhập |

## 2. Kiểm thử

| Bộ | Kết quả |
|---|---|
| Phase 1 — `specs/mrp/unit-tests` (bộ tính `MrpPolicy`) | **38/38** |
| Phase 2–4 — `specs/mrp/api-tests/mrptest.ps1` (API thật trên database tạm `stockflow_verify_mrp`, đã xóa sau khi chạy) | **37/37** (kết quả: `results-mrp.json`) |
| Hồi quy duyệt kế hoạch — `pptest5.ps1` | **6/6** |
| Log API | 0 lỗi 500; dòng `fail` duy nhất là EF dò `__EFMigrationsHistory` trên database trống lúc khởi động |
| `dotnet build StockFlow.sln -c Release` | 0 lỗi, 0 cảnh báo |
| Frontend `tsc` | 0 lỗi |
| Frontend lint | 5 file MRP: 0 vấn đề. Các file dùng chung đã sửa: số lỗi bằng bản HEAD (không thêm) |
| `npm run build` | Đạt, 46/46 trang, có `/production/mrp` |
| `check-structure.js --strict` | Không có vi phạm mới |

**37 ca API** (ngày tương đối T = hôm nay, mỗi nhóm NVL mã riêng):

| Nhóm | Nội dung | Ca |
|---|---|---|
| A | Ví dụ Bàn / Ghế ở file 03 mục 6: số thiếu và hạn đặt của gỗ, sơn, ốc vít; NVL đủ không vào danh sách thiếu; chỉ ra kế hoạch / thành phẩm bị thiếu; theo ngày có nguồn; gom tháng = gom tuần = 900; thành phẩm có tồn không bị kéo vào | MT-01..11 |
| B | Đơn đặt có ngày giao về trước / sau ngày cần; nhận một phần không tính hai lần; thêm / hủy đơn; đơn không có ngày giao chỉ hiển thị; ngày giao trước ngày đặt bị chặn; sửa đơn → lần chạy cũ báo lỗi thời | MT-12..20 |
| C | Chưa có thời gian giao; trễ hạn đặt; thành phẩm mất BOM sau khi duyệt; khai báo / xóa thời gian giao; 400 ngày bị chặn; hủy kế hoạch | MT-21..26 |
| D | Lập lệnh 40 từ kế hoạch 100: tổng nhu cầu không đổi, nguồn tách KH / lệnh cùng ngày; sửa kế hoạch → lỗi thời; tính lại đúng 300 | MT-27..29 |
| F | Đơn quá ngày giao chưa về tính là về hôm nay | MT-30 |
| E | Bán hàng 403; kế toán sản xuất chạy được trên kho được phân quyền, bị chặn ở kho khác; không xem được lần chạy của kho không có quyền; validation kỳ, kho; lần chạy không tồn tại; lịch sử | MT-31..37 |

Chạy lại:
1. `dotnet run --project specs/mrp/unit-tests -c Release`.
2. Dựng database tạm bằng `env.ps1 -DbName <db thử>` và chạy API ở cổng 5196.
3. Chạy `specs/mrp/api-tests/mrptest.ps1`.

## 3. Giới hạn còn lại

| # | Nội dung | Đề xuất |
|---|---|---|
| L1 | Cảnh báo lỗi thời không phát hiện được **hủy lệnh** và **đổi BOM** (hai bảng này không có cột thời gian) | Chấp nhận; ghi chú trên màn hình. Nếu cần: thêm cột thời gian (đổi ERD) |
| L2 | Đơn đặt **đã nhập một phần** không sửa được ngày giao dự kiến (luật cũ: chỉ sửa phiếu tạm / đã đặt chưa nhập) | Nếu cần: endpoint riêng sửa ngày giao như endpoint sửa ghi chú |
| L3 | "Lập đơn đặt hàng" từ MRP mở đơn ở **kho đang làm việc**; lần chạy nhiều kho thì người dùng tự chọn kho | Ghi trong chú thích nút |
| L4 | Cột "Đặt chưa có ngày giao" và "Tồn kho khác" ở tab NVL thiếu đọc theo dữ liệu **hiện tại**, không phải lúc chạy | Chỉ để tham khảo, đã ghi trong mô tả truy vấn |
| L5 | Chưa bấm thử giao diện trên trình duyệt | Thử tay theo MS-01..05 (file 08) trước khi tạo PR |
| L6 | Chưa có mã UC / BR chính thức trong Report 3 (đang dùng UC-MRP / BR-MRP tạm) | Nhóm cấp mã |
| L7 | `next build` in cảnh báo bảo mật khuyên nâng cấp Next.js | Không tự nâng cấp (quy tắc dự án: đổi phiên bản package phải được nhóm duyệt) |

## 4. Tự kiểm

- **(a) Giả định:** Q1–Q5, Q9–Q11 theo mặc định; Q7 (không trừ hàng tạm giữ của đơn khách) và Q12 (BOM một cấp) theo mặc định.
- **(b) Cần hỏi nhóm:**
  - L2: có cần sửa ngày giao của đơn đã nhập một phần không.
  - L6: mã UC / BR chính thức.
  - Người phụ trách module Hàng hóa và Đặt hàng nhập cần biết có thêm trường mới.
- **(c) Chỗ không chắc:** giao diện chưa bấm thử (L5).
- **(d) UC/BR:**
  - UC-MRP (tạm).
  - BR-MRP-01..29.
  - AC-01..11.
  - Ảnh hưởng UC hàng hóa (thêm `lead_time_days`) và đặt hàng nhập (thêm `expected_date`).
