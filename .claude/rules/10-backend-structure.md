# 10 – Chuẩn cấu trúc Backend

Kiểu kiến trúc: **Clean Architecture 4 project, tổ chức theo tính năng, CQRS bằng MediatR.** Không gọi là "Modular Monolith" (module không tách thành project riêng).

## Hướng phụ thuộc
`API → Application → Domain`; `Infrastructure → Application, Domain`. Application không tham chiếu Infrastructure.

## Cây thư mục
```
StockFlow.Domain/
  Entities/                         một lớp một bảng (Mst*, Trx*, Dtl*, Sec*, Jnc*)
                                    + hằng trạng thái (TransferStatus.cs)
                                    + phương thức chuyển trạng thái ở file partial (TrxStockTransfer.Status.cs)
  Services/                         chính sách thuần (CostingPolicy – giá vốn MAC)
StockFlow.Application/
  Common/                           Result, interface dùng chung
  Common/Inventory/                 InventoryLedger (IInventoryLedger): cập nhật tồn + thẻ kho
  Behaviors/                        ValidationBehavior
  Features/<Module>/
    Commands/  Queries/  DTOs/
    Helpers/ (hoặc Services/)       logic dùng lại trong module
StockFlow.Infrastructure/Persistence  DbContext, migration, seeder
StockFlow.Infrastructure/Services     CurrentUser, Jwt, mã chứng từ, quyền
StockFlow.API/Controllers  Authorization  Middleware
```

## Quy ước
1. Command/Query là `record`; handler cùng file với record của nó. Tên file trùng tên lớp (`CreateXxxCommand.cs`).
   - Ngoại lệ: một lớp handler cài nhiều `IRequestHandler` và dùng chung hàm private (vd `PurchaseOrderCommandHandler`, `StocktakeCommandHandler`) thì giữ một file, tên file theo nhóm (`PurchaseOrderCommands.cs`, `StocktakeQueries.cs`). Code mới không viết theo kiểu này.
   - Lớp phụ trợ dùng chung trong module (vd `SalesReturnOps`, `CustomerReceiptLookup`) đặt file riêng cùng tên lớp, hoặc trong `Helpers/`.
2. Handler dùng `IStockFlowDbContext` và dịch vụ trong Application; không gọi trực tiếp lớp của Infrastructure.
   - `IStockFlowDbContext` đóng vai Repository + Unit of Work (`DbSet`, `SaveChangesAsync`, `BeginTransactionAsync`). Không viết lớp Repository/UnitOfWork riêng (xem mục 11).
   - **Domain** chỉ chứa code thuần, không DbContext, không đọc giờ, không EF: Entities, hằng trạng thái, phương thức `Can*()`/`Mark*()` (chỉ kiểm điều kiện và gán `Status`, đặt trong file `partial` riêng để không sửa file entity kiểu scaffold), chính sách thuần trong `Domain/Services`. Handler gọi `Can*()` rồi tự trả thông báo lỗi, sau đó gọi `Mark*()`.
   - Luật cần truy cập DB (kiểm tồn, ghi thẻ kho, quyền kho, mã chứng từ, thời gian) ở lại handler, `Helpers/` hoặc `IInventoryLedger`. `InventoryLedger` đặt ở `Application/Common/Inventory` vì nó đọc/ghi DB; công thức giá vốn nó dùng là `Domain/Services/CostingPolicy`.
3. Transaction chỉ qua `IStockFlowDbContext.BeginTransactionAsync`; không ép kiểu về `DbContext`.
4. Mọi biến động tồn kho: cập nhật `trx_inventory_balances` **và** thêm một dòng `trx_inventory_transactions` (loại, reference_type/reference_id, created_by).
5. Mã chứng từ lấy từ sequence PostgreSQL qua `ITransactionCodeGenerator`; không tự lấy max rồi cộng.
6. Controller mỏng: tạo Command/Query → `_mediator.Send` → map `IsSuccess` sang `Ok` hoặc `BadRequest(new { message })`.
7. Mỗi action khai `[RequirePermission("MODULE_ACTION")]` (và `[RequireFeature]` nếu theo menu). Quyền kho kiểm trong handler qua `ICurrentUserService.HasWarehouseAccessAsync`. Dùng `ICurrentUserService.UserId` cho `CreatedBy`, không viết cứng.
8. Validator dùng FluentValidation, chạy qua `ValidationBehavior`.
9. Thêm bảng mới cần đủ 3 nơi: `DbSet` trong `IStockFlowDbContext`, trong `StockFlowDbContext`, và migration. Cột đặt tên snake_case bằng `HasColumnName`.
10. Thời gian lưu giờ Việt Nam (`VietnamTime`); tiền chưa gồm VAT.
11. Không có `Repositories`/`UnitOfWork`. Không tạo lại.
