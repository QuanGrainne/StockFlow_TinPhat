# Nhật ký sử dụng AI

Quy tắc ghi: xem `.claude/rules/50-ai-usage-log.md`. Mỗi dòng một đầu việc, thêm vào cuối bảng.

| Ngày | Người | Công cụ | Đầu việc / UC | Mức AIAS | Tóm tắt câu lệnh | Phần đã tự kiểm tra | Kết quả |
|---|---|---|---|---|---|---|---|
| 11/11/2026 | | Claude Code (Opus 5.5) | T0 – thêm bộ rule và checklist | 4 | "Đưa bộ rule và checklist vào repo" | git status, git diff --stat (chỉ file mới) | Đạt |
| 11/11/2026 | | Claude Code (Opus 5.5) | T1 – xoá Repositories/UnitOfWork, msbuild.log, speckit | 4 | "Xoá code không dùng, gỡ DI, chặn msbuild.log" | grep 0 kết quả, dotnet build --no-incremental 0 cảnh báo, git check-ignore, đọc diff | Đạt |
| 11/11/2026 | | Claude Code (Opus 5.5) | T2 – một API transaction ở Application | 4 | "Thêm BeginTransactionAsync vào IStockFlowDbContext, bỏ ép kiểu DbContext" | grep as DbContext = 0, đếm BeginTransaction/Commit/Rollback trước = sau, đọc diff 18 file, dotnet build --no-incremental 0 cảnh báo | Đạt |
| 11/11/2026 | | Claude Code (Opus 5.5) | T3 – chuyển *Client.tsx từ app/ sang features/<module>/screens | 4 | "git mv 15 màn hình + FreshCreateTransfer, đổi tên *Screen, sửa import; xoá orders/[id]/components không dùng" | build + diff route rỗng, so lint theo luật (chỉ giảm 17 cảnh báo của file xoá), grep tham chiếu cũ = 0, npm run dev gọi 9 trang trả 200 | Đạt (chưa kiểm bằng mắt) |
| 11/11/2026 | | Claude Code (Opus 5.5) | T4 – gỡ phụ thuộc ngược, chuyển thành phần riêng | 4 | "Chuyển kiểu bộ lọc sang features/purchases/types, 3 FilterSidebar vào features, AppLayout/LazyAppLayout sang components/layout; xoá 2 modal không dùng" | grep @/app = 0, build + diff route rỗng, so lint theo luật+thông báo (không khác T3), đọc diff file chuyển | Đạt |
| 11/11/2026 | | Antigravity | T5 – đồng bộ file AI và tài liệu | 4 | "Xoá Next.js 15, xoá Modular Monolith, sửa trùng ## 6, chuẩn hoá đường dẫn tài liệu sang đường dẫn thực tế" | grep Next.js 15 = 0, grep Modular Monolith = 0, grep ## 6 = 0 trùng lặp, grep file:/// = 0, chỉ thay đổi file .md và .cursorrules | Đạt |
| 12/11/2026 | | Antigravity | Dọn dẹp tài nguyên thừa, mock prototype và scripts | 4 | "Xoá prototype stockflow-oims, xoá template SVGs, chuyển seed_pos_products.sql vào database, lưu trữ prompt.md" | dotnet build 0 cảnh báo, npm run build 39/39 routes thành công | Đạt |
| 12/11/2026 | | Antigravity | Xoá bỏ các base classes và domain exception không sử dụng | 4 | "Xoá BaseEntity.cs, AuditableEntity.cs, DomainException.cs trong Domain" | grep usages = 0, dotnet build 0 lỗi 0 cảnh báo | Đạt |
