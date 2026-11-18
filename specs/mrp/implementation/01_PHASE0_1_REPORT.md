# Báo cáo triển khai MRP — Bước 0 (bảng truy vết) và Phase 1 (bộ tính)

- **Ngày:** 17/11/2026. **Người phụ trách:** Ninh. **Nhánh:** `feature/mrp` (chưa commit phần này).
- **Đầu vào:** `specs/mrp/review/01..10`. Ninh đồng ý ngày 17/11/2026: thêm bảng truy vết nhu cầu, và áp dụng phương án mặc định cho Q1–Q5, Q9–Q11 (`03_MRP_BUSINESS_RULES.md` mục 7).

## 1. Quyết định đã áp dụng

| # | Quyết định | Áp dụng ở |
|---|---|---|
| Q1 | Ưu tiên cấp NVL: ngày cần sớm trước; cùng ngày thì lệnh trước kế hoạch, rồi theo thứ tự tạo | `MrpPolicy` (phân bổ) |
| Q2 | Kế hoạch chờ duyệt không tính mặc định; có ô chọn | Phase 2 (`RunMrpCommand`); cột `include_pending_plans` đã có |
| Q3 | Người dùng chọn kho khi chạy | Phase 2; cột `warehouse_ids` đã có |
| Q4 | Thời gian giao tính theo ngày lịch | `MrpPolicy` |
| Q5 | Tồn an toàn = 0 ở giai đoạn đầu (không đọc `min_safe_stock`) | Phase 2 truyền SS = 0; `MrpPolicy` vẫn nhận SS để bật về sau |
| Q6, Q8 | Tính hàng đang đặt có ngày giao; lưu lịch sử lần chạy | Đã có từ commit `533caf5` |
| Q9 | Chưa cấu hình ngày nghỉ: mọi ngày là ngày làm việc | `MrpSettings.IsWorkingDay` mặc định rỗng; có sẵn chỗ cắm khi cần |
| Q10 | MRP là một mục menu / chức năng riêng, mặc định cho Manager và Kế toán sản xuất | Phase 2 (`FeatureConstants`, controller) và Phase 3 (menu) |
| Q11 | Chưa có mã trong Report 3: dùng mã tạm UC-MRP / BR-MRP | Ghi chú trong code; nhóm đổi khi cấp mã |
| — | Bảng truy vết nhu cầu | Bước 0 bên dưới |

Q7 (trừ hàng tạm giữ của đơn đặt khách) và Q12 (BOM nhiều cấp) chưa được hỏi lại. Code đi theo mặc định: không trừ hàng tạm giữ, BOM một cấp.

## 2. Bước 0 — bảng `dtl_mrp_run_demands`

| File | Nội dung |
|---|---|
| `StockFlow.Domain/Entities/MrpDemandSource.cs` (mới) | Hằng `PLAN`, `ORDER` |
| `StockFlow.Domain/Entities/DtlMrpRunDemand.cs` (mới) | Entity |
| `StockFlow.Domain/Entities/TrxMrpRun.cs` | Thêm danh sách `DtlMrpRunDemands` |
| `IStockFlowDbContext.cs`, `StockFlowDbContext.cs` | `DbSet` + ánh xạ snake_case |
| Migration `20261117054502_AddMrpRunDemands` (mới) | Tạo bảng + 5 chỉ mục; có `Down` |

Cột: `mrp_run_demand_id` (PK), `mrp_run_id` (FK, xóa theo lần chạy), `material_id`, `need_date`, `source_type`, `production_plan_id`, `production_order_id`, `product_id` (thành phẩm), `required_qty`, `allocated_qty`, `shortage_qty`.

**Khác với đề xuất ở `06_MRP_DATABASE_PROPOSAL.md`:** đề xuất ghi khóa ngoại tới dòng kế hoạch (`production_plan_item_id`). Khi làm thì đổi sang (`production_plan_id`, `product_id`):
- Kế hoạch đã duyệt vẫn **xóa được** dòng chưa có lệnh (`UpdateProductionPlanCommand`). Nếu có khóa ngoại tới dòng kế hoạch, thao tác này sẽ bị chặn sau khi đã chạy MRP.
- Mỗi thành phẩm chỉ có một dòng trong một kế hoạch (BR-PP-06), nên cặp (kế hoạch, thành phẩm) xác định đúng dòng.
- Kế hoạch và lệnh không bao giờ bị xóa khỏi database (grep `TrxProductionPlans.Remove`, `TrxProductionOrders.Remove`: 0 kết quả), nên khóa ngoại tới hai bảng này an toàn.

## 3. Phase 1 — `StockFlow.Domain/Services/MrpPolicy.cs`

Phép tính thuần, cùng kiểu `ProductionPolicy`: không DbContext, không EF, không đọc giờ ("hôm nay" do nơi gọi truyền vào).

| Hàm / kiểu | Việc |
|---|---|
| `Calculate(demands, receipts, materials, settings)` | Tồn dự phóng theo ngày, nhu cầu ròng, đề xuất, ngày hàng phải tới, ngày đặt, cờ trễ, trạng thái NVL, phân bổ cho từng kế hoạch / lệnh |
| `Aggregate(items, Day / Week / Month)`, `PeriodStart` | Gom nhu cầu theo ngày, tuần (bắt đầu thứ Hai), tháng |
| `RoundUpForPurchase` | Làm tròn lên số nguyên khi mở đơn đặt (BR-MRP-27) |
| `SubtractWorkingDays`, `AddWorkingDays`, `PreviousWorkingDayOrSame` | Lùi / tiến theo ngày làm việc (BR-MRP-25) |
| `MrpMaterialStatus` | Đủ / Đủ nhờ hàng về / Thiếu / Chưa có thời gian giao / Trễ |

Quy ước đã chốt trong code:
- **Mốc ngày:** luôn có ngày chạy (dòng tồn đầu kỳ) và các ngày có nhu cầu hoặc hàng về. Tồn đầu kỳ = tồn dự phóng + nhu cầu − hàng về của dòng ngày chạy.
- **Tồn dự phóng lưu ở `dtl_mrp_run_lines.projected_balance`:** là tồn **nếu không mua thêm** (có thể âm). Tồn sau đề xuất = tồn đó + đề xuất lũy kế, tính lại khi đọc.
- **Dữ liệu biên:**
  - Ngày cần đã qua tính là hôm nay.
  - Hàng quá ngày giao mà chưa về tính là về hôm nay và gắn cờ.
  - Nhu cầu và hàng về sau kỳ bị bỏ.
  - Số lượng ≤ 0 bị bỏ.
  - Thời gian giao âm coi như chưa khai báo.
- **Tồn âm** (bán âm) phải được bù trước khi cấp cho nhu cầu.
- **Phân bổ không xét tồn an toàn**, vì tồn an toàn không phải nhu cầu.

## 4. Kiểm thử

| Bước | Kết quả |
|---|---|
| Unit (`specs/mrp/unit-tests`, console, chỉ tham chiếu `StockFlow.Domain`) | **38/38 đạt** (MU-01..MU-38): 4 trường hợp số mẫu ở file 03 mục 6, ví dụ phân bổ 850 kg, ưu tiên lệnh trước kế hoạch, trễ hạn, chưa có thời gian giao, ngày nghỉ cuối tuần, đệm và kiểm nhận theo ngày làm việc, dữ liệu biên, gom tuần / tháng, làm tròn |
| `dotnet build StockFlow.sln -c Release` | 0 lỗi, 0 cảnh báo |
| `dotnet ef migrations has-pending-model-changes` | Không còn thay đổi model chưa có migration |
| Migration trên database tạm `stockflow_verify_mrp` (đã xóa sau khi chạy) | Lên mới nhất: 3 bảng MRP, 2 cột, 1 sequence. Xuống tới `AddCreditLimitHistoryAndDefaultLimitSetting`: sạch (0 / 0 / 0). Lên lại: đủ. Dòng "Failed executing DbCommand" khi lên lần đầu là EF dò `__EFMigrationsHistory` trên database trống, không phải lỗi migration |

Chạy lại: `dotnet run --project specs/mrp/unit-tests -c Release`.

Bản Debug vẫn có thể bị khóa khi API đang chạy trong Visual Studio, nên mọi lệnh build ở đây dùng Release.

## 5. Chưa làm (Phase 2 trở đi)

- `ITransactionCodeGenerator` loại `MRP_RUN` (sequence `seq_mrp_run_code` đã có).
- Chức năng MRP trong `FeatureConstants`.
- `MrpDemandReader`, `MrpSupplyReader`, `RunMrpCommand`, 7 truy vấn, `MrpController`.
- Thêm `leadTimeDays` vào API hàng hóa và `expectedDate` vào API đơn đặt.
- Giao diện.

## 6. Tự kiểm

- **(a) Giả định:** Q7 và Q12 theo mặc định (không trừ hàng tạm giữ, BOM một cấp).
- **(b) Cần hỏi nhóm:** mã UC / BR chính thức trong Report 3 cho MRP.
- **(c) Chỗ không chắc:**
  - Khi Ninh chạy lại API, 3 migration MRP tự áp vào `stockflow_dev`. Tất cả chỉ là thêm bảng hoặc thêm cột cho phép rỗng.
- **(d) UC/BR:** UC-MRP (tạm); BR-MRP-03, 04, 13, 14, 18..25, 27 (file 03).
