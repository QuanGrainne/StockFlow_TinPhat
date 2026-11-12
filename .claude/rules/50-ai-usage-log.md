# 50 – Nhật ký sử dụng AI (bằng chứng AIAS cho đồ án)

Mỗi đầu việc có dùng AI phải có một dòng nhật ký, ghi vào `docs/ai-log/AI_LOG.md` (mỗi dòng một việc, thêm vào cuối).

## Mẫu một dòng
| Ngày | Người | Công cụ | Đầu việc / UC | Mức AIAS | Tóm tắt câu lệnh | Phần đã tự kiểm tra | Kết quả |
|---|---|---|---|---|---|---|---|
| 12/11/2026 | Quân | Claude (Antigravity) | T1 – xoá Repositories | 4 | "Xoá code không dùng, gỡ DI" | grep, build, đọc diff | Đạt |

## Quy tắc
1. Ghi dòng nhật ký **trước khi tạo PR**. PR không có dòng nhật ký thì reviewer không duyệt.
2. "Phần đã tự kiểm tra" phải là việc làm được (chạy lệnh, đọc diff, chạy thử màn hình), không ghi "đã xem qua".
3. Không dán bí mật (mật khẩu, khoá JWT, chuỗi kết nối) vào câu lệnh gửi AI.
4. Người nộp PR phải giải thích được toàn bộ code do AI tạo ra.
5. Mức AIAS ghi theo thang nhóm đang dùng; việc refactor cấu trúc theo mẫu này là mức 4.
