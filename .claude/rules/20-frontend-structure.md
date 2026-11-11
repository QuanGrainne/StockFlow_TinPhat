# 20 – Chuẩn cấu trúc Frontend

Kiểu kiến trúc: **feature-based.** Thư mục `app/` chỉ định tuyến; toàn bộ màn hình và logic nằm trong `features/`.

## Cây thư mục
```
src/
  app/(dashboard)/<route>/page.tsx   chỉ next/dynamic (ssr:false) + render màn hình
  features/<module>/
    screens/       <Module>Screen.tsx  (tên cũ *Client.tsx)
    components/    thành phần chỉ dùng trong module (bộ lọc, modal)
    services/      gọi API qua lib/api/client.ts
    types.ts       (chuyển thành thư mục types/ khi quá 300 dòng)
    utils/  hooks/
  components/      CHỈ thành phần dùng chung (Navbar, layout, ô nhập, bộ chọn thời gian/kho)
  lib/             api, auth, warehouse, navigation, print
```

## Quy ước
1. `app/` không chứa logic, không bị `features/` hay `components/` import.
2. Đường dẫn URL của trang không đổi khi chuyển file.
3. Mỗi module một thư mục dưới `features/`, tên kebab-case, trùng tên module backend nếu có.
4. Bộ lọc, modal riêng của module nằm trong `features/<module>/components/`, không để ở `src/components/`.
5. Không đặt thư mục theo vai trò (`roles/admin`, `roles/sales`...). Dữ liệu giả không dùng trong màn hình thật.
6. Mọi lời gọi API đi qua `lib/api/client.ts`; không `fetch` trực tiếp trong component.
7. TypeScript chặt, không `any`. Icon dùng `lucide-react`; không `react-icons`, không `moment`.
8. UI theo mẫu module Hàng hóa: màu chính `#0071BA`, tiêu đề bảng `#e8f2ff`, antd `Table/Button/Pagination/Tag`, modal tự dựng (không dùng antd `Modal`).
9. Next.js 16: trước khi dùng API Next, đọc `node_modules/next/dist/docs/` (xem `StockFlow_Frontend/AGENTS.md`).
10. Chuyển file bằng `git mv` để giữ lịch sử.
