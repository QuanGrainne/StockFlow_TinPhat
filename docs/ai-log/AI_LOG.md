# Nhật ký sử dụng AI

Quy tắc ghi: xem `.claude/rules/50-ai-usage-log.md`. Mỗi dòng một đầu việc, thêm vào cuối bảng.

| Ngày | Người | Công cụ | Đầu việc / UC | Mức AIAS | Tóm tắt câu lệnh | Phần đã tự kiểm tra | Kết quả |
|---|---|---|---|---|---|---|---|
| 11/11/2026 | | Claude Code (Opus 5.5) | T0 – thêm bộ rule và checklist | 4 | "Đưa bộ rule và checklist vào repo" | git status, git diff --stat (chỉ file mới) | Đạt |
| 11/11/2026 | | Claude Code (Opus 5.5) | T1 – xoá Repositories/UnitOfWork, msbuild.log, speckit | 4 | "Xoá code không dùng, gỡ DI, chặn msbuild.log" | grep 0 kết quả, dotnet build --no-incremental 0 cảnh báo, git check-ignore, đọc diff | Đạt |
