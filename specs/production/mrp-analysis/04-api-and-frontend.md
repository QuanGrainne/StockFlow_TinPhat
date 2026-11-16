# 04 — Đề xuất Backend API và Frontend (Phần 6, 7)

Chỉ là đề xuất thiết kế. Chưa có API, handler hay màn hình nào được tạo.

## A. Backend

### A.1 Tổ chức theo cấu trúc hiện tại

```
StockFlow.Domain/Services/
  MrpPolicy.cs                      thuần: phân bổ theo ngày, lùi ngày theo lead time, lịch làm việc
StockFlow.Application/Features/Production/
  Queries/
    GetMrpOverviewQuery.cs          tổng hợp theo NVL
    GetMrpPlanRequirementsQuery.cs  theo một kế hoạch, có mốc ngày
    GetMrpShortagesQuery.cs
    GetMrpPreparationScheduleQuery.cs
    GetMrpReadinessQuery.cs
    GetMrpPurchaseSuggestionsQuery.cs
    GetMrpTransferSuggestionsQuery.cs
  Helpers/
    MrpReader.cs                    đọc nhu cầu (kế hoạch + lệnh) và nguồn (tồn, đơn mua, chuyển kho)
  DTOs/MrpDtos.cs
StockFlow.API/Controllers/MrpController.cs      route api/production/mrp
```

- Mọi API giai đoạn đầu là **Query** (chỉ đọc), vì kết quả không lưu. Không cần transaction hay khóa.
- `MrpPolicy` đặt ở Domain vì là phép tính thuần (không DB, không đọc giờ; hôm nay được truyền vào), giống `ProductionPolicy`, `CostingPolicy`.
- `MrpReader` dùng lại `ProductionPlanRules.OrderedQuantitiesAsync`, `ProductionPolicy.CalculateRequirement`, `ProductionStockOps.AvailableAsync`.
- Lead time và ngày giao dự kiến được nhập qua API hàng hóa và đơn mua đang có (thêm trường), không tạo API riêng.

### A.2 Quyền

| Lựa chọn | Nội dung |
|---|---|
| a (đề xuất) | `[RequirePermission("PROD_READ")]` + `[RequireFeature]` nhận `feat-production-plans`, `feat-production-plan-approval`. Không thêm chức năng mới |
| b | Thêm chức năng `feat-production-mrp` thành mục menu riêng |

Cần nhóm quyết định (Q-M9). Mọi API có tham số kho phải kiểm `ICurrentUserService.HasWarehouseAccessAsync`; khi không truyền kho thì chỉ tính trên các kho người dùng được phân quyền (`GetAuthorizedWarehouseIdsAsync`).

### A.3 Danh sách API

Tham số chung: `warehouseId` (kho NVL, bắt buộc trừ khi ghi khác), `fromDate`, `toDate` (lọc theo ngày cần), `includePending` (có tính kế hoạch Chờ duyệt không).

Lỗi chung: 401 chưa đăng nhập; 403 thiếu quyền hoặc chức năng; 400 `{ message }` cho lỗi nghiệp vụ; 400 `VALIDATION_FAILED` cho lỗi dữ liệu.

| # | Method, Endpoint | Mục đích | Request | Response (chính) | Validation | Business rules | Lỗi riêng |
|---|---|---|---|---|---|---|---|
| 1 | `GET /api/production/mrp/overview` | Tính và tổng hợp nhu cầu theo NVL trên mọi kế hoạch + lệnh | `warehouseId`, `fromDate?`, `toDate?`, `includePending?` | Mỗi NVL: mã, tên, đơn vị, tổng nhu cầu, tồn, đang đặt, đang kiểm nhận, đang chuyển đến, thiếu, ngày cần sớm nhất, ngày đặt hàng, trạng thái | `fromDate ≤ toDate`; khoảng tối đa 366 ngày | BR-MRP-01..06 | Kho không có quyền |
| 2 | `GET /api/production/mrp/plans/{planId}` | Nhu cầu của một kế hoạch, có mốc ngày và kết quả sau phân bổ | `warehouseId` | Từng dòng kế hoạch → từng NVL: nhu cầu, ngày cần, được cấp, thiếu, ngày đặt hàng; tỷ lệ sẵn sàng của dòng | — | Phân bổ tính trên **mọi** nhu cầu, không chỉ kế hoạch này | Không tìm thấy kế hoạch |
| 3 | `GET /api/production/mrp/materials/{materialId}` | Dòng thời gian của một NVL | `warehouseId`, `fromDate?`, `toDate?` | Danh sách sự kiện theo ngày: nhu cầu (kế hoạch / lệnh nào), nguồn về (đơn mua / chuyển kho nào), tồn dự kiến sau mỗi sự kiện | — | BR-MRP-03, 05 | NVL không tồn tại |
| 4 | `GET /api/production/mrp/availability` | Tồn khả dụng của danh sách NVL | `warehouseId`, `materialIds`, `asOfDate?` | Mỗi NVL: tồn, đã cấp cho nhu cầu trước `asOfDate`, khả dụng, lô sắp hết hạn | Tối đa 200 NVL | Loại lô hết hạn trước `asOfDate` | — |
| 5 | `GET /api/production/mrp/shortages` | Danh sách NVL thiếu | Như #1, thêm `status?` (kịp đặt / trễ / chưa có lead time) | Mỗi (NVL, mốc ngày): số thiếu, ngày cần, ngày đặt hàng, kế hoạch / lệnh bị ảnh hưởng | — | BR-MRP-07, 08 | — |
| 6 | `GET /api/production/mrp/preparation-schedule` | Lịch chuẩn bị NVL | `warehouseId`, `fromDate`, `toDate` | Theo ngày: việc cần làm (đặt hàng / hàng phải đến / hoàn thành kiểm nhận / đưa vào sản xuất), NVL, số lượng | Bắt buộc khoảng ngày | Công thức 4 mốc ngày (file 02 mục 4) | — |
| 7 | `GET /api/production/mrp/readiness` | Mức sẵn sàng của từng dòng kế hoạch / lệnh | `warehouseId`, `planId?`, `fromDate?`, `toDate?` | Mỗi dòng: trạng thái (Sẵn sàng / Đủ khi hàng về / Thiếu / Trễ / Chưa có BOM), tỷ lệ làm được, NVL gây thiếu | — | BR-MRP-09 | — |
| 8 | `GET /api/production/mrp/purchase-suggestions` | Đề xuất mua | Như #1 | Mỗi NVL: số đề xuất mua, hạn đặt, nhà cung cấp lần mua gần nhất (nếu có) | — | Số đề xuất = thiếu sau khi trừ đang đặt có ngày kịp; có cộng tồn an toàn hay không: Q-M6 | — |
| 9 | `GET /api/production/mrp/transfer-suggestions` | Đề xuất chuyển kho | `warehouseId` (kho thiếu) | Mỗi NVL thiếu: kho khác có tồn, số có thể chuyển | — | Chỉ kho người dùng có quyền; số có thể chuyển không tính phần kho đó cần cho nhu cầu của chính nó (Q-M7) | — |

Giai đoạn đầu chỉ **đề xuất**. Người dùng tự lập đơn mua / phiếu chuyển ở module đang có. Tự tạo chứng từ là NICE TO HAVE và cần quyết định riêng.

### A.4 Điểm kỹ thuật cần lưu ý

- **Hiệu năng:** API #1 đọc mọi kế hoạch đã duyệt, mọi lệnh mở, tồn, đơn mua. Cần gom bằng vài truy vấn nhóm, không lặp từng kế hoạch. Danh sách sản xuất hiện không phân trang (K9), dữ liệu đồ án nhỏ nên chấp nhận được.
- **Nhất quán với màn hiện có:** tab Nhu cầu NVL của kế hoạch so với **toàn bộ** tồn; MRP so với tồn **sau phân bổ**. Hai con số "thiếu" sẽ khác nhau. Cần chọn: đổi tab cũ sang cách mới, hoặc ghi chú rõ sự khác nhau (Q-M3).
- **Múi giờ:** "hôm nay" lấy theo giờ Việt Nam (`VietnamTime`), truyền vào `MrpPolicy`.

## B. Frontend

Vị trí: trong `src/features/production/` (screens, components, services, types), nạp qua `LazyAppLayout` → `AppLayout` như các màn sản xuất khác. Bảng và modal theo mẫu hiện có của module (bảng Tailwind, `ProductionDialog`, icon `lucide-react`).

### B.1 Kế hoạch sản xuất (màn đang có, bổ sung)

| Thành phần | Bổ sung |
|---|---|
| Bảng danh sách | Cột "Sẵn sàng NVL": thẻ Sẵn sàng / Thiếu / Trễ |
| Chi tiết, tab Nhu cầu NVL | Cột "Ngày cần", "Được cấp", "Thiếu sau phân bổ", "Hạn đặt hàng"; ghi chú cách tính |
| Form lập / sửa | Không đổi |

### B.2 Dự kiến nhu cầu NVL (màn mới)

| Mục | Nội dung |
|---|---|
| Cột | Mã NVL, tên, đơn vị, tổng nhu cầu, tồn, đang đặt, đang kiểm nhận, đang chuyển đến, thiếu, ngày cần sớm nhất, hạn đặt hàng, trạng thái |
| Bộ lọc | Kho NVL, khoảng ngày cần, trạng thái, tìm mã / tên, ô chọn "tính cả kế hoạch chờ duyệt" |
| Trạng thái | Đủ, Đủ khi hàng về, Thiếu, Trễ, Chưa có lead time |
| Nút | Xuất Excel; bấm dòng mở dòng thời gian của NVL (API #3) |

### B.3 NVL thiếu (màn mới hoặc tab của B.2)

| Mục | Nội dung |
|---|---|
| Cột | NVL, đơn vị, ngày cần, số thiếu, hạn đặt hàng, còn mấy ngày, kế hoạch / lệnh bị ảnh hưởng, tồn ở kho khác |
| Bộ lọc | Kho, khoảng ngày, chỉ hiện "trễ", chỉ hiện "có thể chuyển kho" |
| Nút | "Lập đơn đặt hàng" và "Lập phiếu chuyển" mở màn tạo đang có (điền sẵn là NICE TO HAVE); xuất Excel |

### B.4 Lịch chuẩn bị NVL (màn mới)

| Mục | Nội dung |
|---|---|
| Dạng | Bảng nhóm theo ngày (không cần lịch dạng lưới ở giai đoạn đầu) |
| Cột | Ngày, loại việc (Đặt hàng / Hàng đến / Xong kiểm nhận / Đưa vào sản xuất), NVL, số lượng, cho kế hoạch / lệnh nào, trạng thái (Chưa tới / Hôm nay / Quá hạn) |
| Bộ lọc | Kho, khoảng ngày (mặc định 14 ngày tới), loại việc |

### B.5 Theo dõi mức sẵn sàng (màn mới hoặc tab)

| Mục | Nội dung |
|---|---|
| Cột | Kế hoạch / lệnh, thành phẩm, số lượng, ngày bắt đầu, trạng thái sẵn sàng, tỷ lệ làm được, NVL gây thiếu |
| Bộ lọc | Kho, khoảng ngày bắt đầu, trạng thái, kế hoạch |
| Nút | Mở chi tiết kế hoạch; mở danh sách NVL thiếu của dòng |

Để giảm số mục menu, B.2–B.5 có thể là **một màn "Nhu cầu NVL (MRP)" với bốn tab**. Ma trận phân quyền chỉ liệt kê mục menu (`NAVBAR_FEATURES`), nên số mục menu cũng là số chức năng phải phân quyền.

### B.6 Luồng thao tác

1. Kế toán sản xuất lập kế hoạch → xem tab Nhu cầu NVL → thấy thiếu và hạn đặt hàng → gửi duyệt.
2. Manager mở màn MRP, tab NVL thiếu → quyết định mua hoặc chuyển kho → lập đơn mua (nhập ngày giao dự kiến) hoặc phiếu chuyển.
3. Hằng ngày: mở Lịch chuẩn bị, xem việc "hôm nay" và "quá hạn".
4. Trước khi lập lệnh: mở tab Sẵn sàng, chỉ lập lệnh cho dòng Sẵn sàng (không bị chặn nếu chưa sẵn sàng, theo BR-PP-15).

### B.7 Phân quyền theo vai trò (đề xuất, theo mặc định hiện có của kế hoạch sản xuất)

| Vai trò | Xem MRP | Lập đơn mua / phiếu chuyển từ gợi ý |
|---|---|---|
| Admin, Manager | Có | Theo quyền mua hàng / chuyển kho đang có |
| Production Accountant | Có | Theo quyền đang có của vai trò |
| Warehouse Staff | Cần xác nhận (Q-M9): có cho xem Lịch chuẩn bị không | — |
| Sales Staff | Không | — |
