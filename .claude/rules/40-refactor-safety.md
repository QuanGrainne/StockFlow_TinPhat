# 40 – An toàn khi refactor và quy trình Git

1. **Cửa sổ ngừng merge.** Trước khi di chuyển file hàng loạt, cả nhóm báo ngừng merge vào `dev` và rebase nhánh đang mở sau khi refactor xong. Một người làm, các người khác không sửa cùng file.
2. **Nhánh riêng.** Làm trên `chore/<tên>` tách từ `dev`. Không làm trực tiếp trên `dev` hoặc `main`.
3. **Một đầu việc một commit.** Thông điệp ngắn, tiếng Việt: `refactor: ...`, `docs: ...`, `chore: ...`. Có thể `git revert` từng cái.
4. **Đường cơ sở trước khi sửa:** ghi lại kết quả build, lint và danh sách route. So sánh sau mỗi đầu việc.
5. **Dùng `git mv`** khi chuyển file để giữ lịch sử.
6. **Làm thử một chỗ rồi áp dụng hàng loạt.** Đổi một module, build, rồi mới làm tiếp.
7. **Đọc diff, không chỉ tin build.** Đặc biệt với transaction: mọi chỗ commit/rollback cũ phải còn nguyên.
8. **Dừng ở cổng.** Sau mỗi đầu việc chờ người phụ trách xác nhận mới tiếp tục.
9. **Không động tới** migration, dữ liệu seed, chuỗi kết nối, file `appsettings*.json`, khoá bí mật.
10. **Hoàn tác:** nếu một đầu việc hỏng ngoài dự kiến, `git revert` commit đó rồi báo, không sửa chồng sửa.
11. Nhánh được push/PR sang `dev` chỉ khi người phụ trách yêu cầu; tên nhánh theo quy ước của nhóm (`feature/<module>` cho tính năng, `chore/<tên>` cho refactor).
