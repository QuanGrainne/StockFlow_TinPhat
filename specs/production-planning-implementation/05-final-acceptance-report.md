# 05 — Báo cáo nghiệm thu: Production Planning

- **Ngày:** 15/11/2026. **Người phụ trách:** Ninh. **Nhánh:** `feature/production-planning` (chưa commit, chưa push).
- **Tài liệu liên quan:** `00-implementation-plan.md` (quyết định K1–K10), `01`…`04` (báo cáo từng phase), `specs/production-planning-analysis/` (phân tích, quyết định Q1–Q12 đã chốt 14/11/2026).

## 1. Kết luận

Chức năng Lập kế hoạch sản xuất (UC-PP-01..06) đã có đủ backend và frontend.
- **Kiểm thử:** 131/131 ca đạt (57 unit, 74 integration / system trên API thật), gồm các ca đồng thời, rollback và luồng đầu-cuối tới khi lệnh hoàn thành.
- **Build:** backend 0 lỗi, 0 cảnh báo; frontend build 46/46 trang; lint không tăng so với đường cơ sở.

**Chưa đủ điều kiện merge vào `dev`** cho tới khi xong 4 việc ở mục 6: bấm thử giao diện, nhóm duyệt các quyết định K1/K6/K7, cấp mã UC/BR trong Report 3, có người review.

## 2. Trạng thái từng chức năng

| Chức năng | UC | Database | Backend | Frontend | Kiểm thử | Trạng thái |
|---|---|---|---|---|---|---|
| Danh sách kế hoạch (lọc, tìm, xuất Excel) | UC-PP-01 | Có | Có | Có | PP-51, PP-52 | Hoàn thành |
| Chi tiết + tiến độ (đã lập, còn lại, đã nhập kho) | UC-PP-01 | Có | Có | Có | PP-29, PP-57, IT-07 | Hoàn thành |
| Lập kế hoạch | UC-PP-02 | Có (sequence `KHSX`) | Có | Có | PP-02..12, IT-01 | Hoàn thành |
| Sửa kế hoạch (toàn bộ / hạn chế sau duyệt) | UC-PP-02 | Có | Có | Có | PP-14, 16, 22, 36..41 | Hoàn thành |
| Nhu cầu NVL dự kiến (đã lưu + đang soạn) | UC-PP-03 | Không cần | Có | Có | PP-24..26, IT-02 | Hoàn thành |
| Gửi duyệt / duyệt / từ chối | UC-PP-04 | Có | Có | Có (mục menu Duyệt) | PP-13..23, IT-06 | Hoàn thành |
| Lập lệnh từ kế hoạch | UC-PP-05 | Có | Có (khóa chống trùng) | Có | PP-27..35, 43, 44, 50; IT-03..05 | Hoàn thành |
| Hủy / đóng kế hoạch | UC-PP-06 | Có | Có | Có | PP-42, 45..49 | Hoàn thành |
| Mã kế hoạch trên lệnh sản xuất | UC-PP-01 | Có | Có | Có (chi tiết lệnh) | PP-55 | Hoàn thành |
| Ma trận phân quyền 2 chức năng mới | — | — | Có | Có (2 mục menu) | IT-15, IT-16 | Hoàn thành |
| Chỉnh định mức NVL khi lập lệnh từ kế hoạch | UC-PP-05 | — | Có (body hỗ trợ) | **Chưa** (làm sau ở màn Lệnh sản xuất) | — | Một phần |
| Mở thẳng lệnh sản xuất từ chi tiết kế hoạch | — | — | — | **Chưa** | — | Một phần |
| Unit test bằng xUnit trong CI | — | — | — | — | Console thay thế | Chưa triển khai (chờ duyệt package) |
| Liên kết đơn đặt hàng, năng lực sản xuất, tự sinh lệnh / đơn mua | — | — | — | — | — | Ngoài phạm vi (đã chốt) |

## 3. Kiểm tra theo hạng mục

| Hạng mục | Kết quả |
|---|---|
| Database | 1 migration chỉ tạo sequence; lên / xuống / lên lại đạt; model EF không sót thay đổi; không thêm bảng, cột |
| Backend | 12 API mới, mỗi API có `[RequirePermission]` + `[RequireFeature]`; validator FluentValidation; transaction + khóa theo kế hoạch cho mọi thao tác ghi; quyền kho kiểm khi chọn kho nhận / xem tồn |
| Frontend | 2 trang, 1 màn, 5 component, service, types; nút thao tác theo `actions` backend; validation khớp backend |
| Phân quyền | Manager: lập + duyệt + lập lệnh; Kế toán SX: lập + gửi duyệt, không duyệt, không lập lệnh; Sales / Warehouse: không xem; vai trò đã lưu ma trận theo đúng ô tick; tài khoản khóa bị chặn |
| Validation | Đủ các luật BR-PP-02..07, 13, 20 ở cả frontend và backend |
| Business rules | BR-PP-01..24 theo file 06; Q1–Q12 theo phương án đã chốt |
| Production Order | Lập lệnh trực tiếp không đổi (PP-53); sửa lệnh không thuộc kế hoạch không đổi (PP-54); sửa lệnh thuộc kế hoạch bị chặn khi vượt (PP-34, IT-13) |
| Quy trình sản xuất hiện có | Lệnh từ kế hoạch xuất NVL, nhập thành phẩm, tự hoàn thành như lệnh thường (PP-57, IT-07) |

## 4. Ảnh hưởng tới module khác

| Module | Ảnh hưởng | Mức |
|---|---|---|
| Lệnh sản xuất (UC-59) | Sửa lệnh thuộc kế hoạch có thêm kiểm tra; DTO lệnh thêm 2 trường tùy chọn; chi tiết lệnh hiện mã kế hoạch | Thấp, đã kiểm hồi quy |
| Phân quyền (Roles) | 2 chức năng mới trong `FeatureConstants` và menu. Vai trò **chưa** lưu ma trận (Manager, Kế toán SX) thấy ngay 2 mục mới. Vai trò **đã** lưu ma trận chỉ thấy khi Admin tick. "Đặt lại mặc định" ở màn ma trận nay có 2 chức năng mới | Trung bình (vận hành) |
| `IStockFlowDbContext` | Thêm hàm `AcquireTransactionLockAsync`; chỉ một lớp cài đặt | Thấp |
| Mã chứng từ | Loại mới `PRODUCTION_PLAN`, sequence riêng | Không ảnh hưởng chứng từ khác |
| Các module còn lại | Không đổi | — |

## 5. Rủi ro còn tồn tại

| # | Rủi ro | Mức | Đề xuất |
|---|---|---|---|
| R-01 | Giao diện chưa được bấm thử trên trình duyệt | Trung bình | Thử tay trước khi merge |
| R-02 | Vai trò đã lưu ma trận phải được tick 2 chức năng mới | Trung bình | Ghi vào hướng dẫn triển khai; Admin tick sau khi deploy |
| R-03 | Lý do từ chối / hủy chung cột `notes` 500 ký tự (cắt phần cũ khi đầy) | Thấp | Nếu cần lưu vết đầy đủ: thêm cột riêng (cần duyệt ERD) |
| R-04 | Lệnh đóng sớm vẫn tính đủ số đã lập (K6) | Thấp | PO xác nhận |
| R-05 | Chưa có test xUnit chạy trong CI | Trung bình | Duyệt package rồi chuyển 57 ca console |
| R-06 | Tài liệu ERD (`database/stockflow.sql`, PlantUML) chưa có bảng kế hoạch và sequence mới | Thấp | Cập nhật tài liệu ERD |
| R-07 | Trên máy này, `npm run build` lỗi vì file **chưa theo dõi** `src/features/roles/components/AppLayout.tsx` và cache `.next/dev` cũ | Thấp (chỉ máy cục bộ) | Xóa file / cache đó (không tự xóa) |

## 6. Việc cần làm trước khi tạo PR vào `dev` (Definition of Done)

| Ô DoD | Trạng thái |
|---|---|
| `dotnet build` đạt, cảnh báo không tăng | Đạt (0 / 0) |
| `npm run lint` không thêm lỗi mới | Đạt (238 = đường cơ sở) |
| `npm run build` đạt, route chỉ thêm 2 trang mới | Đạt (46/46; thêm `/production/plans`, `/production/plan-approvals`) |
| Đọc lại `git diff`, không file ngoài phạm vi | Đạt |
| Không thêm package, không `any`, không `console.log` | Đạt |
| API mới có `[RequirePermission]`; thao tác kho kiểm quyền kho | Đạt |
| Gắn mã UC/BR trong Report 3 bản hiện hành | **Chưa** — đang dùng mã tạm UC-PP / BR-PP |
| Test case trong Report 5 | **Chưa** — có thể lấy từ file 04 |
| Report 4 / sơ đồ cập nhật | **Chưa** |
| Người khác review | **Chưa** |
| Nhật ký AI | Đạt (`docs/ai-log/AI_LOG.md`) |

## 7. Quyết định cần Product Owner / nhóm xác nhận

1. K1: tên 2 chức năng / 2 mục menu "Kế hoạch sản xuất" và "Duyệt kế hoạch sản xuất".
2. K6: lệnh đóng sớm không trả phần thiếu về kế hoạch.
3. K7: lý do từ chối / hủy ghi vào `notes`.
4. Tiền tố mã `KHSX`.
5. Mã UC/BR chính thức cho UC-PP-01..06, BR-PP-01..24.
6. Có thêm package xUnit để đưa kiểm thử vào CI không.

## 8. Tự kiểm

- **(a) Giả định:** K1–K10; kiểm thử bằng console và script API được chấp nhận làm bằng chứng.
- **(b) Cần hỏi nhóm:** mục 7.
- **(c) Chỗ không chắc:** giao diện chưa bấm thử trên trình duyệt.
- **(d) UC/BR:** UC-PP-01..06, BR-PP-01..24; dùng lại UC-59, BR-31, BR-51; hồi quy UC-46, UC-49.
