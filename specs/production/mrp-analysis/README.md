# Phân tích MRP — Dự kiến nhu cầu nguyên vật liệu theo kế hoạch sản xuất

- **Ngày:** 16/11/2026. **Người phụ trách:** Ninh. **Nhánh khảo sát:** `feature/production-planning`.
- **Tính chất:** tài liệu phân tích. Không có code, migration, entity, API hay thay đổi database nào được tạo.
- Mã BR-MRP-xx, Q-M-xx là mã tạm; chưa có trong Report 3.

## Kết luận ngắn

1. StockFlow **đã có** phần lõi MRP một cấp: kế hoạch có ngày theo dòng, BOM có phiên bản và hao hụt, công thức nhu cầu, cộng dồn NVL theo một kế hoạch, so tồn theo kho.
2. **Chưa có:** lead time, ngày giao dự kiến của đơn mua, lịch làm việc, giữ chỗ tồn, gộp nhu cầu nhiều kế hoạch, BOM nhiều cấp, lịch sản xuất theo ngày / công đoạn.
3. **Khuyến nghị:**
   - Tính nhu cầu theo thời gian bằng **phương án A** (NVL sẵn sàng trước ngày bắt đầu của dòng kế hoạch).
   - Tránh tính trùng tồn bằng **phân bổ mềm theo ngày cần**, tính khi xem, không lưu, không khóa tồn.
   - Thay đổi database bắt buộc chỉ là **một cột** lead time trên NVL; thêm một cột ngày giao dự kiến trên đơn mua nếu muốn tính hàng đang đặt.
4. Trước khi code cần chủ dự án trả lời 12 câu hỏi ở file 06 mục 8, trong đó quan trọng nhất là MRP thuộc phạm vi nào của Report 1 / Report 3 (Q-M11).

## Danh sách tài liệu

| File | Nội dung | Phần trong yêu cầu |
|---|---|---|
| [01-current-state.md](01-current-state.md) | Bảng đối chiếu 27 nghiệp vụ với code và database; các điểm UNKNOWN | 1 |
| [02-business-and-time-analysis.md](02-business-and-time-analysis.md) | Quy trình, 12 câu hỏi nghiệp vụ, ba phương án thời gian, lead time, ngày nghỉ, phân bổ, ví dụ Bàn A / Ghế B | 2, 3, 4 |
| [03-data-model.md](03-data-model.md) | Sáu nhóm dữ liệu, cột và bảng đề xuất, ERD Mermaid | 5 |
| [04-api-and-frontend.md](04-api-and-frontend.md) | 9 API đề xuất theo CQRS; 5 màn hình, luồng thao tác, phân quyền | 6, 7 |
| [05-business-rules-and-testing.md](05-business-rules-and-testing.md) | BR-MRP-01..11, 23 trường hợp ngoại lệ, kịch bản kiểm thử | 8, 9 |
| [06-assessment-and-roadmap.md](06-assessment-and-roadmap.md) | Tái sử dụng, còn thiếu, MUST / SHOULD / NICE, rủi ro, giai đoạn, câu hỏi cần xác nhận | 10 |

## Tài liệu liên quan

- `specs/production-planning-analysis/` và `specs/production-planning-implementation/`: kế hoạch sản xuất (UC-PP-01..06).
- `specs/production/spec.md`: lệnh sản xuất, xuất NVL, nhập thành phẩm.
