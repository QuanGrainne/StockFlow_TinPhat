# Test case – Tài chính, báo cáo, cài đặt, hiệu năng, ngoài phạm vi

- **Ngày lập:** 19/11/2026. **Người phụ trách:** Ninh. **Giai đoạn:** Phase 2 – Test Strategy & Test Design.
- **Sinh tự động** bằng `node specs/qa/test-design/generate.js` từ `specs/qa/test-design/data/*.js`. Sửa dữ liệu rồi chạy lại, không sửa tay file này.
- **Chưa test nào được chạy trong Phase 2.** Trạng thái "Not Run" nghĩa là đã thiết kế, chưa thực thi; không dùng làm bằng chứng đạt.
- **Số test case:** 20.
- Ma trận truy vết: [02_REQUIREMENT_TRACEABILITY_MATRIX.md](../reports/02_REQUIREMENT_TRACEABILITY_MATRIX.md). Chiến lược: [03_TEST_STRATEGY.md](../reports/03_TEST_STRATEGY.md).

## Danh sách

| ID | Tên | Module | Loại | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| [UT-VAL-012](#ut-val-012) | Validator điều chỉnh công nợ: giá trị mới bằng hiện tại, thời gian tương lai, mô tả > 500 ký tự | Tài chính & báo cáo | Unit | High | Not Run |
| [UT-CODE-001](#ut-code-001) | Định dạng mã chứng từ theo quy tắc SEQUENTIAL / DATETIME / RANDOM | Cài đặt | Unit | High | Not Run |
| [IT-FIN-001](#it-fin-001) | Phiếu thu phân bổ vào hoá đơn còn nợ cũ nhất trước | Tài chính & báo cáo | Integration | Critical | Not Run |
| [IT-FIN-002](#it-fin-002) | Số tiền phiếu thu: 0, bằng dư nợ, vượt dư nợ | Tài chính & báo cáo | Integration | High | Not Run |
| [IT-FIN-003](#it-fin-003) | Huỷ phiếu thu hoàn lại công nợ; sửa phiếu chỉ đổi thời gian, phương thức, ghi chú | Tài chính & báo cáo | Integration | High | Not Run |
| [IT-FIN-004](#it-fin-004) | Phiếu chi NCC giảm công nợ NCC | Tài chính & báo cáo | Integration | High | Not Run |
| [IT-FIN-005](#it-fin-005) | Điều chỉnh công nợ khách / NCC và huỷ điều chỉnh | Tài chính & báo cáo | Integration | High | Not Run |
| [IT-SET-001](#it-set-001) | Sinh mã chứng từ từ sequence không trùng khi chạy song song | Cài đặt | Integration | High | Not Run |
| [IT-CONC-005](#it-conc-005) | Hai phiếu thu đồng thời vượt dư nợ | Tài chính & báo cáo | Integration | High | Not Run |
| [API-FIN-001](#api-fin-001) | Báo cáo công nợ, nhập – xuất – tồn, doanh thu – lợi nhuận, chi phí | Tài chính & báo cáo | API | Medium | Blocked |
| [API-FIN-002](#api-fin-002) | Dashboard quản lý: KPI và việc chờ duyệt | Tài chính & báo cáo | API | Medium | Blocked |
| [API-SET-001](#api-set-001) | Cài đặt đơn hàng: biên giá trị, quyền Admin đổi quy tắc giao dịch | Cài đặt | API | High | Not Run |
| [API-OOS-001](#api-oos-001) | Các UC và BR đã loại khỏi phạm vi | Ngoài phạm vi | API | Low | Skipped |
| [ST-FIN-001](#st-fin-001) | Phiếu thu, phiếu chi, điều chỉnh nợ, huỷ phiếu; số dư và lịch sử | Tài chính & báo cáo | System | High | Not Run |
| [ST-SET-001](#st-set-001) | Cài đặt đơn hàng và cảnh báo công nợ có hiệu lực ngay | Cài đặt | System | High | Not Run |
| [ST-NFR-001](#st-nfr-001) | Yêu cầu thường: 95% ≤ 2 giây | Hiệu năng | System | Medium | Not Run |
| [ST-NFR-002](#st-nfr-002) | Giao dịch thường ≤ 3 giây | Hiệu năng | System | Medium | Not Run |
| [ST-NFR-003](#st-nfr-003) | Tìm kiếm ≤ 2 giây | Hiệu năng | System | Medium | Not Run |
| [ST-NFR-004](#st-nfr-004) | Báo cáo ≤ 5 giây | Hiệu năng | System | Low | Blocked |
| [ST-NFR-005](#st-nfr-005) | 100 người dùng đăng nhập đồng thời | Hiệu năng | System | Medium | Blocked |

## Tài chính & báo cáo

### UT-VAL-012

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-012 |
| Test Name | Validator điều chỉnh công nợ: giá trị mới bằng hiện tại, thời gian tương lai, mô tả > 500 ký tự |
| Module | Tài chính & báo cáo |
| Requirement ID | — |
| Use Case ID | UC-98 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Giá trị biên, Kiểm thử âm |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Validate AdjustCustomerDebtCommand và AdjustSupplierDebtCommand với từng trường hợp |
| Expected Result | • Mỗi trường hợp lỗi MSG71 (E98.1) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-FIN-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-FIN-001 |
| Test Name | Phiếu thu phân bổ vào hoá đơn còn nợ cũ nhất trước |
| Module | Tài chính & báo cáo |
| Requirement ID | BR-15, BR-46 |
| Use Case ID | UC-84 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/customers/{id}/payments |
| Preconditions | KH1 nợ HĐ1 300.000 (cũ), HĐ2 500.000 |
| Test Data | Thu 400.000 |
| Test Steps | 1. Ghi phiếu thu |
| Expected Result | • HĐ1 hết nợ, HĐ2 còn 400.000<br>• Công nợ KH1 = 400.000 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-FIN-002

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-FIN-002 |
| Test Name | Số tiền phiếu thu: 0, bằng dư nợ, vượt dư nợ |
| Module | Tài chính & báo cáo |
| Requirement ID | BR-46 |
| Use Case ID | UC-84 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Giá trị biên |
| API liên quan | POST /api/customers/{id}/payments |
| Preconditions | — |
| Test Data | Dư nợ 800.000: thu 0; 800.000; 800.001 |
| Test Steps | 1. Ghi từng phiếu |
| Expected Result | • 0 bị từ chối MSG59<br>• 800.000 thành công<br>• 800.001 bị từ chối |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-FIN-003

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-FIN-003 |
| Test Name | Huỷ phiếu thu hoàn lại công nợ; sửa phiếu chỉ đổi thời gian, phương thức, ghi chú |
| Module | Tài chính & báo cáo |
| Requirement ID | BR-46 |
| Use Case ID | UC-84 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái, Kiểm thử âm |
| API liên quan | PUT /api/customers/{id}/receipts/{code}; POST /api/customers/{id}/receipts/{code}/cancel |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Sửa ghi chú phiếu<br>2. Thử sửa số tiền<br>3. Huỷ phiếu |
| Expected Result | • Sửa ghi chú thành công<br>• Số tiền không đổi được<br>• Huỷ: công nợ tăng lại đúng số tiền phiếu |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-FIN-004

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-FIN-004 |
| Test Name | Phiếu chi NCC giảm công nợ NCC |
| Module | Tài chính & báo cáo |
| Requirement ID | BR-25, BR-46 |
| Use Case ID | UC-85 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/suppliers/{id}/payments |
| Preconditions | — |
| Test Data | Công nợ N1 1.000.000, chi 600.000 |
| Test Steps | 1. Ghi phiếu chi |
| Expected Result | • Công nợ N1 = 400.000; phiếu phân bổ vào phiếu nhập còn nợ |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-FIN-005

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-FIN-005 |
| Test Name | Điều chỉnh công nợ khách / NCC và huỷ điều chỉnh |
| Module | Tài chính & báo cáo |
| Requirement ID | BR-15, BR-25 |
| Use Case ID | UC-98 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/customers/{id}/debt-adjustments; POST /api/customers/{id}/debt-adjustments/{code}/cancel; POST /api/suppliers/{id}/debt-adjustments |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Điều chỉnh nợ KH1 từ 400.000 thành 350.000<br>2. Huỷ điều chỉnh<br>3. Điều chỉnh công nợ N1 |
| Expected Result | • Nợ KH1 = 350.000<br>• Huỷ: về 400.000<br>• Công nợ N1 đổi đúng giá trị mới |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-CONC-005

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-CONC-005 |
| Test Name | Hai phiếu thu đồng thời vượt dư nợ |
| Module | Tài chính & báo cáo |
| Requirement ID | BR-46 |
| Use Case ID | UC-84 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Đồng thời |
| API liên quan | POST /api/customers/{id}/payments |
| Preconditions | — |
| Test Data | Dư nợ 500.000; hai phiếu 300.000 song song |
| Test Steps | 1. Gửi song song |
| Expected Result | • Không để công nợ âm; tổng thu không vượt 500.000 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-FIN-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-FIN-001 |
| Test Name | Báo cáo công nợ, nhập – xuất – tồn, doanh thu – lợi nhuận, chi phí |
| Module | Tài chính & báo cáo |
| Requirement ID | BR-47 |
| Use Case ID | UC-86, UC-87, UC-88, UC-89 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Gọi API báo cáo theo kỳ |
| Expected Result | • Số liệu chỉ từ giao dịch đã xác nhận; khớp chứng từ nguồn |
| Actual Result | — |
| Status | Blocked |
| Evidence | — |
| Ghi chú | Chưa có API báo cáo (UC-86 – UC-89 "Chưa có code"). |

### API-FIN-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-FIN-002 |
| Test Name | Dashboard quản lý: KPI và việc chờ duyệt |
| Module | Tài chính & báo cáo |
| Requirement ID | — |
| Use Case ID | UC-90 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Mở dashboard Manager |
| Expected Result | • Hiện KPI, việc chờ duyệt; xuất .xlsx / .pdf |
| Actual Result | — |
| Status | Blocked |
| Evidence | — |
| Ghi chú | /dashboard hiện là bảng quản trị của Admin. |

### ST-FIN-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-FIN-001 |
| Test Name | Phiếu thu, phiếu chi, điều chỉnh nợ, huỷ phiếu; số dư và lịch sử |
| Module | Tài chính & báo cáo |
| Requirement ID | BR-15, BR-25, BR-46 |
| Use Case ID | UC-29, UC-66, UC-83, UC-84, UC-85, UC-98 |
| Test Type | System |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Thu nợ khách phân bổ hoá đơn<br>2. Sửa ghi chú, huỷ phiếu thu<br>3. Chi NCC<br>4. Điều chỉnh nợ khách, huỷ điều chỉnh |
| Expected Result | • Số dư khách / NCC khớp tổng chứng từ<br>• Lịch sử công nợ đủ dòng<br>• Trạng thái cuối khớp giữa giao diện, API và database |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Cài đặt

### UT-CODE-001

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-CODE-001 |
| Test Name | Định dạng mã chứng từ theo quy tắc SEQUENTIAL / DATETIME / RANDOM |
| Module | Cài đặt |
| Requirement ID | BR-06 |
| Use Case ID | UC-97 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | Tiền tố HD, số thứ tự 7 |
| Test Steps | 1. Định dạng mã với từng quy tắc |
| Expected Result | • SEQUENTIAL: HD + số có đệm 0<br>• DATETIME: HD + thời điểm<br>• RANDOM: HD + chuỗi ngẫu nhiên; độ dài đúng cấu hình |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Phần định dạng thuần nằm trong TransactionCodeGenerator (Infrastructure); sequence kiểm ở IT-SET-001. |

### IT-SET-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SET-001 |
| Test Name | Sinh mã chứng từ từ sequence không trùng khi chạy song song |
| Module | Cài đặt |
| Requirement ID | BR-06 |
| Use Case ID | UC-97 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Đồng thời |
| API liên quan | POST /api/orders/pos |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Gửi song song 20 hoá đơn hợp lệ |
| Expected Result | • 20 mã khác nhau, đúng tiền tố và quy tắc trong cài đặt |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-SET-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SET-001 |
| Test Name | Cài đặt đơn hàng: biên giá trị, quyền Admin đổi quy tắc giao dịch |
| Module | Cài đặt |
| Requirement ID | BR-06 |
| Use Case ID | UC-97 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Giá trị biên, Bảo mật |
| API liên quan | GET /api/order-settings; PUT /api/order-settings; GET /api/settings/debt-warning; PUT /api/settings/debt-warning |
| Preconditions | — |
| Test Data | Số ngày nợ 0, 3650, 3651; tiền tố 10 và 11 ký tự |
| Test Steps | 1. Lưu từng giá trị<br>2. manager01 đổi quy tắc mã chứng từ |
| Expected Result | • 0, 3650 và tiền tố 10 ký tự đạt<br>• 3651 và 11 ký tự: MSG01<br>• manager01 đổi quy tắc: MSG73 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-SET-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-SET-001 |
| Test Name | Cài đặt đơn hàng và cảnh báo công nợ có hiệu lực ngay |
| Module | Cài đặt |
| Requirement ID | BR-12, BR-16 |
| Use Case ID | UC-97 |
| Test Type | System |
| Priority | High |
| Kỹ thuật | Bảng quyết định |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tắt bán âm, bán vượt tồn ở POS<br>2. Bật bán âm, bán lại<br>3. Đổi tiền tố mã hoá đơn, tạo hoá đơn<br>4. Bật cho nợ vượt hạn mức |
| Expected Result | • MSG28<br>• Hoàn tất<br>• Mã mới đúng tiền tố<br>• Bán chịu vượt hạn mức hoàn tất |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Hiệu năng

### ST-NFR-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-NFR-001 |
| Test Name | Yêu cầu thường: 95% ≤ 2 giây |
| Module | Hiệu năng |
| Requirement ID | NFR-PERF-01 |
| Use Case ID | — |
| Test Type | System |
| Priority | Medium |
| Kỹ thuật | Hiệu năng |
| API liên quan | — |
| Preconditions | — |
| Test Data | Bộ dữ liệu chuẩn (chốt ở Phase 8) |
| Test Steps | 1. Đo 200 lần các GET danh sách chính |
| Expected Result | • p95 ≤ 2 giây (không tính độ trễ mạng của máy khách) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-NFR-002

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-NFR-002 |
| Test Name | Giao dịch thường ≤ 3 giây |
| Module | Hiệu năng |
| Requirement ID | NFR-PERF-02 |
| Use Case ID | — |
| Test Type | System |
| Priority | Medium |
| Kỹ thuật | Hiệu năng |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đo lưu đơn đặt, hoàn tất POS, hoàn thành phiếu nhập, xuất NVL, nhập TP, hoàn thành kiểm kê |
| Expected Result | • Mỗi giao dịch ≤ 3 giây |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-NFR-003

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-NFR-003 |
| Test Name | Tìm kiếm ≤ 2 giây |
| Module | Hiệu năng |
| Requirement ID | NFR-PERF-03 |
| Use Case ID | — |
| Test Type | System |
| Priority | Medium |
| Kỹ thuật | Hiệu năng |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tìm hàng hoá, đơn, khách hàng, tồn kho trên bộ dữ liệu chuẩn |
| Expected Result | • ≤ 2 giây |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-NFR-004

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-NFR-004 |
| Test Name | Báo cáo ≤ 5 giây |
| Module | Hiệu năng |
| Requirement ID | NFR-PERF-04 |
| Use Case ID | — |
| Test Type | System |
| Priority | Low |
| Kỹ thuật | Hiệu năng |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Mở báo cáo chuẩn |
| Expected Result | • ≤ 5 giây |
| Actual Result | — |
| Status | Blocked |
| Evidence | — |
| Ghi chú | Chưa có báo cáo (UC-86 – UC-90). |

### ST-NFR-005

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-NFR-005 |
| Test Name | 100 người dùng đăng nhập đồng thời |
| Module | Hiệu năng |
| Requirement ID | NFR-PERF-05 |
| Use Case ID | — |
| Test Type | System |
| Priority | Medium |
| Kỹ thuật | Hiệu năng, Đồng thời |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Mô phỏng 100 phiên làm các thao tác đọc và giao dịch |
| Expected Result | • Không lỗi chức năng; đạt NFR-PERF-01, 02 |
| Actual Result | — |
| Status | Blocked |
| Evidence | — |
| Ghi chú | Cần công cụ tải (chờ duyệt cùng Q1). |

## Ngoài phạm vi

### API-OOS-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-OOS-001 |
| Test Name | Các UC và BR đã loại khỏi phạm vi |
| Module | Ngoài phạm vi |
| Requirement ID | BR-20, BR-28 |
| Use Case ID | UC-34, UC-42, UC-75, UC-76, UC-81 |
| Test Type | API |
| Priority | Low |
| Kỹ thuật | — |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Không thực hiện |
| Expected Result | • — |
| Actual Result | — |
| Status | Skipped |
| Evidence | — |
| Ghi chú | D1, D2, O3 ngày 19/11/2026; Report 3 ghi "Removed". |
