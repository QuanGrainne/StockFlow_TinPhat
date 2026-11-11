# 30 – Definition of Done (một việc chỉ "xong" khi đủ các ô)

Repo chưa có project test tự động, nên bằng chứng là đầu ra lệnh và kiểm tra bằng tay.

## Mọi thay đổi code
- [ ] `dotnet build StockFlow_Backend/StockFlow.sln` đạt, số cảnh báo không tăng
- [ ] `npm run lint` (trong `StockFlow_Frontend/`) không thêm lỗi mới
- [ ] `npm run build` đạt; danh sách route không đổi trừ khi việc yêu cầu thêm/bớt trang
- [ ] Đọc lại `git diff`; không có file ngoài phạm vi
- [ ] Không thêm package; không `any`; không `console.log` sót
- [ ] Không thay đổi hành vi nghiệp vụ ngoài phạm vi

## Thêm hoặc sửa tính năng
- [ ] Gắn mã UC/BR trong Report 3 bản hiện hành (ghi vào mô tả PR)
- [ ] Có test case tương ứng trong Report 5 và đã chạy đạt
- [ ] Report 4 hoặc sơ đồ liên quan đã cập nhật
- [ ] API mới có `[RequirePermission]`; thao tác kho có kiểm tra quyền kho
- [ ] Người khác (không phải người viết) đã review

## Refactor cấu trúc
- [ ] Chỉ di chuyển/đổi tên/sửa import; không đổi logic
- [ ] Số lượng trước và sau được ghi lại (ví dụ số chỗ `as DbContext`, số import từ `@/app`)
- [ ] Mỗi đầu việc một commit; có thể hoàn tác độc lập bằng `git revert`

## Báo cáo kết thúc việc
- [ ] Khối Tự kiểm (a)–(d)
- [ ] Dòng nhật ký AI (xem `50-ai-usage-log.md`)
