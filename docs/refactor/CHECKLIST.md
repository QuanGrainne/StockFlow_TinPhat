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
- [x] `as DbContext` = 0  - [x] `dbContext != null` = 0  - [x] Số BeginTransaction trước = sau
- [x] Đọc diff rollback/commit từng file  - [x] build đạt  - [x] Commit  - [x] **Xác nhận: Đạt**

## T3 – Chuyển màn hình vào features/<module>/screens
- [x] Không còn `*Client.tsx` trong `app/` (trừ mục chờ hỏi)  - [x] page.tsx chỉ còn dynamic import
- [x] Danh sách route trước = sau  - [x] lint không lỗi mới  - [x] Dùng git mv  - [x] Mở thử 3 màn hình
- [x] Commit  - [x] **Xác nhận: Đạt**

## T4 – Gỡ phụ thuộc ngược, chuyển thành phần riêng
- [x] `from '@/app` = 0  - [x] `src/components/` chỉ còn thành phần dùng chung  - [x] AppLayout đã sang `components/layout/`
- [x] Route trước = sau  - [x] lint không lỗi mới  - [x] Commit  - [x] **Xác nhận: Đạt**

## T5 – Đồng bộ file AI và tài liệu
- [x] Hết "Next.js 15"  - [x] Hết "Modular Monolith"  - [x] Hết trùng "## 6"  - [x] Đường dẫn trong tài liệu tồn tại thật
- [x] Chỉ file .md/.cursorrules thay đổi  - [x] Commit  - [x] **Xác nhận: Đạt**

## Tổng kết
- [ ] Bảng Trước/Sau  - [ ] Bảng tầng ↔ thư mục dán vào SDS 1.2  - [ ] Dòng AI_LOG cho từng đầu việc  - [ ] Quyết định push/PR: ____
