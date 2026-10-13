# 🤖 QUY TẮC PHÁT TRIỂN DỰ ÁN CHO AI & DEVELOPER (STOCKFLOW)

> **Mục đích:** Tài liệu này là "kim chỉ nam" bắt buộc dành cho mọi Developer và Công cụ AI (Cursor, ChatGPT, GitHub Copilot, Antigravity, Claude...) tham gia phát triển dự án **StockFlow - Hệ thống Quản lý Đơn hàng & Tồn kho Công ty Tín Phát**.
> Mọi code được sinh ra phải tuân thủ nghiêm ngặt các nguyên tắc dưới đây để đảm bảo tính đồng bộ, sạch đẹp và kiến trúc không bị phá vỡ.

---

## 1. 🛠️ TỔNG QUAN CÔNG NGHỆ (TECH STACK)

| Thành phần | Công nghệ | Phiên bản / Chi tiết |
|---|---|---|
| **Backend** | ASP.NET Core Web API | **.NET 9 (`net9.0`)**, C# 13 |
| **ORM / Data** | Entity Framework Core | **EF Core 9.x**, Provider: **Npgsql 9.x** |
| **Database** | PostgreSQL | Schema: `stockflow` (Cổng 5432) |
| **Pattern BE** | Modular Monolith / Clean Architecture | **CQRS + MediatR**, FluentValidation, Result Pattern |
| **Frontend** | Next.js (App Router) | **Next.js 15**, React 19, TypeScript |
| **Styling** | Tailwind CSS | Responsive, Clean Dashboard UI |
| **Auth** | JWT Bearer Authentication | Token lưu `localStorage`, Header `Authorization: Bearer <token>` |

---

## 2. 🏛️ NGUYÊN TẮC KIẾN TRÚC BACKEND (CLEAN ARCHITECTURE)

Hệ thống backend được chia thành **4 tầng độc lập**. AI và lập trình viên **TUYỆT ĐỐI KHÔNG** phá vỡ chiều phụ thuộc:

```
StockFlow.API  ──►  StockFlow.Application  ──►  StockFlow.Domain
     │                                                ▲
     ▼                                                │
StockFlow.Infrastructure ──────────────────────────────┘
```

### 🔹 Layer 1: `StockFlow.Domain` (Trọng tâm nghiệp vụ)
- **Chứa:** Entities, Enums, Value Objects, Domain Exceptions, Repository Interfaces (`IRepository<T>`, `IUnitOfWork`).
- **Nguyên tắc vàng:** 
  - KHÔNG tham chiếu tới bất kỳ dự án nào khác.
  - KHÔNG cài thêm NuGet package bên ngoài (trừ package ngôn ngữ C#).
  - Mọi Entity mới phải đặt tại `StockFlow.Domain.Entities`.

### 🔹 Layer 2: `StockFlow.Application` (Điều phối use case - CQRS)
- **Chứa:** Commands, Queries, Handlers (MediatR), DTOs, Validators (FluentValidation), Mapping.
- **Nguyên tắc vàng:**
  - Chỉ tham chiếu `StockFlow.Domain`.
  - Mọi xử lý nghiệp vụ đi qua MediatR Handler, KHÔNG viết logic trong Controller.
  - Mọi Command/Query Handler phải trả về `Result<T>` hoặc `Result` (đã định nghĩa tại `StockFlow.Application.Common.Result`).
  - Request validation bắt buộc dùng **FluentValidation** (tự động kích hoạt qua `ValidationBehavior`).

### 🔹 Layer 3: `StockFlow.Infrastructure` (Hạ tầng & Dữ liệu)
- **Chứa:** `StockFlowDbContext`, Repository implementations, Migrations, dịch vụ bên thứ 3 (Email, File storage...).
- **Nguyên tắc vàng:**
  - Schema database bắt buộc là **`stockflow`** (`modelBuilder.HasDefaultSchema("stockflow")`).
  - **KHÔNG sửa tay trực tiếp cấu trúc DB bằng lệnh SQL**. Mọi thay đổi bảng phải thông qua lệnh EF Core Migration:
    ```bash
    dotnet ef migrations add <TenMigration> --project StockFlow.Infrastructure --startup-project StockFlow.API --output-dir Persistence/Migrations
    ```
  - Cấu hình Entity dùng **Fluent API** trong `OnModelCreating`, không lạm dụng Data Annotations trong Entity.

### 🔹 Layer 4: `StockFlow.API` (Cổng giao tiếp HTTP)
- **Chứa:** Controllers, Middlewares, Dependency Injection, Swagger.
- **Nguyên tắc vàng:**
  - Controller phải mỏng (Thin Controller): Chỉ nhận Request -> Gửi qua `_mediator.Send()` -> Kiểm tra `result.IsSuccess` -> Trả về `Ok()` hoặc `BadRequest()`.
  - Bắt lỗi tập trung qua `ExceptionHandlingMiddleware`, không dùng try-catch tràn lan trong action của Controller.

---

## 3. ⚠️ NGUYÊN TẮC QUAN TRỌNG VỀ GÓI NUGET (.NET 9)
> [!WARNING]
> Máy cài .NET 10 SDK preview có thể tự động tải gói NuGet v10.x gây xung đột với dự án .NET 9!
> **Quy tắc:** Khi thêm bất kỳ package nào, **BẮT BUỘC ghim phiên bản v9.x**:
> - `dotnet add package Microsoft.EntityFrameworkCore.* --version 9.0.x`
> - `dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 9.0.x`

---

## 4. 💻 NGUYÊN TẮC PHÁT TRIỂN FRONTEND (NEXT.JS & REACT)

### Cấu trúc thư mục chuẩn:
- `src/app/(auth)/login`: Trang đăng nhập.
- `src/app/(dashboard)/`: Các trang quản trị (`/dashboard`, `/products`, `/inventory`, `/orders`, `/warehouses`, `/reports`...).
- `src/features/[ten_tinh_nang]/`: Components, hooks, types riêng cho từng phân hệ (vd: `features/bom/`, `features/products/`, `features/warehouses/`).
- `src/lib/api/client.ts`: Client gọi API tập trung (đã tích hợp tự động đính kèm JWT Bearer Token).
- `src/lib/auth/AuthContext.tsx`: Quản lý trạng thái đăng nhập toàn cục.

### Quy tắc Code Frontend:
1. **TypeScript 100%:** Luôn định nghĩa `interface` / `type` rõ ràng. **Nghiêm cấm dùng `any`**.
2. **Ngôn ngữ hiển thị:** Giao diện người dùng (tiêu đề, nút bấm, thông báo, modal, bảng) phải sử dụng **Tiếng Việt chuẩn mực** theo thuật ngữ kho vận (vd: *Nhập kho, Xuất kho, Chuyển kho, Kiểm kê, Định mức BOM, Nguyên vật liệu, Thành phẩm*).
3. **Thẩm mỹ & UX:**
   - Sử dụng bảng (table) rõ ràng, có phân trang, tìm kiếm, lọc trạng thái (Badge màu: Hoàn thành, Chờ duyệt, Hủy...).
   - Mọi thao tác Thêm / Sửa / Xóa phải có xác nhận (Modal / Dialog) và thông báo Toast/Alert rõ ràng.
   - Tránh dùng nút hay bảng thô sơ mặc định.

---

## 5. 📋 QUY TẮC NGHIỆP VỤ CỐT LÕI (THEO REPORT 1 & REPORT 3)

1. **Phân quyền truy cập kho (`jnc_user_warehouse_access`):**
   - Nhân viên quản lý kho / thủ kho chỉ được phép xem, nhập, xuất và kiểm kê tại các kho mà họ được gán quyền truy cập (theo Report 1).
   - API và Frontend phải lọc dữ liệu kho theo danh sách kho được phân quyền của User đang đăng nhập.
2. **Định mức sản phẩm (BOM - `mst_boms` & `dtl_bom_items`):**
   - Khi tạo định mức sản phẩm, người dùng chọn 1 thành phẩm (`mst_products` với `product_type = 'FINISHED'`).
   - Sau đó chọn danh sách các nguyên vật liệu cấu thành (`product_type = 'RAW_MATERIAL'`) kèm số lượng định mức và tỉ lệ hao hụt (%) (theo Report 3).
3. **Quản lý Lô hàng (`mst_inventory_lots`):**
   - Hàng hóa nhập kho quản lý theo số Lô (Lot number), Ngày sản xuất (MFG), Hạn sử dụng (EXP).

---

## 6. 📝 MẪU PROMPT CHUẨN DÀNH CHO TEAM KHI RA LỆNH CHO AI

Khi bất kỳ ai trong team yêu cầu AI viết code cho một tính năng mới, hãy copy đoạn prompt mẫu này gửi kèm:

```markdown
Bạn là Senior Full-Stack Engineer cho dự án StockFlow (Tin Phat Company).
Hãy đọc kỹ file AI_CODING_RULES.md tại thư mục gốc trước khi thực hiện.

Yêu cầu thực hiện tính năng: [TÊN TÍNH NĂNG, VÍ DỤ: CRUD Định Mức Sản Phẩm BOM]

Tuân thủ nghiêm ngặt:
1. Backend: 
   - Đặt Entity/Interface tại StockFlow.Domain.
   - Viết Command/Query/Handler/Validator (MediatR + FluentValidation) tại StockFlow.Application, trả về Result<T>.
   - Cấu hình EF Core DbContext/Repository tại StockFlow.Infrastructure (schema stockflow).
   - Controller mỏng tại StockFlow.API.
   - Các gói NuGet phải ở phiên bản .NET 9.x.
2. Frontend:
   - Viết component trong src/features/... và trang trong src/app/(dashboard)/...
   - Dùng client.ts có JWT token.
   - 100% TypeScript (không any).
   - Giao diện Tiếng Việt chuyên nghiệp, Tailwind CSS hiện đại.
3. Nghiệp vụ: Tuân thủ đúng đặc tả trong Report 1 và Report 3.
```
