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
| **Pattern BE** | Clean Architecture (CQRS theo tính năng) | **CQRS + MediatR**, FluentValidation, Result Pattern |
| **Frontend** | Next.js (App Router) | **Next.js 16**, React 19, TypeScript |
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
- **Chứa:** Entities, Enums, Value Objects, Domain Exceptions.
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

## 5. 🎨 QUY TẮC UI/UX FRONTEND (CHUẨN THEO MODULE HÀNG HÓA)

> **Bắt buộc:** Mọi màn hình dashboard mới phải nhất quán 100% với module Hàng hóa đã hoàn thiện.
> Đây là module gốc (reference) để các thành viên còn lại căn chỉnh giao diện.

---

### 5.1 🎨 Design Tokens — Màu sắc & Typography

| Token | Giá trị | Dùng cho |
|-------|---------|----------|
| **Brand Blue** | `#0071BA` | Nút Primary, link active, icon chính, badge đã nhập |
| **Brand Blue Hover** | `#005f9d` | Hover state của nút Primary |
| **Page BG** | `#f7f9fa` | Nền ngoài cùng của mọi trang dashboard |
| **Table Area BG** | `#f8fafc` | Khu vực bảng bên trong main content |
| **White** | `#ffffff` | Card, sidebar, toolbar, modal |
| **Border** | `#e5e7eb` | Đường kẻ phân vùng, viền bảng |
| **Text Primary** | `#262626` | Nội dung chính, tiêu đề |
| **Text Secondary** | `#595959` | Mã hàng, dữ liệu phụ |
| **Text Muted** | `#8c8c8c` | Nhãn phụ, placeholder, timestamp |
| **Table Header BG** | `#e8f2ff` | Background `<thead>` trong Ant Design Table |
| **Table Header Text** | `#334155` | Chữ trong `<thead>`, `font-size: 12px`, `font-weight: 600` |
| **Status Green** | `color="success"` (Ant Tag) | Trạng thái: Đã nhập hàng, Đang kinh doanh, Hoàn thành |
| **Status Red** | `text-rose-600`, `bg-rose-50/40` | Hết hàng, Hủy |
| **Status Amber** | `text-amber-600`, `bg-[#fffbe6]` | Dưới định mức tồn, Phiếu tạm |
| **Font** | Geist Sans (hệ thống), Arial fallback | Toàn trang |

---

### 5.2 📐 Layout Tổng Thể

```
┌─────────────────────────────────────────────────────────┐
│  Navbar (sticky, h-14, bg-[#0071BA])                    │
├──────────────┬──────────────────────────────────────────┤
│  Left        │  Main Content                            │
│  Sidebar     │  ┌─────────────────────────────────┐     │
│  (w-[260px]) │  │ Toolbar / Action Bar             │     │
│  bg-white    │  │ (border-b, px-6 py-3.5)          │     │
│  border-r    │  ├─────────────────────────────────┤     │
│              │  │ Search + Summary Bar             │     │
│              │  │ (px-5, py-3.5)                   │     │
│              │  ├─────────────────────────────────┤     │
│              │  │ Table Area (bg-[#f8fafc], p-5)  │     │
│              │  │  └─ Ant Design Table             │     │
│              │  ├─────────────────────────────────┤     │
│              │  │ Pagination Footer                │     │
│              │  └─────────────────────────────────┘     │
└──────────────┴──────────────────────────────────────────┘
```

**Quy tắc bắt buộc:**
- Wrapper ngoài: `flex min-h-[calc(100vh-56px)]` — đảm bảo sidebar và main đầy chiều cao.
- Sidebar **chỉ hiện trên desktop** (`hidden lg:block`). Mobile dùng Drawer overlay (`fixed inset-0 z-50`).
- Main content: `min-w-0 flex-1 flex flex-col bg-white`.

---

### 5.3 🗂️ Left Filter Sidebar

**File tham chiếu:** [`ProductFilterSidebar.tsx`](StockFlow_Frontend/src/features/products/components/ProductFilterSidebar.tsx)

```tsx
// Wrapper chuẩn
<aside className="w-[260px] shrink-0 bg-white border-r border-[#e5e7eb] px-4 py-5 select-none text-[#262626] relative">
  <h2 className="text-[20px] font-bold text-slate-900 tracking-tight mb-5">
    {Tên module}
  </h2>
  {/* Các nhóm filter */}
</aside>
```

**Các thành phần filter chuẩn:**

| Thành phần | Pattern |
|-----------|---------|
| **Nhãn section** | `text-[13px] font-semibold text-slate-800` |
| **Dropdown trigger** | `h-[34px] px-3 border rounded-[6px] flex items-center justify-between text-[13px]` |
| **Dropdown active** | `border-blue-500 ring-2 ring-blue-100 shadow-xs` |
| **Dropdown inactive** | `border-slate-300 hover:border-slate-400` |
| **Radio button** | `w-4 h-4 rounded-full border` + dot `w-2 h-2 rounded-full bg-blue-600` |
| **Checkbox** | `<input type="checkbox" className="accent-[#0071BA]">` |
| **Clear icon** | `<X size={13} />` từ `lucide-react` |
| **Chevron** | `<ChevronDown/Up size={14} />` từ `lucide-react` |
| **Check selected** | `<Check size={14} className="text-blue-600 stroke-[2.5]" />` |

**Dropdown list item:**
```tsx
// Item bình thường
<div className="px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between text-slate-700 hover:bg-slate-50">

// Item đang chọn
<div className="px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between bg-blue-50 text-blue-700 font-medium">
```

---

### 5.4 🔧 Toolbar / Action Bar

```tsx
<div className="border-b border-[#e5e7eb] bg-white px-6 py-3.5">
  <div className="flex flex-wrap items-center justify-between gap-3">
    {/* Trái: Tiêu đề danh sách + số kết quả */}
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-slate-800">Danh sách {tên module}</span>
      <span className="text-xs text-slate-400">({count} kết quả)</span>
    </div>

    {/* Phải: Các nút hành động */}
    <div className="flex items-center gap-2">
      {/* Nút thứ cấp */}
      <Button icon={<CloudDownloadOutlined />}>Xuất file</Button>

      {/* Nút Primary chính */}
      <Button type="primary" icon={<PlusOutlined />}
        className="!bg-[#0071BA] hover:!bg-[#005f9d] font-medium">
        + {Tạo / Nhập hàng}
      </Button>
    </div>
  </div>
</div>
```

---

### 5.5 🔍 Search Bar

```tsx
// Ant Design Input — bắt buộc dùng cho search
<Input
  allowClear
  prefix={<SearchOutlined className="text-[#8c8c8c]" />}
  placeholder="Tìm theo mã ... hoặc tên ..."
  className="w-full sm:w-[380px] h-[36px] rounded-[6px]"
/>
```

**Đặt bên trái, tóm tắt số liệu đặt bên phải:**
```tsx
<div className="flex items-center gap-2 text-xs text-slate-500">
  <span>Tổng: <strong className="text-slate-800">{giá trị}</strong></span>
  <span>·</span>
  <span>Hiển thị <strong>{count}</strong> bản ghi</span>
</div>
```

---

### 5.6 📊 Ant Design Table

**File tham chiếu:** [`GoodsCatalogScreen.tsx`](StockFlow_Frontend/src/features/roles/components/common/GoodsCatalogScreen.tsx)

```tsx
// Wrapper Table
<div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-xs">
  <Table<T>
    className="stockflow-{module}-table"   // ví dụ: stockflow-purchases-table
    rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys, columnWidth: 48 }}
    columns={columns}
    dataSource={data}
    pagination={false}
    scroll={{ x: 1200 }}
    size="middle"
  />
</div>
```

**CSS bắt buộc thêm vào `globals.css` cho mỗi module table mới:**
```css
.stockflow-{module}-table .ant-table-thead > tr > th {
  background: #e8f2ff;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.stockflow-{module}-table .ant-table-thead > tr > th::before {
  display: none;
}
```

**Quy tắc cột:**
| Loại cột | Width | Render pattern |
|---------|-------|----------------|
| Mã (code/ID) | `140-160px` | `font-mono text-xs text-[#595959]`, màu link xanh `text-[#0071BA]` nếu clickable |
| Thời gian | `160px` | `text-xs text-[#8c8c8c]` |
| Nhà cung cấp / Tên | `auto / min 200px` | `text-sm text-[#262626]` |
| Số tiền | `align: 'right'`, `120-150px` | `font-medium text-[#262626]` |
| Trạng thái | `120px` | Ant Design `<Tag>` |
| Yêu thích | `42px` | `<StarOutlined/StarFilled>` toggle |

**Màu row theo trạng thái:**
```tsx
rowClassName={(record) =>
  record.status === 'canceled' ? 'bg-rose-50/40 hover:bg-rose-50/70'
  : record.status === 'pending' ? 'bg-[#fffbe6] hover:bg-amber-50/70'
  : ''
}
```

**Cột Trạng thái — Tag chuẩn:**
```tsx
// Đã nhập hàng / Hoàn thành
<Tag color="success">Đã nhập hàng</Tag>

// Phiếu tạm / Chờ duyệt
<Tag color="warning">Phiếu tạm</Tag>

// Đã hủy
<Tag color="error">Đã hủy</Tag>
```

---

### 5.7 📄 Pagination Footer

```tsx
<div className="flex flex-wrap items-center justify-between gap-3 px-1 py-4 mt-auto">
  {/* Trái: thông tin chọn row */}
  <div className="text-xs text-slate-500">
    {selectedRowKeys.length > 0
      ? `Đã chọn ${selectedRowKeys.length} bản ghi`
      : 'Chọn bản ghi để thao tác hàng loạt'}
  </div>

  {/* Phải: Ant Pagination */}
  <Pagination
    current={page}
    pageSize={pageSize}
    total={total}
    showSizeChanger
    showQuickJumper
    onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
    showTotal={(total, range) => `${range[0]}-${range[1]} trên ${total}`}
  />
</div>
```

---

### 5.8 🪟 Modal / Dialog

**File tham chiếu:** [`SupplierFormModal.tsx`](StockFlow_Frontend/src/features/suppliers/components/SupplierFormModal.tsx)

```tsx
// Overlay backdrop
<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
  role="dialog" aria-modal="true" aria-labelledby="modal-title">

  // Modal container
  <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">

    // Header
    <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
      <h2 id="modal-title" className="text-xl font-semibold text-slate-900">{Tiêu đề}</h2>
      <button onClick={onClose} className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <X size={20} />
      </button>
    </header>

    // Body (scrollable)
    <div className="overflow-y-auto flex-1">
      {/* Nội dung form */}
    </div>

    // Footer
    <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
      <button className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
        Bỏ qua
      </button>
      <button className="rounded bg-[#0071BA] px-5 py-2 text-sm font-semibold text-white hover:bg-[#005f9d]">
        Lưu
      </button>
    </footer>
  </div>
</div>
```

**Form bên trong Modal:**
```tsx
// Label field
<label className="mb-1.5 block text-[13px] font-medium text-slate-700">
  Tên trường <span className="ml-1 text-red-500">*</span>  {/* Nếu bắt buộc */}
</label>

// Text input
<input className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />

// Select input
<select className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />

// Collapsible Section trong Modal
<section className="border-b border-slate-200 px-6 py-4 last:border-b-0">
  <button className="flex w-full items-start justify-between text-left">
    <span className="block text-sm font-semibold text-slate-800">{Tiêu đề section}</span>
    <ChevronDown/Up size={18} className="mt-0.5 text-slate-500" />
  </button>
</section>
```

---

### 5.9 🧭 Navbar — Thêm menu item mới

**File tham chiếu:** [`Navbar.tsx`](StockFlow_Frontend/src/components/Navbar.tsx)

Khi thêm route mới, **chỉnh sửa mảng `NAV_ITEMS`**:
```tsx
const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', href: '/dashboard' },
  { label: 'Hàng hóa', href: '/products' },
  {
    label: 'Mua hàng',           // Label trên Navbar
    children: [
      { label: 'Nhập hàng', href: '/purchases' },
      { label: 'Trả hàng NCC', href: '/purchases/returns' },
    ]
  },
  // ...
];
```

Active link style: `bg-white/20 text-white` | Inactive: `text-white/85 hover:bg-white/15`

---

### 5.10 📦 Cấu trúc file mỗi module Frontend

Mỗi phân hệ mới phải theo đúng cấu trúc:

```
src/app/(dashboard)/{ten-module}/
├── page.tsx                    ← Entry: dùng dynamic() để lazy-load
└── {TenModule}Client.tsx       ← Toàn bộ UI logic (Client Component)

src/components/
└── {TenModule}FilterSidebar.tsx ← Filter sidebar riêng (nếu cần)
└── Create{TenModule}Modal.tsx   ← Modal tạo mới
```

**`page.tsx` chuẩn:**
```tsx
'use client';
import dynamic from 'next/dynamic';

const Client = dynamic(() => import('./{TenModule}Client'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#f7f9fa] text-sm text-[#8c8c8c]">
      Đang tải...
    </div>
  ),
});

export default function {TenModule}Page() {
  return <Client />;
}
```

---

### 5.11 ⚙️ Thư viện & Import quy chuẩn

| Thư viện | Dùng cho | Ghi chú |
|---------|---------|---------|
| `antd` | Table, Button, Input, Pagination, Tag, Modal | **Bắt buộc** cho table và nút |
| `@ant-design/icons` | Icon trong Ant components | `SearchOutlined`, `PlusOutlined`, `CloudDownloadOutlined`... |
| `lucide-react` | Icon trong custom UI | `ChevronDown`, `X`, `Check`, `Calendar`, `Filter`... |
| `next/dynamic` | Lazy-load Client page | Bắt buộc `ssr: false` cho trang có state |
| `next/navigation` | `usePathname`, `useRouter` | Route navigation |

**Không dùng:**
- ❌ `react-icons` (dùng `lucide-react` thay thế)
- ❌ `moment.js` (dùng `Intl.DateTimeFormat` hoặc `date-fns`)
- ❌ Ant Design Modal (dùng custom modal theo pattern 5.8)

---

### 5.12 🌐 Formatter số liệu chuẩn

```ts
// Số tiền VND — dùng trong mọi màn hình
const currencyFormatter = new Intl.NumberFormat('vi-VN');
function formatCurrency(value: number) {
  return value ? `${currencyFormatter.format(value)} ₫` : '—';
}

// Số lượng tồn kho
const stockFormatter = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Thời gian
// Format: "16/10/2026 09:51" — dùng toLocaleDateString với locale 'vi-VN'
```

---

## 6. 📋 QUY TẮC NGHIỆP VỤ CỐT LÕI (THEO REPORT 1 & REPORT 3)

1. **Phân quyền truy cập kho (`jnc_user_warehouse_access`):**
   - Nhân viên quản lý kho / thủ kho chỉ được phép xem, nhập, xuất và kiểm kê tại các kho mà họ được gán quyền truy cập (theo Report 1).
   - API và Frontend phải lọc dữ liệu kho theo danh sách kho được phân quyền của User đang đăng nhập.
2. **Định mức sản phẩm (BOM - `mst_boms` & `dtl_bom_items`):**
   - Khi tạo định mức sản phẩm, người dùng chọn 1 thành phẩm (`mst_products` với `product_type = 'FINISHED'`).
   - Sau đó chọn danh sách các nguyên vật liệu cấu thành (`product_type = 'RAW_MATERIAL'`) kèm số lượng định mức và tỉ lệ hao hụt (%) (theo Report 3).
3. **Quản lý Lô hàng (`mst_inventory_lots`):**
   - Hàng hóa nhập kho quản lý theo số Lô (Lot number), Ngày sản xuất (MFG), Hạn sử dụng (EXP).

---

## 7. 📝 MẪU PROMPT CHUẨN DÀNH CHO TEAM KHI RA LỆNH CHO AI

Khi bất kỳ ai trong team yêu cầu AI viết code cho một tính năng mới, hãy copy đoạn prompt mẫu này gửi kèm:

```markdown
Bạn là Senior Full-Stack Engineer cho dự án StockFlow (Tin Phat Company).
Hãy đọc kỹ file AI_CODING_RULES.md tại thư mục gốc trước khi thực hiện.

Yêu cầu thực hiện tính năng: [TÊN TÍNH NĂNG, VÍ DỤ: CRUD Định Mức Sản Phẩm BOM]

Tuân thủ nghiêm ngặt:
1. Backend: 
   - Đặt Entity/Interface tại StockFlow.Domain.
   - Viết Command/Query/Handler/Validator (MediatR + FluentValidation) tại StockFlow.Application, trả về Result<T>.
   - Cấu hình EF Core DbContext tại StockFlow.Infrastructure (schema stockflow).
   - Controller mỏng tại StockFlow.API.
   - Các gói NuGet phải ở phiên bản .NET 9.x.
2. Frontend:
   - Viết component trong src/features/... và trang trong src/app/(dashboard)/...
   - Dùng client.ts có JWT token.
   - 100% TypeScript (không any).
   - Giao diện Tiếng Việt chuyên nghiệp, Tailwind CSS hiện đại.
3. Nghiệp vụ: Tuân thủ đúng đặc tả trong Report 1 và Report 3.
```
