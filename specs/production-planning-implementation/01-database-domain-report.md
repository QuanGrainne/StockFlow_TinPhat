# 01 — Báo cáo Phase 1: Database và Domain

- **Ngày:** 15/11/2026. **Nhánh:** `feature/production-planning` (chưa commit).
- **Thiết kế áp dụng:** phương án A ở `specs/production-planning-analysis/07-erd-gap-analysis.md` (mỗi thành phẩm một dòng trong một kế hoạch; không thêm `production_plan_item_id`), đã chốt ngày 14/11/2026.

## 1. Kết quả kiểm tra cấu trúc hiện có

| Đối tượng | Kiểm tra | Kết quả |
|---|---|---|
| `trx_production_plans` | PK, `uq_trx_production_plans_code`, FK `created_by` / `approved_by` → `sec_users`, kiểu cột, nullable | Đúng thiết kế. Không cần sửa |
| `dtl_production_plan_items` | PK, FK `production_plan_id` / `product_id` / `warehouse_id`, `numeric(18,2)`, `date` | Đúng thiết kế. Không có unique (kế hoạch, thành phẩm): quy tắc BR-PP-06 kiểm ở validator (Phase 2) |
| `trx_production_orders.production_plan_id` | Cho phép rỗng, FK không xóa dây chuyền | Đúng. Lệnh cũ không có kế hoạch giữ `NULL` |
| Entity `TrxProductionPlan`, `DtlProductionPlanItem`, navigation trên `TrxProductionOrder` | So với `StockFlowDbContext.OnModelCreating` | Khớp |
| Model EF so với snapshot | Chạy `dotnet ef migrations add` | Migration sinh ra có `Up`/`Down` rỗng → **không có thay đổi model bị sót** |

### Liên kết lệnh với dòng kế hoạch

Không thêm `production_plan_item_id`. Với quy tắc mỗi thành phẩm một dòng, cặp (`production_plan_id`, `product_id` của dòng lệnh) xác định duy nhất dòng kế hoạch, nên số đã lập lệnh và số còn lại tính được chính xác theo từng dòng. Nếu sau này cho phép nhiều đợt cùng thành phẩm thì cần phương án B ở file 07 (cần phê duyệt riêng).

## 2. Thay đổi đã làm

| File | Nội dung |
|---|---|
| `StockFlow.Domain/Entities/ProductionPlanStatus.cs` (mới) | Hằng trạng thái `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CLOSED`, `CANCELLED` |
| `StockFlow.Domain/Entities/TrxProductionPlan.Status.cs` (mới, partial) | `CanEditAll`, `CanEditLimited`, `CanSubmit`, `CanApprove`, `CanReject`, `CanCancel`, `CanClose`, `CanCreateOrder`; `MarkPendingApproval`, `MarkApproved`, `MarkRejected`, `MarkClosed`, `MarkCancelled`. Chỉ kiểm điều kiện và gán `Status`, không đọc DB, không đọc giờ |
| `StockFlow.Infrastructure/Persistence/Migrations/20261114153305_AddProductionPlanCodeSequence.cs` + `.Designer.cs` (mới) | `CREATE SEQUENCE IF NOT EXISTS stockflow.seq_production_plan_code START 1`; `Down` xóa sequence |
| `StockFlow.Infrastructure/Services/TransactionCodeGenerator.cs` | Loại chứng từ `PRODUCTION_PLAN`, tiền tố `KHSX`, sequence `seq_production_plan_code` |

Không thêm bảng, cột, index. Không sửa migration cũ, snapshot, seed hay appsettings. File snapshot bị `dotnet ef` ghi lại chỉ khác ký tự BOM đầu file nên đã hoàn tác.

## 3. Kiểm tra

Chạy trên DB tạm `stockflow_verify_pp` (tạo mới, xóa sau khi xong; không động tới `stockflow_dev`).

| # | Bước | Kết quả |
|---|---|---|
| 1 | `dotnet ef database update` từ DB trống tới migration mới nhất | Đạt; sequence `seq_production_plan_code` tồn tại |
| 2 | `dotnet ef database update AddDisposalCreatedBy` (chạy `Down`) | Đạt; sequence bị xóa (đếm = 0) |
| 3 | `dotnet ef database update` lại | Đạt; sequence có lại (đếm = 1); bảng kế hoạch nguyên vẹn |
| 4 | `dotnet build StockFlow.sln` | 0 lỗi, 0 cảnh báo (bằng đường cơ sở) |
| 5 | Sinh mã khi chạy API (Phase 2) | Kế hoạch đầu tiên có mã `KHSX00001`, các kế hoạch sau tăng dần |

## 4. Ảnh hưởng chức năng cũ

Không có. Sequence mới không được dùng bởi chứng từ nào khác; lệnh sản xuất cũ không bị đổi. Hồi quy lập / sửa lệnh trực tiếp đã chạy ở Phase 2 (PP-53, PP-54).

## 5. Tự kiểm

- **(a) Giả định:** tiền tố `KHSX` chưa có trong Thiết lập đơn hàng (`mst_order_settings`) nên đặt cứng giống `LSX`, `NTP`.
- **(b) Cần hỏi nhóm:** có muốn cho cấu hình tiền tố mã kế hoạch trong Thiết lập đơn hàng không (sẽ cần cột mới).
- **(c) Chỗ không chắc:** không có.
- **(d) UC/BR:** UC-PP-02 (sinh mã), BR-PP-01; trạng thái theo file 06 mục 1.
