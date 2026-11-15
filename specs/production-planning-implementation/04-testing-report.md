# 04 — Báo cáo Phase 4: Kiểm thử

- **Ngày:** 15/11/2026. **Phiên bản kiểm thử:** cây làm việc nhánh `feature/production-planning` (chưa commit), backend build Debug.
- **Môi trường:** DB tạm `stockflow_verify_pp` tạo mới mỗi lần chạy (API tự migrate + seed), xóa sau khi xong. Không dùng `stockflow_dev`.

> **Cập nhật 15/11/2026 (sau khi bổ sung validation, file 06 mục 8):** unit 79/79, API 96/96 (thêm `pptest4.ps1` 22 ca) — tổng **175/175** đạt. Bảng dưới là kết quả lần chạy Phase 4 ban đầu.

## 1. Tổng hợp

| Cấp | Công cụ | Số ca | Đạt | Lỗi |
|---|---|---|---|---|
| Unit | `unit-tests/` (console, chỉ `ProjectReference`, không NuGet mới) | 57 | 57 | 0 |
| Integration + System (Phase 2, chạy lại làm hồi quy) | `api-tests/pptest.ps1` + `pptest2.ps1` | 57 | 57 | 0 |
| Integration + System (Phase 4 bổ sung) | `api-tests/pptest3.ps1` | 17 | 17 | 0 |
| **Tổng** | | **131** | **131** | **0** |

Log API sau lượt chạy cuối: 0 unhandled exception, 0 deadlock / lock timeout; 7 `ValidationException` đúng là các ca kiểm validation cố ý.

**Cách chạy lại:**
```powershell
dotnet run --project specs/production-planning-implementation/unit-tests
# API trên DB thử (không phải stockflow_dev):
. specs/production-planning-implementation/api-tests/env.ps1 -DbName stockflow_verify_pp   # tạo DB trống trước
# chạy StockFlow.API với ASPNETCORE_URLS=http://localhost:5196 rồi:
specs/production-planning-implementation/api-tests/pptest.ps1    # cần DB mới
specs/production-planning-implementation/api-tests/pptest2.ps1   # chạy ngay sau pptest.ps1
specs/production-planning-implementation/api-tests/pptest3.ps1   # độc lập
```
Kết quả từng ca được ghi ra `api-tests/results.json`, `api-tests/results-p4.json`.

## 2. Unit test (57 ca)

| Nhóm | Mã | Nội dung |
|---|---|---|
| Chuyển trạng thái | UT-01..10 | Bảng `Can*()` cho đủ 6 trạng thái; so khớp không phân biệt hoa thường; chuỗi `Mark*` Nháp → Chờ duyệt → Bị từ chối → Chờ duyệt → Đã duyệt → Đã đóng; hủy; độ dài trạng thái ≤ 20 |
| Validation, ngày, số lượng | UT-11..27 | Hợp lệ; tên rỗng / > 150; kỳ ngược; không có dòng; trùng thành phẩm; số lượng 0 / âm / 3 chữ số thập phân; ngày dòng ngược; dòng trước / sau kỳ; mã thành phẩm 0; ghi chú > 500; số lượng lớn tối đa `numeric(18,2)`; dòng đúng biên kỳ |
| Điều kiện thao tác theo vai trò | UT-28..49 | Sửa (toàn bộ / hạn chế / không được), gửi duyệt, duyệt (kể cả tự duyệt — Q2), hủy (người lập / người khác / người duyệt / còn lệnh), đóng, **điều kiện lập lệnh** (chỉ APPROVED + có quyền lập lệnh) |
| Lý do | UT-50..55 | Định dạng ghi vào ghi chú; ghi chú rỗng; cắt còn 500 ký tự giữ lý do mới nhất; lý do bắt buộc, ≤ 200; khóa theo từng kế hoạch |
| Nhu cầu NVL | UT-56..57 | Công thức BR-31; cộng dồn hai thành phẩm dùng chung NVL |

**Số lượng còn lại** phụ thuộc DB (tổng dòng lệnh chưa hủy) nên kiểm ở cấp tích hợp (PP-29/30/33/35/43, IT-04/05).

## 3. Integration test

| Yêu cầu | Ca | Kết quả |
|---|---|---|
| API tạo kế hoạch và lưu DB | PP-11, PP-12, IT-01 (25 dòng) | Đạt |
| API cập nhật kế hoạch | PP-14, PP-22, PP-36..41 | Đạt |
| Gửi duyệt và phê duyệt / từ chối | PP-13, PP-15..23, IT-06 | Đạt |
| Tạo lệnh từ kế hoạch | PP-28..35, PP-43, PP-50, IT-01, IT-13 | Đạt |
| **Transaction và rollback** | IT-03: BOM bị ngừng sau khi duyệt → lập lệnh trả 400, số lệnh 8 → 8, số dòng nhu cầu NVL 39 → 39 (không còn dữ liệu dở) | Đạt |
| Quyền truy cập | PP-01, 09, 19, 25, 27, 36, 45, 47; IT-12, IT-14 (401), **IT-15/16 vai trò đã lưu ma trận**, **IT-17 tài khoản bị khóa** | Đạt |
| Đồng thời | PP-44 (5 request), IT-04 (bấm 2 lần), IT-05 (2 người khác nhau), IT-06 (2 người duyệt cùng lúc) | Đạt |

## 4. System test

| Trường hợp bắt buộc | Ca | Kết quả |
|---|---|---|
| Luồng đầy đủ: lập → thêm thành phẩm → gửi duyệt → duyệt → lập lệnh → quy trình sản xuất hiện có | IT-07: xuất NVL, nhập 10 thành phẩm vào K002 → lệnh tự **COMPLETED**, kế hoạch hiện đã nhập 10, đã lập 100%, đóng kế hoạch → CLOSED; tồn thành phẩm K002 tăng 10 | Đạt |
| Kế hoạch có nhiều sản phẩm | IT-01 (25 thành phẩm, 1 lệnh 25 dòng), PP-32 | Đạt |
| Kế hoạch có số lượng lớn | PP-50 (1.000.000, lập 999.999,99 → còn 0,01); UT-26 | Đạt |
| Chỉ tạo một phần số lượng | PP-28 | Đạt |
| Tạo nhiều lần từ cùng một dòng | PP-32, PP-44 | Đạt |
| Cố tình tạo vượt số còn lại | PP-30, PP-33, PP-34 (sửa lệnh), IT-05 | Đạt |
| Hai người đồng thời tạo lệnh | PP-44, IT-05 | Đạt |
| Hủy kế hoạch đã có lệnh | PP-42 (chặn khi còn lệnh), PP-49 (được khi mọi lệnh đã hủy) | Đạt |
| Người không có quyền | PP-01, 19, 27, 45, 47; IT-14..17 | Đạt |
| Dữ liệu không hợp lệ | PP-02..10, PP-20, IT-08..11 | Đạt |

## 5. Lỗi phát hiện trong quá trình kiểm thử

| # | Lỗi | Mức | Xử lý |
|---|---|---|---|
| B1 (Phase 2) | Production Accountant bị 403 khi lập / hủy kế hoạch vì API dùng `PROD_CREATE` / `PROD_DELETE` | Nghiêm trọng | Đã sửa: dùng `PROD_UPDATE` (K3) |
| B2 | Lỗi validation backend chỉ hiện "Dữ liệu không hợp lệ." ở frontend | Trung bình | Đã sửa cho module kế hoạch (`planErrorText`) |
| S1..S3 | Lỗi trong script kiểm thử (so khớp chuỗi JSON bị escape, `HttpClient` chưa nạp, `Parallel` là từ khóa PowerShell 5.1) | — | Sửa script, không phải lỗi sản phẩm |

Không còn lỗi nghiêm trọng mở.

## 6. Chưa kiểm thử

| Nội dung | Lý do | Đề xuất |
|---|---|---|
| Giao diện bấm thử trên trình duyệt | Môi trường không có công cụ trình duyệt | Một thành viên chạy `npm run dev` thử luồng ở file 03 mục 2 |
| Unit test bằng xUnit chạy trong CI | Cần thêm package (`xunit`, `xunit.runner.visualstudio`, `Microsoft.NET.Test.Sdk`), phải nhóm duyệt | Chuyển 57 ca console sang project test khi được duyệt |
| Hiệu năng danh sách khi có rất nhiều kế hoạch | Không có yêu cầu phi chức năng cụ thể | Theo dõi; danh sách chưa phân trang phía server (giống các danh sách sản xuất khác) |

## 7. Tự kiểm

- **(a) Giả định:** kiểm thử console + script API được chấp nhận làm bằng chứng vì repo chưa có project test.
- **(b) Cần hỏi nhóm:** có duyệt thêm package xUnit không.
- **(c) Chỗ không chắc:** giao diện chưa bấm thử.
- **(d) UC/BR:** UC-PP-01..06; BR-PP-01..24; hồi quy UC-59, UC-46, UC-49.
