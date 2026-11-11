# 10 – Chuẩn cấu trúc Backend

Kiểu kiến trúc: **Clean Architecture 4 project, tổ chức theo tính năng, CQRS bằng MediatR.** Không gọi là "Modular Monolith" (module không tách thành project riêng).

## Hướng phụ thuộc
`API → Application → Domain`; `Infrastructure → Application, Domain`. Application không tham chiếu Infrastructure.

## Cây thư mục
```
StockFlow.Domain/Entities           một lớp một bảng (Mst*, Trx*, Dtl*, Sec*, Jnc*)
StockFlow.Application/
  Common/                           Result, interface dùng chung
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
2. Handler dùng `IStockFlowDbContext` và dịch vụ trong Application; không gọi trực tiếp lớp của Infrastructure.
3. Transaction chỉ qua `IStockFlowDbContext.BeginTransactionAsync`; không ép kiểu về `DbContext`.
4. Mọi biến động tồn kho: cập nhật `trx_inventory_balances` **và** thêm một dòng `trx_inventory_transactions` (loại, reference_type/reference_id, created_by).
5. Mã chứng từ lấy từ sequence PostgreSQL qua `ITransactionCodeGenerator`; không tự lấy max rồi cộng.
6. Controller mỏng: tạo Command/Query → `_mediator.Send` → map `IsSuccess` sang `Ok` hoặc `BadRequest(new { message })`.
7. Mỗi action khai `[RequirePermission("MODULE_ACTION")]` (và `[RequireFeature]` nếu theo menu). Quyền kho kiểm trong handler qua `ICurrentUserService.HasWarehouseAccessAsync`. Dùng `ICurrentUserService.UserId` cho `CreatedBy`, không viết cứng.
8. Validator dùng FluentValidation, chạy qua `ValidationBehavior`.
9. Thêm bảng mới cần đủ 3 nơi: `DbSet` trong `IStockFlowDbContext`, trong `StockFlowDbContext`, và migration. Cột đặt tên snake_case bằng `HasColumnName`.
10. Thời gian lưu giờ Việt Nam (`VietnamTime`); tiền chưa gồm VAT.
11. Không có `Repositories`/`UnitOfWork`. Không tạo lại.
