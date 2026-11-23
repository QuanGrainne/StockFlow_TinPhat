# Integration Test – Báo cáo triển khai

> Ngày: 23/11/2026. Code: nhánh feature/integration-test (tách từ feature/qa-unit-test 98946ff; cùng cây mã với origin/dev a5cc470).

## 1. Project và file

Project mới `StockFlow_Backend/StockFlow.IntegrationTests` (đã thêm vào `StockFlow.sln`), đặt cạnh `StockFlow.UnitTests` (giữ cấu trúc hiện có, không sửa project unit test).

| File | Dòng | Số test |
|---|---|---|
| `appsettings.IntegrationTest.local.json.example` | 9 |  |
| `AssemblyInfo.cs` | 20 |  |
| `Authorization/AccountAdminSettingsTests.cs` | 413 | 27 |
| `Authorization/ApiSecurityTests.cs` | 346 | 20 |
| `Finance/FinanceAndCreditTests.cs` | 478 | 24 |
| `Infrastructure/Checks.cs` | 103 |  |
| `Infrastructure/DatabaseGuard.cs` | 49 |  |
| `Infrastructure/FaultInjection.cs` | 79 |  |
| `Infrastructure/IntegrationTestBase.cs` | 160 |  |
| `Infrastructure/IntegrationTestFixture.cs` | 180 |  |
| `Infrastructure/IntegrationTestSettings.cs` | 75 |  |
| `Infrastructure/PostgresTestDatabase.cs` | 100 |  |
| `Infrastructure/ServerLogSink.cs` | 55 |  |
| `Infrastructure/StockFlowApiFactory.cs` | 87 |  |
| `Infrastructure/TestDataSeeder.cs` | 225 |  |
| `Inventory/Disposals/InventoryDisposalTests.cs` | 141 | 7 |
| `Inventory/InventoryTestBase.cs` | 117 |  |
| `Inventory/Stocktakes/ActiveStocktakeBlocksMovesTests.cs` | 173 | 10 |
| `Inventory/Stocktakes/StocktakeTests.cs` | 288 | 16 |
| `Inventory/Transfers/ConcurrentTransferTests.cs` | 94 | 3 |
| `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | 236 | 13 |
| `Inventory/Transfers/TransferReceiptQuantityTests.cs` | 186 | 11 |
| `Inventory/Transfers/TwoStepTransferTests.cs` | 161 | 8 |
| `MasterData/ProductAndPriceBookTests.cs` | 348 | 19 |
| `Production/ProductionTests.cs` | 487 | 24 |
| `Purchasing/PurchasingTests.cs` | 357 | 18 |
| `Sales/Bookings/BookingToInvoiceTests.cs` | 184 | 8 |
| `Sales/Bookings/MergeSalesBookingsTests.cs` | 148 | 6 |
| `Sales/Bookings/SalesBookingDepositTests.cs` | 161 | 7 |
| `Sales/Pos/PosCashSaleTests.cs` | 174 | 7 |
| `Sales/Pos/PosDebtSaleTests.cs` | 129 | 6 |
| `Sales/Pos/PosStockPolicyTests.cs` | 118 | 5 |
| `Sales/Returns/SalesReturnRefundTests.cs` | 207 | 8 |
| `Sales/SalesTestBase.cs` | 146 |  |
| `StockFlow.IntegrationTests.csproj` | 37 |  |
| `Warehouse/WarehouseIsolationTests.cs` | 290 | 14 |

File khác: `.gitignore` (thêm `**/appsettings.IntegrationTest.local.json`), `StockFlow.sln` (thêm project). File `appsettings.IntegrationTest.local.json` chứa thông tin kết nối của máy chạy test, nằm trong .gitignore, không commit.

## 2. Package

| Package | Phiên bản | Lý do |
|---|---|---|
| Microsoft.NET.Test.Sdk, xunit, xunit.runner.visualstudio | 17.14.1 / 2.9.3 / 3.1.5 | Cùng phiên bản với StockFlow.UnitTests |
| Microsoft.AspNetCore.Mvc.Testing | 9.0.10 | **Mới** – WebApplicationFactory / TestServer chạy API thật trong tiến trình test; 9.0.10 khớp JwtBearer và EF Core của dự án |
| Microsoft.EntityFrameworkCore.Relational | 9.0.10 | Ghim cùng bản Infrastructure (tránh MSB3277), như StockFlow.UnitTests |

Không dùng Testcontainers (máy không có Docker / WSL – đã thống nhất dùng PostgreSQL cục bộ) và không dùng Respawn (dọn dữ liệu bằng database mẫu).

## 3. Môi trường và cơ chế

- **Database:** PostgreSQL 18 cục bộ, 2 database riêng `stockflow_integration_test` (API dùng khi chạy) và `stockflow_integration_test_template` (bản mẫu). Tạo cùng encoding / collation với template1 (UTF8, English_United States.1252).
- **Kết nối:** biến môi trường `STOCKFLOW_IT_PG` hoặc file `appsettings.IntegrationTest.local.json` (mẫu: `.example`); phần Database trong chuỗi bị bỏ, test luôn dùng database của mình.
- **Hàng rào:** `DatabaseGuard` chỉ cho tạo / xoá / kết nối database có tiền tố `stockflow_integration_test`; `DatabaseGuardInterceptor` chặn mọi kết nối EF Core của API tới database khác (kể cả lúc Program.cs tự migrate), vì `appsettings.json` đã commit đang trỏ `stockflow_dev`.
- **Khởi tạo một lần:** tạo database rỗng → WebApplicationFactory khởi động API thật (Program.cs chạy 51 migration + DatabaseSeeder) → kiểm 51/51 migration, không còn migration chờ, `HasPendingModelChanges() = false`, 56 bảng schema stockflow → TestDataSeeder → chụp bản mẫu (`CREATE DATABASE … TEMPLATE … STRATEGY FILE_COPY`).
- **Dọn dữ liệu:** trước mỗi test, database chạy test bị xoá (`DROP … WITH (FORCE)`) và tạo lại từ bản mẫu → mọi test bắt đầu từ cùng dữ liệu, không phụ thuộc thứ tự, chạy riêng từng test được, chạy lại nhiều lần được. API dùng `Pooling=false`. Test chạy tuần tự.
- **Dữ liệu test (TestDataSeeder):** vai trò test (IT_SALES, IT_OPS, IT_STOCK_READ, IT_NO_STOCKTAKE, IT_STOCK_X / Y, IT_TRANSFER, IT_PLANNER) lưu như màn Phân quyền chức năng; 14 tài khoản theo Precondition (User A/B/C theo kho, chỉ xem, 2 vai trò, bị khóa, người lập kế hoạch…); hàng P-TEST, P-TEST2, P-OTHER, P-A/B/C, FG-01/02, RM-01/02; khách KH-HM01 "Công ty Hoa Mai", KH-ABC, KH-ZERO; NCC-01. Tồn kho / công nợ do từng test đặt; chứng từ trong Arrange lập bằng API thật.
- **Ranh giới ngoài:** payOS thay bằng bản "chưa cấu hình" (không gọi mạng); ảnh hàng hóa lưu thư mục tạm.
- **Đăng nhập:** JWT thật qua POST /api/auth/login (token dùng lại trong lượt chạy); token hết hạn / sửa chữ ký tạo bằng khóa của API trong test.
- **Rollback:** `FaultInjector` (SaveChangesInterceptor gắn vào DbContext thật) ném lỗi đúng một lần giữa luồng ghi nhiều bước để kiểm tra transaction trên PostgreSQL – không mock DbContext.
- **Công tắc Npgsql:** `TestProcessSetup` (ModuleInitializer) bật `Npgsql.EnableLegacyTimestampBehavior` như dòng đầu Program.cs, trước mọi lần dùng Npgsql của test (nếu không, API trong test chạy khác môi trường thật – xem Execution Report).
- **Bằng chứng:** mỗi test ghi `PASS/FAIL | điểm | Expected | Actual`, request / response HTTP và log lỗi của API (`SERVER | …`) vào TRX.

## 4. Test Case đã triển khai

| # | Chức năng | Người | TC | File test |
|---|---|---|---|---|
| 1 | Product Stock Adjustment & Stock Card | DatTD | 6 | `MasterData/ProductAndPriceBookTests.cs` |
| 2 | Product Import from Excel | DatTD | 5 | `MasterData/ProductAndPriceBookTests.cs` |
| 3 | Price Book & Formula Applied to POS | DatTD | 6 | `MasterData/ProductAndPriceBookTests.cs` |
| 4 | Customer Receipts & Debt Ledger | DatTD | 6 | `Finance/FinanceAndCreditTests.cs` |
| 5 | Supplier Payments & Payable | DatTD | 5 | `Finance/FinanceAndCreditTests.cs` |
| 6 | Credit Limit Request & Approval | DatTD | 7 | `Finance/FinanceAndCreditTests.cs` |
| 7 | Credit Limit Settings & History | DatTD | 5 | `Finance/FinanceAndCreditTests.cs` |
| 8 | POS Cash Sale & Stock Ledger | NinhHQ | 6 | `Sales/Pos/PosCashSaleTests.cs` |
| 9 | POS Debt Sale & Credit Limit | NinhHQ | 6 | `Sales/Pos/PosDebtSaleTests.cs` |
| 10 | POS Stock Policy & Reserved Stock | NinhHQ | 5 | `Sales/Pos/PosStockPolicyTests.cs` |
| 11 | Sales Booking & Deposit | NinhHQ | 6 | `Sales/Bookings/SalesBookingDepositTests.cs` |
| 12 | Merge Sales Bookings | NinhHQ | 5 | `Sales/Bookings/MergeSalesBookingsTests.cs` |
| 13 | Booking to Delivery Invoice | NinhHQ | 5 | `Sales/Bookings/BookingToInvoiceTests.cs` |
| 14 | Sales Returns & Refund | NinhHQ | 7 | `Sales/Returns/SalesReturnRefundTests.cs` |
| 15 | Two-Step Stock Transfer (UC-37, BR-40) | LucDT | 8 | `Inventory/Transfers/TwoStepTransferTests.cs` |
| 16 | Transfer Short Receipt (UC-38, BR-41) | LucDT | 7 | `Inventory/Transfers/TransferReceiptQuantityTests.cs` |
| 17 | Transfer Over Receipt (UC-37, BR-40) | LucDT | 4 | `Inventory/Transfers/TransferReceiptQuantityTests.cs` |
| 18 | Transfer Dispatch Over Stock (team decision 10/11/2026) | LucDT | 5 (1 Skip E2E) | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` |
| 19 | Cancel Transfer By Status (UC-37) | LucDT | 8 | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` |
| 20 | Concurrent Transfer Receipt (UC-37) | LucDT | 3 | `Inventory/Transfers/ConcurrentTransferTests.cs` |
| 21 | Stocktake Balance (UC-39, UC-40) | LucDT | 10 | `Inventory/Stocktakes/StocktakeTests.cs` |
| 22 | Cancel Balanced Stocktake (UC-39) | LucDT | 6 | `Inventory/Stocktakes/StocktakeTests.cs` |
| 23 | Active Stocktake Blocks Moves (BR-42) | LucDT | 10 | `Inventory/Stocktakes/ActiveStocktakeBlocksMovesTests.cs` |
| 24 | API Authentication (BR-02) | LucDT | 7 | `Authorization/ApiSecurityTests.cs` |
| 25 | Role-Based Authorization (BR-02, BR-03) | LucDT | 7 | `Authorization/ApiSecurityTests.cs` |
| 26 | Immediate Access Revocation (BR-02) | LucDT | 6 | `Authorization/ApiSecurityTests.cs` |
| 27 | Warehouse Data Isolation (BR-04, team decision 10/11/2026) | LucDT | 7 | `Warehouse/WarehouseIsolationTests.cs` |
| 28 | Revoked Warehouse Access (team decision 10/11/2026) | LucDT | 7 | `Warehouse/WarehouseIsolationTests.cs` |
| 29 | Inventory Disposal | LucDT | 7 | `Inventory/Disposals/InventoryDisposalTests.cs` |
| 30 | Purchase Order to Goods Receipt & MAC | TamDM | 6 | `Purchasing/PurchasingTests.cs` |
| 31 | Goods Receipt Draft, Complete & Cancel | TamDM | 6 | `Purchasing/PurchasingTests.cs` |
| 32 | Supplier Return & Refund | TamDM | 6 | `Purchasing/PurchasingTests.cs` |
| 33 | BOM Lifecycle | TamDM | 6 | `Production/ProductionTests.cs` |
| 34 | Production Plan Approval | TamDM | 7 | `Production/ProductionTests.cs` |
| 35 | Production Order & Material Issue | TamDM | 6 | `Production/ProductionTests.cs` |
| 36 | Finished Goods Receipt & Order Completion | TamDM | 5 | `Production/ProductionTests.cs` |
| 37 | Login & JWT Session | QuanDN | 6 (2 Skip E2E) | `Authorization/AccountAdminSettingsTests.cs` |
| 38 | Change Password | QuanDN | 5 | `Authorization/AccountAdminSettingsTests.cs` |
| 39 | Staff Accounts & Roles | QuanDN | 6 | `Authorization/AccountAdminSettingsTests.cs` |
| 40 | Role Permission Matrix Enforcement | QuanDN | 5 | `Authorization/AccountAdminSettingsTests.cs` |
| 41 | Order Settings Affect Sales | QuanDN | 5 | `Authorization/AccountAdminSettingsTests.cs` |
| | Ca bổ sung | NinhHQ | 10 | (trong các file trên, tên có "(Bổ sung)") |

**Chạy:** `dotnet test StockFlow_Backend/StockFlow.IntegrationTests` (toàn bộ) hoặc `--filter "FullyQualifiedName~PosCashSaleTests"` (một lớp) / `--filter "FullyQualifiedName~INT_POS_08_01"` (một ca).
