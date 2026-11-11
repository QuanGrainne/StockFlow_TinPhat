# Checklist refactor cấu trúc (chép vào docs/refactor/CHECKLIST.md)

Nhánh: `chore/structure-standard` (từ `dev`). Người phụ trách: ____  Ngày bắt đầu: ____

## Đường cơ sở (ghi trước khi sửa)
- [ ] `dotnet build`: ___ lỗi, ___ cảnh báo
- [ ] `npm run lint`: ___ lỗi, ___ cảnh báo
- [ ] `npm run build`: đạt / không đạt; đã lưu danh sách route
- [ ] Số chỗ `as DbContext` ở Application: ___  | Số import `from '@/app`: ___ | Số file `*Client.tsx` trong `app/`: ___

## T0 – Rule và checklist
- [ ] Đủ 6 file trong `.claude/rules/`  - [ ] Có file checklist này  - [ ] Không sửa file cũ  - [ ] Commit  - [ ] **Xác nhận: ____**

## T1 – Xoá code không dùng (backend)
- [ ] grep không còn IRepository / IUnitOfWork / GenericRepository / UnitOfWork
- [ ] Đã gỡ 2 dòng DI  - [ ] build đạt  - [ ] msbuild.log ra khỏi git, .gitignore đã chặn
- [ ] Đã hỏi nhóm về `.specify/` và `.claude/skills/speckit-*`  - [ ] Commit  - [ ] **Xác nhận: ____**

## T2 – Transaction một API
- [ ] `as DbContext` = 0  - [ ] `dbContext != null` = 0  - [ ] Số BeginTransaction trước ___ = sau ___
- [ ] Đọc diff rollback/commit từng file  - [ ] build đạt  - [ ] Commit  - [ ] **Xác nhận: ____**

## T3 – Chuyển màn hình vào features/<module>/screens
- [ ] Không còn `*Client.tsx` trong `app/` (trừ mục chờ hỏi)  - [ ] page.tsx chỉ còn dynamic import
- [ ] Danh sách route trước = sau  - [ ] lint không lỗi mới  - [ ] Dùng git mv  - [ ] Mở thử 3 màn hình
- [ ] Commit  - [ ] **Xác nhận: ____**

## T4 – Gỡ phụ thuộc ngược, chuyển thành phần riêng
- [ ] `from '@/app` = 0  - [ ] `src/components/` chỉ còn thành phần dùng chung  - [ ] AppLayout đã sang `components/layout/`
- [ ] Route trước = sau  - [ ] lint không lỗi mới  - [ ] Commit  - [ ] **Xác nhận: ____**

## T5 – Đồng bộ file AI và tài liệu
- [ ] Hết "Next.js 15"  - [ ] Hết "Modular Monolith"  - [ ] Hết trùng "## 6"  - [ ] Đường dẫn trong tài liệu tồn tại thật
- [ ] Chỉ file .md/.cursorrules thay đổi  - [ ] Commit  - [ ] **Xác nhận: ____**

## Tổng kết
- [ ] Bảng Trước/Sau  - [ ] Bảng tầng ↔ thư mục dán vào SDS 1.2  - [ ] Dòng AI_LOG cho từng đầu việc  - [ ] Quyết định push/PR: ____
