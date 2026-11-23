# Test case – Sản xuất, kế hoạch sản xuất, MRP

- **Ngày lập:** 19/11/2026. **Người phụ trách:** Ninh. **Giai đoạn:** Phase 2 – Test Strategy & Test Design.
- **Sinh tự động** bằng `node specs/qa/test-design/generate.js` từ `specs/qa/test-design/data/*.js`. Sửa dữ liệu rồi chạy lại, không sửa tay file này.
- **Chưa test nào được chạy trong Phase 2.** Trạng thái "Not Run" nghĩa là đã thiết kế, chưa thực thi; không dùng làm bằng chứng đạt.
- **Số test case:** 33.
- Ma trận truy vết: [02_REQUIREMENT_TRACEABILITY_MATRIX.md](../reports/02_REQUIREMENT_TRACEABILITY_MATRIX.md). Chiến lược: [03_TEST_STRATEGY.md](../reports/03_TEST_STRATEGY.md).

## Danh sách

| ID | Tên | Module | Loại | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| [UT-PRD-001](#ut-prd-001) | Nhu cầu NVL = SL × định mức × (1 + hao hụt%) | Sản xuất | Unit | Critical | Not Run |
| [UT-PRD-002](#ut-prd-002) | Nhu cầu NVL với hao hụt 0% | Sản xuất | Unit | High | Not Run |
| [UT-PRD-003](#ut-prd-003) | Làm tròn nhu cầu half-up 2 chữ số ở bước cuối | Sản xuất | Unit | Medium | Not Run |
| [UT-PRD-004](#ut-prd-004) | Nhu cầu vượt giới hạn lưu trữ bị từ chối | Sản xuất | Unit | High | Not Run |
| [UT-PRD-005](#ut-prd-005) | Số còn thiếu = nhu cầu − đã xuất, tối thiểu 0 | Sản xuất | Unit | High | Not Run |
| [UT-PRD-006](#ut-prd-006) | NVL cần cho số thành phẩm đã nhận | Sản xuất | Unit | High | Not Run |
| [UT-PRD-007](#ut-prd-007) | Số thành phẩm sản xuất được từ NVL đã xuất, làm tròn xuống | Sản xuất | Unit | High | Not Run |
| [UT-PRD-008](#ut-prd-008) | Định mức tính ngược từ tổng nhu cầu (4 chữ số) | Sản xuất | Unit | Medium | Not Run |
| [UT-MRP-001](#ut-mrp-001) | Bộ unit MrpPolicy có sẵn: MU-01..38 (công thức theo thời gian, phân bổ, gom kỳ, làm tròn mua) | MRP | Unit | Critical | Not Run |
| [UT-PLN-001](#ut-pln-001) | Bộ unit kế hoạch sản xuất có sẵn (79 ca) | Kế hoạch sản xuất | Unit | High | Not Run |
| [UT-STS-005](#ut-sts-005) | Lệnh sản xuất: bảng trạng thái cho phép thao tác | Sản xuất | Unit | Critical | Not Run |
| [UT-STS-006](#ut-sts-006) | Kế hoạch sản xuất: bảng trạng thái cho phép thao tác | Kế hoạch sản xuất | Unit | Critical | Not Run |
| [UT-VAL-001](#ut-val-001) | RunMrpCommandValidator: biên ngày cuối kỳ | MRP | Unit | High | Not Run |
| [UT-VAL-002](#ut-val-002) | RunMrpCommandValidator: số kho 0, 1, 20, 21 | MRP | Unit | High | Not Run |
| [UT-VAL-011](#ut-val-011) | AdjustMaterialNormCommandValidator: lý do bắt buộc, nhu cầu mới không thấp hơn đã xuất | Sản xuất | Unit | High | Not Run |
| [IT-PRO-001](#it-pro-001) | Luồng sản xuất: kế hoạch → duyệt → lệnh → xuất NVL → nhập thành phẩm | Sản xuất | Integration | Critical | Not Run |
| [IT-PRO-002](#it-pro-002) | Xuất NVL vượt tồn bị chặn | Sản xuất | Integration | Critical | Not Run |
| [IT-PRO-003](#it-pro-003) | Cấp bổ sung vượt nhu cầu phải có lý do | Sản xuất | Integration | High | Not Run |
| [IT-PRO-004](#it-pro-004) | Nhập thành phẩm vượt SL kế hoạch cần xác nhận; NVL đã xuất không đủ thì cảnh báo, không chặn | Sản xuất | Integration | High | Not Run |
| [IT-PRO-005](#it-pro-005) | Không lập lệnh cho thành phẩm không có BOM active | Sản xuất | Integration | High | Not Run |
| [IT-PRO-006](#it-pro-006) | Điều chỉnh định mức không làm nhu cầu thấp hơn đã xuất; không bỏ NVL đã xuất | Sản xuất | Integration | High | Not Run |
| [IT-PRO-007](#it-pro-007) | Xuất NVL theo số thực tế khác nhu cầu | Sản xuất | Integration | High | Not Run |
| [IT-MRP-001](#it-mrp-001) | Lần chạy MRP ghi run, lines, demands trong một transaction | MRP | Integration | High | Not Run |
| [API-PRD-001](#api-prd-001) | Thao tác lệnh sản xuất sai trạng thái | Sản xuất | API | High | Not Run |
| [API-PRD-002](#api-prd-002) | Nhập thành phẩm vào kho không được gán | Sản xuất | API | High | Not Run |
| [API-PLN-001](#api-pln-001) | Bộ API kế hoạch sản xuất có sẵn (pptest.ps1, pptest2–5.ps1) | Kế hoạch sản xuất | API | High | Not Run |
| [API-PLN-002](#api-pln-002) | Lập lệnh vượt số còn lại; huỷ kế hoạch có lệnh chưa huỷ | Kế hoạch sản xuất | API | High | Not Run |
| [API-PLN-003](#api-pln-003) | Production Accountant không được huỷ / đóng kế hoạch | Kế hoạch sản xuất | API | High | Not Run |
| [API-PLN-004](#api-pln-004) | Kế hoạch đã đóng không lập thêm lệnh, không đổi lệnh đã lập | Kế hoạch sản xuất | API | High | Not Run |
| [API-MRP-001](#api-mrp-001) | Bộ API MRP có sẵn (mrptest.ps1, MT-01..37) | MRP | API | Critical | Not Run |
| [API-MRP-002](#api-mrp-002) | MRP: lần chạy không tồn tại, vai trò bán hàng gọi MRP | MRP | API | High | Not Run |
| [ST-PRO-001](#st-pro-001) | Kế hoạch → duyệt → lệnh → xuất NVL (có cấp bổ sung) → nhập thành phẩm (có lỗi) | Sản xuất | System | Critical | Not Run |
| [ST-MRP-001](#st-mrp-001) | Kế hoạch → MRP → NVL thiếu → lập đơn đặt từ đề xuất → nhập → chạy lại MRP → xuất NVL → nhập TP | MRP | System | Critical | Not Run |

## Sản xuất

### UT-PRD-001

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-PRD-001 |
| Test Name | Nhu cầu NVL = SL × định mức × (1 + hao hụt%) |
| Module | Sản xuất |
| Requirement ID | BR-31 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | SL 100, định mức 2,5, hao hụt 3,5% |
| Test Steps | 1. Gọi CalculateRequirement(100, 2.5, 3.5) |
| Expected Result | • Trả 258,75 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-PRD-002

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-PRD-002 |
| Test Name | Nhu cầu NVL với hao hụt 0% |
| Module | Sản xuất |
| Requirement ID | BR-31 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | SL 100, định mức 2,5, hao hụt 0 |
| Test Steps | 1. Gọi CalculateRequirement(100, 2.5, 0) |
| Expected Result | • Trả 250,00 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-PRD-003

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-PRD-003 |
| Test Name | Làm tròn nhu cầu half-up 2 chữ số ở bước cuối |
| Module | Sản xuất |
| Requirement ID | BR-31 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | Medium |
| Kỹ thuật | Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | SL 3, định mức 0,3333, hao hụt 0 |
| Test Steps | 1. Gọi CalculateRequirement(3, 0.3333, 0) |
| Expected Result | • Trả 1,00 (0,9999 làm tròn) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-PRD-004

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-PRD-004 |
| Test Name | Nhu cầu vượt giới hạn lưu trữ bị từ chối |
| Module | Sản xuất |
| Requirement ID | BR-31 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Giá trị biên, Đoán lỗi |
| API liên quan | — |
| Preconditions | — |
| Test Data | SL 10^16, định mức 10 |
| Test Steps | 1. Gọi TryCalculateRequirement(1e16, 10, 0, out r) |
| Expected Result | • Trả false (vượt MaxStoredQuantity 9.999.999.999.999.999,99) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-PRD-005

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-PRD-005 |
| Test Name | Số còn thiếu = nhu cầu − đã xuất, tối thiểu 0 |
| Module | Sản xuất |
| Requirement ID | BR-32 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương, Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | (10, 4) và (10, 12) |
| Test Steps | 1. Gọi CalculateShortage(10, 4)<br>2. Gọi CalculateShortage(10, 12) |
| Expected Result | • Trả 6<br>• Trả 0 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-PRD-006

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-PRD-006 |
| Test Name | NVL cần cho số thành phẩm đã nhận |
| Module | Sản xuất |
| Requirement ID | BR-37 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | Nhu cầu 25 kg cho 50 lốc, đã nhận 30 lốc |
| Test Steps | 1. Gọi MaterialNeededFor(25, 50, 30) |
| Expected Result | • Trả 15 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-PRD-007

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-PRD-007 |
| Test Name | Số thành phẩm sản xuất được từ NVL đã xuất, làm tròn xuống |
| Module | Sản xuất |
| Requirement ID | BR-37 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương, Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | SL kế hoạch 50, nhu cầu 25, đã xuất 15; và nhu cầu 30, đã xuất 10 |
| Test Steps | 1. Gọi ProducibleFromIssued cho hai bộ dữ liệu |
| Expected Result | • Trả 30<br>• Trả 16,66 (không làm tròn lên 16,67) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-PRD-008

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-PRD-008 |
| Test Name | Định mức tính ngược từ tổng nhu cầu (4 chữ số) |
| Module | Sản xuất |
| Requirement ID | BR-31, BR-51 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | SL 100, nhu cầu 258,75, hao hụt 3,5% |
| Test Steps | 1. Gọi CalculateNormFromRequirement(100, 258.75, 3.5) |
| Expected Result | • Trả 2,5000 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-STS-005

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-STS-005 |
| Test Name | Lệnh sản xuất: bảng trạng thái cho phép thao tác |
| Module | Sản xuất |
| Requirement ID | BR-38 |
| Use Case ID | UC-58 |
| Test Type | Unit |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái, Bảng quyết định |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Với NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED kiểm CanCancel, CanClose, CanIssueMaterial, CanReceiveFinishedGoods, CanApproveCompletion, CanAdjustNorm |
| Expected Result | • NOT_STARTED: huỷ, xuất NVL, điều chỉnh định mức<br>• IN_PROGRESS: đóng, xuất NVL, nhập TP, duyệt hoàn thành, điều chỉnh định mức<br>• COMPLETED / CANCELLED: không thao tác nào |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-VAL-011

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-011 |
| Test Name | AdjustMaterialNormCommandValidator: lý do bắt buộc, nhu cầu mới không thấp hơn đã xuất |
| Module | Sản xuất |
| Requirement ID | BR-51, BR-52 |
| Use Case ID | UC-59 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Kiểm thử âm, Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Validate điều chỉnh không lý do<br>2. Validate nhu cầu mới < đã xuất |
| Expected Result | • Cả hai bị từ chối |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-PRO-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-PRO-001 |
| Test Name | Luồng sản xuất: kế hoạch → duyệt → lệnh → xuất NVL → nhập thành phẩm |
| Module | Sản xuất |
| Requirement ID | BR-30, BR-31, BR-32, BR-33, BR-36, BR-38, FLOW-03 |
| Use Case ID | UC-92, UC-95, UC-46, UC-49 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | POST /api/production/plans; POST /api/production/plans/{id:int}/submit; POST /api/production/plans/{id:int}/approve; POST /api/production/plans/{id:int}/orders; POST /api/production/material-issues; POST /api/production/finished-goods-receipts |
| Preconditions | TP1 có BOM active: NVL1 2 kg/sp, hao hụt 5%; NVL1 tồn 300 |
| Test Data | Kế hoạch TP1 × 100; lập lệnh 100; xuất 210; nhận 98 đạt + 2 lỗi |
| Test Steps | 1. Lập, gửi, duyệt kế hoạch<br>2. Lập lệnh<br>3. Xuất NVL<br>4. Nhập thành phẩm |
| Expected Result | • Nhu cầu NVL1 = 210<br>• Lệnh IN_PROGRESS sau xuất lần đầu; tồn NVL1 = 90; thẻ kho xuất NVL<br>• Tồn TP1 + 98 (lô mới); 2 lỗi không vào tồn bán được<br>• Lệnh lưu luỹ kế nhận |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-PRO-002

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-PRO-002 |
| Test Name | Xuất NVL vượt tồn bị chặn |
| Module | Sản xuất |
| Requirement ID | BR-33 |
| Use Case ID | UC-46 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Giá trị biên |
| API liên quan | POST /api/production/material-issues |
| Preconditions | — |
| Test Data | NVL1 tồn 50, xuất 51 |
| Test Steps | 1. Xuất |
| Expected Result | • Bị từ chối MSG28; tồn không đổi |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-PRO-003

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-PRO-003 |
| Test Name | Cấp bổ sung vượt nhu cầu phải có lý do |
| Module | Sản xuất |
| Requirement ID | BR-34 |
| Use Case ID | UC-47 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Bảng quyết định |
| API liên quan | POST /api/production/material-issues |
| Preconditions | — |
| Test Data | Nhu cầu 210, đã xuất 210, cấp thêm 10 không lý do / có lý do |
| Test Steps | 1. Cấp thêm không lý do<br>2. Cấp thêm có lý do |
| Expected Result | • Lần 1 bị từ chối<br>• Lần 2 thành công; luỹ kế 220; thiếu = 0 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-PRO-004

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-PRO-004 |
| Test Name | Nhập thành phẩm vượt SL kế hoạch cần xác nhận; NVL đã xuất không đủ thì cảnh báo, không chặn |
| Module | Sản xuất |
| Requirement ID | BR-35, BR-37 |
| Use Case ID | UC-49 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Giá trị biên, Bảng quyết định |
| API liên quan | GET /api/production/finished-goods-receipts/check; POST /api/production/finished-goods-receipts |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Kiểm nhập 105 khi kế hoạch 100<br>2. Nhập khi NVL đã xuất chỉ đủ 90 sp |
| Expected Result | • Hệ thống yêu cầu xác nhận trước khi lưu<br>• Hiện cảnh báo, bắt ghi chú, đánh dấu cho Manager; phiếu vẫn lưu |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-PRO-005

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-PRO-005 |
| Test Name | Không lập lệnh cho thành phẩm không có BOM active |
| Module | Sản xuất |
| Requirement ID | BR-30 |
| Use Case ID | UC-59 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Kiểm thử âm |
| API liên quan | POST /api/production/plans/{id:int}/orders |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Ngừng BOM của TP1 rồi lập lệnh |
| Expected Result | • Bị từ chối MSG58 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-PRO-006

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-PRO-006 |
| Test Name | Điều chỉnh định mức không làm nhu cầu thấp hơn đã xuất; không bỏ NVL đã xuất |
| Module | Sản xuất |
| Requirement ID | BR-51, BR-52 |
| Use Case ID | UC-59 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Giá trị biên, Kiểm thử âm |
| API liên quan | POST /api/production/orders/{id:int}/adjust-norms |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đặt nhu cầu mới < đã xuất<br>2. Bỏ NVL đã xuất<br>3. Điều chỉnh hợp lệ có lý do |
| Expected Result | • Hai lệnh đầu bị từ chối<br>• Lệnh 3 thành công; BOM không đổi |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-PRO-007

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-PRO-007 |
| Test Name | Xuất NVL theo số thực tế khác nhu cầu |
| Module | Sản xuất |
| Requirement ID | BR-32, BR-33 |
| Use Case ID | UC-46, UC-48 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Giá trị biên |
| API liên quan | POST /api/production/material-issues; GET /api/production/orders/{id:int} |
| Preconditions | — |
| Test Data | Nhu cầu NVL1 210; xuất thực tế 150, rồi 60 |
| Test Steps | 1. Xuất 150<br>2. Xem chi tiết lệnh<br>3. Xuất 60 |
| Expected Result | • Tồn trừ 150; đã xuất 150; thiếu 60<br>• Sau lần 2: đã xuất 210; thiếu 0<br>• Mỗi lần xuất tham chiếu mã lệnh |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-PRD-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-PRD-001 |
| Test Name | Thao tác lệnh sản xuất sai trạng thái |
| Module | Sản xuất |
| Requirement ID | BR-38 |
| Use Case ID | UC-58 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái, Kiểm thử âm |
| API liên quan | POST /api/production/material-issues; POST /api/production/orders/{id:int}/approve; POST /api/production/orders/{id:int}/cancel; POST /api/production/orders/{id:int}/close |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Xuất NVL cho lệnh COMPLETED<br>2. Duyệt hoàn thành lệnh NOT_STARTED<br>3. Huỷ lệnh IN_PROGRESS<br>4. Đóng lệnh không lý do |
| Expected Result | • MSG17 cho 3 ca đầu<br>• Đóng sớm phải có lý do (BR-38) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-PRD-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-PRD-002 |
| Test Name | Nhập thành phẩm vào kho không được gán |
| Module | Sản xuất |
| Requirement ID | BR-04 |
| Use Case ID | UC-49 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Bảo mật |
| API liên quan | POST /api/production/finished-goods-receipts |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. prodstaff01 nhập TP vào kho không có quyền |
| Expected Result | • MSG04 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-PRO-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-PRO-001 |
| Test Name | Kế hoạch → duyệt → lệnh → xuất NVL (có cấp bổ sung) → nhập thành phẩm (có lỗi) |
| Module | Sản xuất |
| Requirement ID | BR-30, BR-31, BR-32, BR-34, BR-35, BR-36, BR-38, FLOW-03 |
| Use Case ID | UC-44, UC-45, UC-46, UC-47, UC-49, UC-50, UC-58, UC-60, UC-61, UC-93, UC-94, UC-95 |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. prodstaff01 lập kế hoạch, gửi duyệt<br>2. manager01 duyệt, lập lệnh<br>3. prodstaff01 xuất NVL, cấp bổ sung có lý do<br>4. Nhập thành phẩm: đạt + lỗi<br>5. Manager duyệt hoàn thành |
| Expected Result | • Trạng thái kế hoạch và lệnh đúng BR-38<br>• Nhu cầu, đã xuất, thiếu đúng<br>• Thành phẩm đạt vào kho có lô; lỗi không vào tồn bán được<br>• Trạng thái cuối khớp giữa giao diện, API và database |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Kế hoạch sản xuất

### UT-PLN-001

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-PLN-001 |
| Test Name | Bộ unit kế hoạch sản xuất có sẵn (79 ca) |
| Module | Kế hoạch sản xuất |
| Requirement ID | BR-PP-01..08, BR-PP-09..15, BR-PP-16..21, BR-PP-22..24 |
| Use Case ID | UC-92, UC-93, UC-94, UC-95, UC-96 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương, Giá trị biên, Chuyển trạng thái |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. dotnet run --project specs/production-planning-implementation/unit-tests -c Release |
| Expected Result | • 79/79 đạt |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Có sẵn; theo 04-testing-report.md lần chạy 15/11/2026: 79/79. |

### UT-STS-006

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-STS-006 |
| Test Name | Kế hoạch sản xuất: bảng trạng thái cho phép thao tác |
| Module | Kế hoạch sản xuất |
| Requirement ID | BR-PP-09..15, BR-PP-22..24 |
| Use Case ID | UC-92 |
| Test Type | Unit |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái, Bảng quyết định |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Với DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, CLOSED, CANCELLED kiểm CanEditAll, CanSubmit, CanApprove, CanReject, CanClose, CanCancel, CanCreateOrder |
| Expected Result | • DRAFT / REJECTED: sửa toàn bộ, gửi duyệt, huỷ<br>• PENDING_APPROVAL: duyệt, từ chối, huỷ<br>• APPROVED: sửa giới hạn, đóng, huỷ, lập lệnh<br>• CLOSED / CANCELLED: không thao tác nào |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-PLN-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-PLN-001 |
| Test Name | Bộ API kế hoạch sản xuất có sẵn (pptest.ps1, pptest2–5.ps1) |
| Module | Kế hoạch sản xuất |
| Requirement ID | BR-PP-01..08, BR-PP-09..15, BR-PP-16..21, BR-PP-22..24 |
| Use Case ID | UC-92, UC-93, UC-94, UC-95, UC-96 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương, Giá trị biên, Chuyển trạng thái |
| API liên quan | POST /api/production/plans; PUT /api/production/plans/{id:int}; POST /api/production/plans/{id:int}/submit; POST /api/production/plans/{id:int}/approve; POST /api/production/plans/{id:int}/reject; POST /api/production/plans/{id:int}/close; POST /api/production/plans/{id:int}/cancel; POST /api/production/plans/{id:int}/orders; POST /api/production/plans/material-requirements/preview |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chạy các script trên database tạm (env.ps1) |
| Expected Result | • Mọi ca đạt (lần gần nhất: 101 ca ghi trong results*.json) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Có sẵn trong specs/production-planning-implementation/api-tests. |

### API-PLN-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-PLN-002 |
| Test Name | Lập lệnh vượt số còn lại; huỷ kế hoạch có lệnh chưa huỷ |
| Module | Kế hoạch sản xuất |
| Requirement ID | BR-PP-16..21, BR-PP-22..24 |
| Use Case ID | UC-95, UC-96 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Giá trị biên, Kiểm thử âm |
| API liên quan | POST /api/production/plans/{id:int}/orders; POST /api/production/plans/{id:int}/cancel |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Lập lệnh 101 khi còn 100<br>2. Huỷ kế hoạch có lệnh đang mở |
| Expected Result | • MSG69<br>• MSG70 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-PLN-003

| Trường | Nội dung |
|---|---|
| Test Case ID | API-PLN-003 |
| Test Name | Production Accountant không được huỷ / đóng kế hoạch |
| Module | Kế hoạch sản xuất |
| Requirement ID | BR-02 |
| Use Case ID | UC-96 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Bảo mật |
| API liên quan | POST /api/production/plans/{id:int}/cancel; POST /api/production/plans/{id:int}/close |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. prodstaff01 huỷ kế hoạch APPROVED<br>2. prodstaff01 đóng kế hoạch |
| Expected Result | • 403 (UC-96 thuộc Manager) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Nghi vấn N-07: huỷ chỉ cần PROD_UPDATE (Production Accountant có). |

### API-PLN-004

| Trường | Nội dung |
|---|---|
| Test Case ID | API-PLN-004 |
| Test Name | Kế hoạch đã đóng không lập thêm lệnh, không đổi lệnh đã lập |
| Module | Kế hoạch sản xuất |
| Requirement ID | BR-PP-16..21, BR-PP-22..24 |
| Use Case ID | UC-96 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | POST /api/production/plans/{id:int}/close; POST /api/production/plans/{id:int}/orders; POST /api/production/orders/{id:int}/adjust-norms |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đóng kế hoạch còn 40 chưa lập lệnh<br>2. Lập lệnh từ kế hoạch đã đóng<br>3. Điều chỉnh định mức lệnh đã lập của kế hoạch |
| Expected Result | • Lập lệnh bị từ chối (MSG17)<br>• Điều chỉnh định mức chỉ đổi nhu cầu NVL, không đổi SL thành phẩm của lệnh |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Nghi vấn N-06 (S-01): UpdateProductionOrderCommand đã không còn trong code (kiểm 19/11/2026), ca này xác nhận lại. |

## MRP

### UT-MRP-001

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-MRP-001 |
| Test Name | Bộ unit MrpPolicy có sẵn: MU-01..38 (công thức theo thời gian, phân bổ, gom kỳ, làm tròn mua) |
| Module | MRP |
| Requirement ID | BR-MRP-01..09, BR-MRP-10..17, BR-MRP-18..22, BR-MRP-23..29 |
| Use Case ID | UC-100, UC-101, UC-104 |
| Test Type | Unit |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương, Giá trị biên, Bảng quyết định |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. dotnet run --project specs/mrp/unit-tests -c Release |
| Expected Result | • 38/38 đạt |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Có sẵn trong specs/mrp/unit-tests; lần chạy gần nhất 18/11/2026: 38/38. Phase 3 chuyển sang xUnit nếu Q1 được duyệt. |

### UT-VAL-001

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-001 |
| Test Name | RunMrpCommandValidator: biên ngày cuối kỳ |
| Module | MRP |
| Requirement ID | BR-MRP-30..33 |
| Use Case ID | UC-101 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | Hôm nay T: T−1, T, T+366, T+367 |
| Test Steps | 1. Validate từng giá trị PeriodEnd với 1 kho |
| Expected Result | • T−1 lỗi MSG76<br>• T đạt<br>• T+366 đạt<br>• T+367 lỗi MSG76 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-VAL-002

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-002 |
| Test Name | RunMrpCommandValidator: số kho 0, 1, 20, 21 |
| Module | MRP |
| Requirement ID | BR-MRP-30..33 |
| Use Case ID | UC-101 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Validate WarehouseIds với 0, 1, 20, 21 phần tử |
| Expected Result | • 0 và 21 lỗi MSG77<br>• 1 và 20 đạt |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-MRP-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-MRP-001 |
| Test Name | Lần chạy MRP ghi run, lines, demands trong một transaction |
| Module | MRP |
| Requirement ID | BR-MRP-30..33, NFR-REL-02 |
| Use Case ID | UC-101 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Đoán lỗi |
| API liên quan | POST /api/production/mrp/runs |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chạy MRP hợp lệ<br>2. Chạy MRP với SL làm tràn giới hạn lưu |
| Expected Result | • Lần 1: 1 trx_mrp_runs + dòng lines + demands khớp material_count<br>• Lần 2 bị từ chối; không có bản ghi run mới |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-MRP-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-MRP-001 |
| Test Name | Bộ API MRP có sẵn (mrptest.ps1, MT-01..37) |
| Module | MRP |
| Requirement ID | BR-MRP-01..09, BR-MRP-10..17, BR-MRP-18..22, BR-MRP-23..29, BR-MRP-30..33 |
| Use Case ID | UC-100, UC-101, UC-102, UC-103, UC-104, UC-105 |
| Test Type | API |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương, Giá trị biên, Bảng quyết định, Chuyển trạng thái |
| API liên quan | POST /api/production/mrp/runs; GET /api/production/mrp/runs; GET /api/production/mrp/runs/{id:int}; GET /api/production/mrp/runs/{id:int}/daily-requirements; GET /api/production/mrp/runs/{id:int}/monthly-demand; GET /api/production/mrp/runs/{id:int}/shortages; GET /api/production/mrp/runs/{id:int}/materials/{materialId:int}/projection; GET /api/production/mrp/runs/{id:int}/purchase-suggestions |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chạy specs/mrp/api-tests/mrptest.ps1 trên database tạm |
| Expected Result | • 37/37 đạt (lần gần nhất 18/11/2026) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Có sẵn; phủ cả phân quyền kho và cảnh báo lỗi thời. |

### API-MRP-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-MRP-002 |
| Test Name | MRP: lần chạy không tồn tại, vai trò bán hàng gọi MRP |
| Module | MRP |
| Requirement ID | BR-02, BR-MRP-30..33 |
| Use Case ID | UC-100 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Kiểm thử âm, Bảo mật |
| API liên quan | GET /api/production/mrp/runs/{id:int}; POST /api/production/mrp/runs |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đọc lần chạy id 999999<br>2. sales01 chạy MRP |
| Expected Result | • MSG79<br>• 403 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-MRP-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-MRP-001 |
| Test Name | Kế hoạch → MRP → NVL thiếu → lập đơn đặt từ đề xuất → nhập → chạy lại MRP → xuất NVL → nhập TP |
| Module | MRP |
| Requirement ID | BR-MRP-01..09, BR-MRP-10..17, BR-MRP-18..22, BR-MRP-23..29, BR-MRP-30..33, FLOW-03 |
| Use Case ID | UC-100, UC-101, UC-102, UC-103, UC-104, UC-105 |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | — |
| Preconditions | NVL1 thời gian giao 7 ngày, NVL2 chưa khai báo; kế hoạch duyệt bắt đầu T+10 |
| Test Data | — |
| Test Steps | 1. Chạy MRP kỳ 30 ngày<br>2. Xem NVL thiếu, theo ngày / tuần, tồn dự phóng<br>3. Lập đơn đặt từ đề xuất, chọn NCC, lưu<br>4. Mở lại lần chạy<br>5. Nhập hàng, chạy lại MRP<br>6. Lập lệnh, xuất NVL, nhập TP |
| Expected Result | • NVL1 Kịp đặt, NVL2 Chưa có thời gian giao<br>• Đơn đặt điền sẵn mỗi NVL một dòng, SL làm tròn lên<br>• Lần chạy cũ hiện cảnh báo lỗi thời (MSG78)<br>• Lần chạy mới không còn thiếu<br>• Trạng thái cuối khớp giữa giao diện, API và database |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |
