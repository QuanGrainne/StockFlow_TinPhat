# 20 – Chuẩn cấu trúc Frontend

Kiểu kiến trúc: **feature-based.** Thư mục `app/` chỉ định tuyến; toàn bộ màn hình và logic nằm trong `features/`.

## Cây thư mục
```
src/
  app/(dashboard)/<route>/page.tsx   chỉ import LazyAppLayout + render (xem "Cách nạp trang")
  features/<module>/
    screens/       <Module>Screen.tsx  (tên cũ *Client.tsx)
    components/    thành phần chỉ dùng trong module (bộ lọc, modal)
    services/      gọi API qua lib/api/client.ts
    types.ts       (chuyển thành thư mục types/ khi quá 300 dòng)
    utils/  hooks/
  components/
    layout/        VỎ ứng dụng: AppLayout, LazyAppLayout, Header, Sidebar, FeatureGuard, FormHeaderUserBar
    (còn lại)      CHỈ thành phần dùng chung (ô nhập, bộ chọn thời gian/kho, logo)
  lib/             api, auth (roles, tabSession, flags), warehouse, navigation, print, ui, utils (date)
```

## Hướng phụ thuộc
```
app → components/layout → features → components (dùng chung) + lib
```
1. `page.tsx` chỉ chọn `initialScreen` (hoặc truyền `children`); `components/layout/AppLayout` (qua `LazyAppLayout`) ghép màn hình trong `features/<m>/screens`.
2. `components/layout/` **được** import `features` (vỏ ứng dụng phải biết các màn hình và service quyền).
3. Phần còn lại của `components/` **không** import `features`. Toàn bộ `lib/` **không** import `features` hay `components`.
4. Feature chỉ import `types`/`services` của feature khác, hoặc những gì feature đó export ở **cổng công khai** `features/<m>/index.ts` (import bằng `@/features/<m>`). **Không** import thẳng vào `components`/`screens` của feature khác. Hàm dùng chung nhiều feature thì đưa vào `lib/` (vd `lib/utils/date.ts`).
   - Cổng hiện có (T24): `orders` (`InvoicePreviewModal`, `invoiceLinkHref`), `purchases` (`PurchaseFilterSidebar`, `AddFromCategoryPopover`), `customers` (`CustomerFormModal`). Thêm thành phần vào cổng thì ghi rõ lý do dùng chéo; code bên trong chính feature không import qua cổng của mình.

### Ngoại lệ đã biết (đo ở T22, cập nhật T24)
Import `components` của feature khác: **0** — 10 chỗ cũ đã chuyển sang import qua cổng công khai (T24).

Thành phần dùng chung import feature (1 chỗ, có từ trước T14):
- `components/links/EntityLinks.tsx` nạp động (`import()`) `products/components/StockCardDocumentModal`

Import `utils` của feature khác (chưa cấm, nên chuyển dần sang `lib/`):
- ~~`transfers/utils/dateUtils` (23 file ở 10 feature)~~ — đã sửa ở T24: import thẳng `@/lib/utils/date`.
- `purchase-orders/utils/purchaseOrderUtils` ← purchases, products; `sales-bookings/utils/salesBookingUtils` ← pos, customers; `pos/utils/posTabs` ← orders.

## Cách nạp trang (kiểu "Khung + bảng màn hình")
```
page.tsx → components/layout/LazyAppLayout (next/dynamic, ssr:false)
         → components/layout/AppLayout (Header + Sidebar + kiểm quyền)
         → switch (activeScreen) → features/<module>/screens/<Module>Screen
```
1. Trang danh sách: `'use client'` + `<LazyAppLayout initialScreen="<mã màn hình>" />`. Không tự viết lại `next/dynamic` cho AppLayout. Cần làm mới khi quay lại thì truyền `key` (vd `key={bfcacheId}` ở `purchase-orders`).
2. Trang chi tiết `orders/[id]` và trang `pos` cũng dùng `LazyAppLayout`, truyền màn hình qua `children` (`pos` bọc `PosScreen` trong `FeatureGuard`). Trang tạo (`*/create`) nạp màn hình riêng bằng `next/dynamic`, không qua AppLayout (`transfers/create` là server component có `metadata` nên không dùng `ssr:false`).
3. Thêm màn hình mới: thêm `case` trong `AppLayout`, khai mục menu trong cấu hình navbar, rồi tạo `page.tsx` theo mục 1.

## Quy ước
1. `app/` không chứa logic, không bị `features/` hay `components/` import.
2. Đường dẫn URL của trang không đổi khi chuyển file.
3. Mỗi module một thư mục dưới `features/`, tên kebab-case, trùng tên module backend nếu có.
4. Bộ lọc, modal riêng của module nằm trong `features/<module>/components/`, không để ở `src/components/`.
5. Không đặt thư mục theo vai trò (`roles/admin`, `roles/sales`...). Dữ liệu giả không dùng trong màn hình thật.
6. Mọi lời gọi API đi qua `lib/api/client.ts`; không `fetch` trực tiếp trong component.
   - Ngoại lệ đã biết: `app/(auth)/login/page.tsx` gọi `/api/auth/login` bằng `fetch` (không cần token, không đi qua xử lý 401/tự đăng nhập của apiClient; lý do ghi ở đầu file).
7. TypeScript chặt, không `any`. Icon dùng `lucide-react`; không `react-icons`, không `moment`.
8. UI theo mẫu module Hàng hóa: màu chính `#0071BA`, tiêu đề bảng `#e8f2ff`, antd `Table/Button/Pagination/Tag`, modal tự dựng (không dùng antd `Modal`).
9. Next.js 16: trước khi dùng API Next, đọc `node_modules/next/dist/docs/` (xem `StockFlow_Frontend/AGENTS.md`).
10. Chuyển file bằng `git mv` để giữ lịch sử.
