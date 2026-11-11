# 00 – Nguyên tắc chung cho AI làm việc trong StockFlow

1. **Đọc trước, làm sau.** Đọc CLAUDE.md và các file trong `.claude/rules/` trước khi sửa code.
2. **Chỉ làm đúng phạm vi được giao.** Thấy việc khác thì ghi vào "Phát hiện ngoài phạm vi", không tự sửa.
3. **Không tự thêm** quy trình, actor, bảng, field, endpoint hay UC/BR. Nguồn sự thật nghiệp vụ là Report 3 bản hiện hành (Google Doc của nhóm), không phải `docs/Report3.docx` cũ.
4. **Không thêm, nâng cấp, xoá package** (NuGet, npm) nếu chưa nêu tên và lý do trong PR. Backend giữ NuGet 9.x.
5. **Hỏi khi chưa chắc.** Gặp chỗ mơ hồ hoặc có hai cách hiểu, dừng và hỏi bằng câu hỏi đánh số, kèm đề xuất mặc định.
6. **Mỗi thay đổi phải giải thích được.** Thành viên viết hoặc duyệt phải trả lời được "vì sao" khi bảo vệ.
7. **Không phá thứ đang chạy.** Không đổi URL trang, không đổi tên bảng/cột, không tạo migration ngoài phạm vi.
8. **Không push, merge, force push, reset --hard** nếu người dùng chưa yêu cầu.
9. **Ngôn ngữ:** giải thích và ghi chú trong code bằng tiếng Việt; tên định danh bằng tiếng Anh; UI bằng tiếng Việt.
10. **Kết thúc mỗi việc bằng khối Tự kiểm** (a) giả định, (b) điểm cần hỏi lại nhóm, (c) chỗ không chắc, (d) UC/BR liên quan; kèm dòng nhật ký AI (xem `50-ai-usage-log.md`).
