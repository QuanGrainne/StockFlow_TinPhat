# 05 — Thiết kế kỹ thuật đề xuất (Phase 5)

Đề xuất theo đúng cấu trúc hiện có: Clean Architecture bốn project, tổ chức theo tính năng, CQRS bằng MediatR (`.claude/rules/10-backend-structure.md`, `20-frontend-structure.md`). Chưa có file nào được tạo.

## 1. Backend

### 1.1 Vị trí code

MRP đặt trong tính năng `Production` đang có, không tạo module mới, vì nó đọc trực tiếp kế hoạch, lệnh và BOM.

```
StockFlow.Domain/
  Entities/
    TrxMrpRun.cs, DtlMrpRunLine.cs           entity mới (nếu chốt lưu lịch sử)
  Services/
    MrpPolicy.cs                             phép tính thuần
StockFlow.Application/Features/Production/
  Commands/
    RunMrpCommand.cs                         tính và lưu một lần chạy
  Queries/
    GetMrpRunsQuery.cs                       lịch sử
    GetMrpRunSummaryQuery.cs                 tổng quan
    GetMrpDailyRequirementsQuery.cs          theo ngày
    GetMrpMonthlyDemandQuery.cs              theo tháng, tuần
    GetMrpShortagesQuery.cs                  NVL thiếu
    GetMrpProjectionQuery.cs                 tồn dự phóng của một NVL
    GetMrpPurchaseSuggestionsQuery.cs        đề xuất mua
  Helpers/
    MrpDemandReader.cs                       đọc nhu cầu (kế hoạch + lệnh)
    MrpSupplyReader.cs                       đọc nguồn (tồn, đơn đặt, chuyển kho)
  DTOs/MrpDtos.cs
StockFlow.API/Controllers/MrpController.cs   route api/production/mrp
```

### 1.2 Trách nhiệm từng phần

| Phần | Trách nhiệm | Lý do đặt ở đó |
|---|---|---|
| `MrpPolicy` (Domain) | Nhận danh sách nhu cầu, nguồn, tồn đầu, SS, LT, hôm nay, tập ngày nghỉ; trả tồn dự phóng, nhu cầu ròng, đề xuất, phân bổ | Thuần: không DB, không đọc giờ. Cùng kiểu `ProductionPolicy`, `CostingPolicy` |
| `MrpDemandReader` | Truy vấn kế hoạch, lệnh, BOM; gọi `ProductionPolicy.CalculateRequirement`, `ProductionPlanRules.OrderedQuantitiesAsync` | Cần DB nên ở Application |
| `MrpSupplyReader` | Truy vấn `trx_inventory_balances`, đơn đặt, phiếu nhập, phiếu chuyển | Như trên |
| `RunMrpCommand` | Kiểm quyền kho, gọi hai reader, gọi `MrpPolicy`, lưu lần chạy trong một transaction | Command vì có ghi dữ liệu |
| Các Query | Đọc lần chạy đã lưu và trả DTO | Không tính lại |

### 1.3 Quy ước phải theo

- Handler dùng `IStockFlowDbContext`; không viết Repository.
- Transaction qua `IStockFlowDbContext.BeginTransactionAsync`.
- Handler trả `Result<T>`; controller chỉ gọi `_mediator.Send` rồi trả `Ok` hoặc `BadRequest(new { message })`.
- Validator FluentValidation chạy qua `ValidationBehavior`.
- Mỗi action có `[RequirePermission]` và `[RequireFeature]`; quyền kho kiểm trong handler bằng `ICurrentUserService.HasWarehouseAccessAsync`.
- `CreatedBy` lấy từ `ICurrentUserService.UserId`; thời gian theo `VietnamTime`.
- Entity mới phải có đủ ba nơi: `IStockFlowDbContext`, `StockFlowDbContext` (cột snake_case bằng `HasColumnName`), migration.
- Không thêm package NuGet.

### 1.4 Tái sử dụng

| Cần | Dùng lại |
|---|---|
| Công thức nhu cầu, chống tràn số | `ProductionPolicy.CalculateRequirement`, `TryCalculateRequirement` |
| Số đã lập lệnh của kế hoạch | `ProductionPlanRules.OrderedQuantitiesAsync` |
| Thành phẩm thiếu BOM | `ProductionPlanRules.ProductsWithoutActiveBomAsync` |
| Số đã nhận của đơn đặt | Cách tính trong `PurchaseOrderHelper.RecalculateStatusAsync` (tách thành hàm đọc dùng chung) |
| Hàng tạm giữ của đơn đặt khách | `SalesBookingOps.ReservedQtyAsync` (nếu chọn Q7) |
| Mở đơn đặt điền sẵn | Tham số `?products=id:sl&notes=` của trang đặt hàng nhập |

### 1.5 Thay đổi ở code đang có

| File | Thay đổi | Thuộc module |
|---|---|---|
| `Features/Products` (DTO, command tạo / sửa, query) | Thêm trường thời gian giao | Hàng hóa |
| `Features/PurchaseOrders` (DTO, command, query) | Thêm ngày giao dự kiến | Đặt hàng nhập |
| `FeatureConstants.cs` | Thêm chức năng MRP (nếu chọn Q10) | Phân quyền |
| `IStockFlowDbContext`, `StockFlowDbContext` | `DbSet` và ánh xạ cho bảng, cột mới | Hạ tầng |

Không sửa các command sản xuất, kế hoạch, xuất kho đang chạy.

### 1.6 Hiệu năng

- Đọc bằng truy vấn gom nhóm theo NVL, không lặp từng kế hoạch.
- Số ngày × số NVL nhỏ ở quy mô đồ án; chỉ lưu những ngày có biến động (có GR, SR hoặc POR), không lưu mọi ngày.

## 2. Frontend

Đặt trong `src/features/production/`, nạp trang theo mẫu `page.tsx → LazyAppLayout → AppLayout → Screen`.

```
src/app/(dashboard)/production/mrp/page.tsx        initialScreen="production-mrp"
src/features/production/
  screens/MrpScreen.tsx                            một màn, nhiều tab
  components/
    MrpRunDialog.tsx                               chọn kỳ, kho rồi chạy
    MrpSummaryTab.tsx
    MrpMonthlyDemandTab.tsx
    MrpDailyRequirementsTab.tsx
    MrpShortagesTab.tsx
    MrpPurchaseSuggestionsTab.tsx
    MrpProjectionDrawer.tsx                        tồn dự phóng của một NVL
    MrpRunHistoryTab.tsx
  services/mrpService.ts
  types/mrp.ts
```

Sửa file đang có: `lib/navigation/navbar.ts` (một mục menu), `components/layout/AppLayout.tsx` (một `case`), `features/admin/services/permissionService.ts` (mặc định chức năng).

### Các màn hình

Bảy màn trong yêu cầu được gộp thành **một màn bảy tab**, để chỉ có một mục menu và một chức năng phải phân quyền (ma trận phân quyền liệt kê theo mục menu).

| Tab | Nội dung | Cột chính | Bộ lọc, nút |
|---|---|---|---|
| Tổng quan | Lần chạy đang xem: kỳ, kho, thời điểm, người chạy, cảnh báo lỗi thời | Số NVL có nhu cầu, số NVL thiếu, số đề xuất trễ, số thành phẩm thiếu BOM | Nút "Tính MRP", "Tính lại" |
| Nhu cầu theo tháng | Tổng nhu cầu từng NVL theo tháng hoặc tuần | NVL, đơn vị, từng cột tháng / tuần, tổng | Chuyển tháng / tuần; xuất Excel |
| Nhu cầu theo ngày | Nhu cầu từng NVL theo ngày, kèm nguồn nhu cầu | Ngày, NVL, số lượng, từ kế hoạch / lệnh nào | Lọc ngày, NVL, kế hoạch |
| Tồn dự phóng | Mở từ một dòng NVL | Ngày, nhu cầu, hàng về, tồn nếu không mua, đề xuất, tồn sau đề xuất | — |
| NVL thiếu | Các ngày có tồn dưới mức an toàn | NVL, ngày thiếu đầu tiên, số thiếu, kế hoạch / lệnh bị ảnh hưởng, tồn kho khác | Lọc "chỉ trễ"; xuất Excel |
| Đề xuất mua | Số lượng và ngày đặt | NVL, số đề xuất, ngày cần hàng về, ngày đặt, trạng thái (kịp / trễ / chưa có thời gian giao), đang đặt chưa rõ ngày | Chọn dòng → "Lập đơn đặt hàng" (mở đơn đặt điền sẵn) |
| Lịch sử | Các lần chạy | Thời điểm, người chạy, kỳ, kho, số NVL thiếu | Mở lại một lần chạy |

**Không lặp màn đang có:**
- Tab Nhu cầu NVL trong chi tiết kế hoạch giữ nguyên (nhu cầu của riêng một kế hoạch).
- Không làm lại danh sách tồn kho; chỉ đọc số tồn.
- Không làm form đơn đặt mới; dùng form đang có.

Quy ước giao diện theo module sản xuất: bảng Tailwind tự dựng, `ProductionDialog` (không dùng antd `Modal`), icon `lucide-react`, TypeScript chặt, mọi lời gọi API qua `lib/api/client.ts`.
