# Test case – Đặt hàng nhập, nhập hàng, trả hàng NCC, nhà cung cấp

- **Ngày lập:** 19/11/2026. **Người phụ trách:** Ninh. **Giai đoạn:** Phase 2 – Test Strategy & Test Design.
- **Sinh tự động** bằng `node specs/qa/test-design/generate.js` từ `specs/qa/test-design/data/*.js`. Sửa dữ liệu rồi chạy lại, không sửa tay file này.
- **Chưa test nào được chạy trong Phase 2.** Trạng thái "Not Run" nghĩa là đã thiết kế, chưa thực thi; không dùng làm bằng chứng đạt.
- **Số test case:** 23.
- Ma trận truy vết: [02_REQUIREMENT_TRACEABILITY_MATRIX.md](../reports/02_REQUIREMENT_TRACEABILITY_MATRIX.md). Chiến lược: [03_TEST_STRATEGY.md](../reports/03_TEST_STRATEGY.md).

## Danh sách

| ID | Tên | Module | Loại | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| [UT-COST-001](#ut-cost-001) | MAC khi kho chưa có hàng bằng đơn giá nhập (làm tròn 2 số) | Nhập hàng | Unit | Critical | Not Run |
| [UT-COST-002](#ut-cost-002) | MAC bình quân gia quyền khi đã có tồn | Nhập hàng | Unit | Critical | Not Run |
| [UT-COST-003](#ut-cost-003) | Nhập số lượng 0 không đổi MAC | Nhập hàng | Unit | High | Not Run |
| [UT-COST-004](#ut-cost-004) | Tồn âm trước khi nhập: MAC lấy đơn giá nhập | Nhập hàng | Unit | High | Not Run |
| [UT-COST-005](#ut-cost-005) | Làm tròn half-up 2 chữ số | Nhập hàng | Unit | Medium | Not Run |
| [UT-VAL-004](#ut-val-004) | Ngày giao dự kiến không trước ngày đặt | Đặt hàng nhập | Unit | High | Not Run |
| [IT-INV-001](#it-inv-001) | Nhập kho hoàn thành: phiếu, dòng, tồn, thẻ kho, MAC, công nợ NCC | Nhập hàng | Integration | Critical | Not Run |
| [IT-INV-002](#it-inv-002) | Hàng lỗi khi nhận không vào kho, không tính tiền | Nhập hàng | Integration | Critical | Not Run |
| [IT-INV-003](#it-inv-003) | Lỗi giữa chừng không để lại dữ liệu dở dang (rollback) | Nhập hàng | Integration | Critical | Not Run |
| [IT-INV-004](#it-inv-004) | Hoàn thành phiếu nhập tạm | Nhập hàng | Integration | High | Not Run |
| [IT-INV-005](#it-inv-005) | Huỷ phiếu nhập đã hoàn thành đảo tồn và công nợ | Nhập hàng | Integration | High | Not Run |
| [IT-PO-001](#it-po-001) | Nhận hàng trên đơn đặt: đơn chuyển Nhập một phần rồi Hoàn thành | Đặt hàng nhập | Integration | Critical | Not Run |
| [IT-PO-002](#it-po-002) | Gộp đơn đặt cùng NCC giữ ngày giao dự kiến sớm nhất | Đặt hàng nhập | Integration | High | Not Run |
| [IT-PO-003](#it-po-003) | Không sửa / huỷ đơn đặt đã có phiếu nhập | Đặt hàng nhập | Integration | High | Not Run |
| [IT-PR-001](#it-pr-001) | Trả hàng NCC: tồn giảm, công nợ NCC giảm, không vượt SL đã nhận | Trả hàng NCC | Integration | Critical | Not Run |
| [API-PO-001](#api-po-001) | Đơn đặt thiếu NCC / dòng hàng / SL ≤ 0; ngày giao trước ngày đặt | Đặt hàng nhập | API | High | Not Run |
| [API-PO-002](#api-po-002) | Warehouse Accountant sửa, huỷ, kết thúc, gộp đơn đặt | Đặt hàng nhập | API | High | Not Run |
| [API-GR-001](#api-gr-001) | Nhập hàng kho không có quyền, SL âm, thiếu NCC | Nhập hàng | API | High | Not Run |
| [API-GR-002](#api-gr-002) | Hàng theo dõi lô bắt buộc số lô và hạn dùng khi nhập | Nhập hàng | API | Medium | Blocked |
| [API-SUP-001](#api-sup-001) | Warehouse Accountant ghi phiếu chi NCC và nhận tiền NCC hoàn | Nhà cung cấp | API | High | Not Run |
| [API-SUP-002](#api-sup-002) | Phiếu chi NCC: số tiền 0, vượt công nợ; xoá NCC đã có giao dịch | Nhà cung cấp | API | High | Not Run |
| [ST-PUR-001](#st-pur-001) | Mua hàng → nhập kho → tồn → giá vốn → công nợ NCC | Đặt hàng nhập | System | Critical | Not Run |
| [ST-PUR-002](#st-pur-002) | Đặt hàng nhập → nhập → trả NCC → tồn → công nợ NCC | Trả hàng NCC | System | High | Not Run |

## Đặt hàng nhập

### UT-VAL-004

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-004 |
| Test Name | Ngày giao dự kiến không trước ngày đặt |
| Module | Đặt hàng nhập |
| Requirement ID | BR-MRP-30..33 |
| Use Case ID | UC-30 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | Ngày đặt D: D−1, D, D+30, rỗng |
| Test Steps | 1. Gọi PurchaseOrderHelper.ValidateExpectedDate |
| Expected Result | • D−1 lỗi MSG81<br>• D, D+30, rỗng đạt |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-PO-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-PO-001 |
| Test Name | Nhận hàng trên đơn đặt: đơn chuyển Nhập một phần rồi Hoàn thành |
| Module | Đặt hàng nhập |
| Requirement ID | BR-23 |
| Use Case ID | UC-30, UC-31 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | POST /api/purchase-orders; POST /api/purchase-orders/{id:int}/receive |
| Preconditions | — |
| Test Data | Đơn đặt H1 × 100 |
| Test Steps | 1. Nhận 40<br>2. Nhận 60 |
| Expected Result | • Sau lần 1: PARTIAL, đã nhận 40<br>• Sau lần 2: COMPLETED<br>• Mỗi lần tạo 1 phiếu nhập COMPLETED liên kết đơn |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-PO-002

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-PO-002 |
| Test Name | Gộp đơn đặt cùng NCC giữ ngày giao dự kiến sớm nhất |
| Module | Đặt hàng nhập |
| Requirement ID | BR-22, BR-MRP-30..33 |
| Use Case ID | UC-30 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/purchase-orders/merge |
| Preconditions | — |
| Test Data | Đơn A giao D+10, đơn B giao D+5, cùng NCC |
| Test Steps | 1. Gộp A và B |
| Expected Result | • Đơn gộp có ngày giao D+5<br>• Đơn nguồn liên kết đơn gộp |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-PO-003

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-PO-003 |
| Test Name | Không sửa / huỷ đơn đặt đã có phiếu nhập |
| Module | Đặt hàng nhập |
| Requirement ID | BR-22 |
| Use Case ID | UC-30 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái, Kiểm thử âm |
| API liên quan | PUT /api/purchase-orders/{id:int}; POST /api/purchase-orders/{id:int}/cancel |
| Preconditions | Đơn đã nhận 1 phần |
| Test Data | — |
| Test Steps | 1. Sửa SL<br>2. Huỷ đơn |
| Expected Result | • Cả hai bị từ chối MSG17; dữ liệu không đổi |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-PO-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-PO-001 |
| Test Name | Đơn đặt thiếu NCC / dòng hàng / SL ≤ 0; ngày giao trước ngày đặt |
| Module | Đặt hàng nhập |
| Requirement ID | BR-22, BR-MRP-30..33 |
| Use Case ID | UC-30 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Giá trị biên, Kiểm thử âm |
| API liên quan | POST /api/purchase-orders |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Gửi từng request lỗi |
| Expected Result | • MSG01 cho 3 ca đầu<br>• MSG81 cho ngày giao |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-PO-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-PO-002 |
| Test Name | Warehouse Accountant sửa, huỷ, kết thúc, gộp đơn đặt |
| Module | Đặt hàng nhập |
| Requirement ID | BR-02, BR-22 |
| Use Case ID | UC-30 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Bảo mật |
| API liên quan | PUT /api/purchase-orders/{id:int}; POST /api/purchase-orders/{id:int}/cancel; POST /api/purchase-orders/{id:int}/finish; POST /api/purchase-orders/merge |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. whstaff01 gọi từng thao tác trên đơn chưa nhận |
| Expected Result | • 200 (Report 3 mục 2.1: Warehouse Accountant ghi đơn đặt hàng nhập) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Nghi vấn N-07: các endpoint cần PURCHASE_UPDATE, quyền mặc định WarehouseStaff không có. |

### ST-PUR-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-PUR-001 |
| Test Name | Mua hàng → nhập kho → tồn → giá vốn → công nợ NCC |
| Module | Đặt hàng nhập |
| Requirement ID | BR-22, BR-23, BR-24, BR-25, BR-29, FLOW-01 |
| Use Case ID | UC-30, UC-31, UC-32, UC-67, UC-68, UC-70, UC-71 |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo NCC<br>2. Tạo đơn đặt H1 × 100, ngày giao dự kiến<br>3. Nhận 60 (2 lỗi), trả NCC một phần tiền<br>4. Nhận nốt 40<br>5. Xem tồn, MAC, công nợ NCC, thẻ kho |
| Expected Result | • Đơn PARTIAL rồi COMPLETED<br>• Tồn tăng 98; hàng lỗi không vào kho<br>• MAC đúng BR-29<br>• Công nợ NCC = giá trị đạt − đã trả<br>• Trạng thái cuối khớp giữa giao diện, API và database |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Nhập hàng

### UT-COST-001

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-COST-001 |
| Test Name | MAC khi kho chưa có hàng bằng đơn giá nhập (làm tròn 2 số) |
| Module | Nhập hàng |
| Requirement ID | BR-29 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương, Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | Tồn 0, MAC 0, nhập 10 × 123,456 |
| Test Steps | 1. Gọi CalculateMovingAverageCost(0, 0, 10, 123.456) |
| Expected Result | • Trả 123,46 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-COST-002

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-COST-002 |
| Test Name | MAC bình quân gia quyền khi đã có tồn |
| Module | Nhập hàng |
| Requirement ID | BR-29 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | Tồn 10 × 100, nhập 10 × 200 |
| Test Steps | 1. Gọi CalculateMovingAverageCost(10, 100, 10, 200) |
| Expected Result | • Trả 150,00 = (10×100 + 10×200) / 20 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-COST-003

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-COST-003 |
| Test Name | Nhập số lượng 0 không đổi MAC |
| Module | Nhập hàng |
| Requirement ID | BR-29 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | Tồn 10 × 100, nhập 0 × 200 |
| Test Steps | 1. Gọi CalculateMovingAverageCost(10, 100, 0, 200) |
| Expected Result | • Trả 100 (giữ nguyên) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-COST-004

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-COST-004 |
| Test Name | Tồn âm trước khi nhập: MAC lấy đơn giá nhập |
| Module | Nhập hàng |
| Requirement ID | BR-29 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Giá trị biên, Đoán lỗi |
| API liên quan | — |
| Preconditions | — |
| Test Data | Tồn −5 × 100, nhập 10 × 200 |
| Test Steps | 1. Gọi CalculateMovingAverageCost(-5, 100, 10, 200) |
| Expected Result | • Trả 200 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Tài liệu không quy định trường hợp tồn âm; mong đợi theo code (CostingPolicy). Cần nhóm xác nhận. |

### UT-COST-005

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-COST-005 |
| Test Name | Làm tròn half-up 2 chữ số |
| Module | Nhập hàng |
| Requirement ID | BR-29 |
| Use Case ID | — |
| Test Type | Unit |
| Priority | Medium |
| Kỹ thuật | Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | Tồn 1 × 0,005, nhập 1 × 0,005 |
| Test Steps | 1. Gọi CalculateMovingAverageCost(1, 0.005, 1, 0.005) |
| Expected Result | • Trả 0,01 (MidpointRounding.AwayFromZero) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-INV-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-INV-001 |
| Test Name | Nhập kho hoàn thành: phiếu, dòng, tồn, thẻ kho, MAC, công nợ NCC |
| Module | Nhập hàng |
| Requirement ID | BR-23, BR-24, BR-25, BR-29, NFR-REL-02, FLOW-01 |
| Use Case ID | UC-31 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/purchases |
| Preconditions | Kho K001, NCC N1 (công nợ 0), hàng H1 tồn 10 × MAC 100.000, người dùng whstaff01 có quyền K001 |
| Test Data | Phiếu nhập Hoàn thành: H1 SL đạt 10, đơn giá 200.000, trả NCC 500.000 |
| Test Steps | 1. Gửi lệnh tạo phiếu nhập trạng thái Hoàn thành<br>2. Đọc lại các bảng liên quan |
| Expected Result | • trx_goods_receipts COMPLETED, created_by = whstaff01<br>• Tồn H1 tại K001 = 20; MAC = 150.000<br>• Thẻ kho thêm 1 dòng INBOUND_RECEIPT, reference GOODS_RECEIPT = id phiếu<br>• Công nợ N1 tăng 1.500.000 (2.000.000 − 500.000, BR-25)<br>• Σ quantity của trx_inventory_transactions (hàng, kho) = quantity trong trx_inventory_balances |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-INV-002

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-INV-002 |
| Test Name | Hàng lỗi khi nhận không vào kho, không tính tiền |
| Module | Nhập hàng |
| Requirement ID | BR-24 |
| Use Case ID | UC-32 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/purchases |
| Preconditions | — |
| Test Data | H1 SL đạt 8, SL lỗi 2, đơn giá 200 |
| Test Steps | 1. Tạo phiếu nhập Hoàn thành |
| Expected Result | • Tồn tăng 8<br>• Giá trị phiếu = 8 × 200<br>• Dòng phiếu ghi DefectiveQty = 2 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-INV-003

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-INV-003 |
| Test Name | Lỗi giữa chừng không để lại dữ liệu dở dang (rollback) |
| Module | Nhập hàng |
| Requirement ID | NFR-REL-02, NFR-REL-03 |
| Use Case ID | UC-31 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Đoán lỗi |
| API liên quan | POST /api/purchases |
| Preconditions | — |
| Test Data | Phiếu 2 dòng: dòng 1 hợp lệ, dòng 2 product_id không tồn tại |
| Test Steps | 1. Gửi lệnh<br>2. Đếm bản ghi phiếu, tồn, thẻ kho trước / sau |
| Expected Result | • Lệnh thất bại với thông báo lỗi<br>• Không có phiếu nhập mới, tồn và thẻ kho không đổi, công nợ không đổi |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-INV-004

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-INV-004 |
| Test Name | Hoàn thành phiếu nhập tạm |
| Module | Nhập hàng |
| Requirement ID | BR-23 |
| Use Case ID | UC-31 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | POST /api/purchases; PATCH /api/purchases/{id}/complete |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo phiếu DRAFT<br>2. Kiểm tồn không đổi<br>3. Hoàn thành phiếu |
| Expected Result | • DRAFT không đổi tồn<br>• Sau hoàn thành: như IT-INV-001 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-INV-005

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-INV-005 |
| Test Name | Huỷ phiếu nhập đã hoàn thành đảo tồn và công nợ |
| Module | Nhập hàng |
| Requirement ID | BR-15, BR-25 |
| Use Case ID | UC-31 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | PATCH /api/purchases/{id}/cancel |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Huỷ phiếu đã hoàn thành |
| Expected Result | • Tồn giảm lại đúng SL đạt<br>• Công nợ NCC giảm lại<br>• Thẻ kho có dòng đảo |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | BR-15 ghi "huỷ chứng từ thì đảo tác dụng"; nếu tồn hiện tại < SL cần trừ, hệ thống phải báo lỗi rõ. |

### API-GR-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-GR-001 |
| Test Name | Nhập hàng kho không có quyền, SL âm, thiếu NCC |
| Module | Nhập hàng |
| Requirement ID | BR-04 |
| Use Case ID | UC-31 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Kiểm thử âm |
| API liên quan | POST /api/purchases |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Nhập vào K002 (không có quyền)<br>2. SL −1<br>3. Không có NCC |
| Expected Result | • MSG04<br>• MSG01<br>• MSG01 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-GR-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-GR-002 |
| Test Name | Hàng theo dõi lô bắt buộc số lô và hạn dùng khi nhập |
| Module | Nhập hàng |
| Requirement ID | BR-27 |
| Use Case ID | UC-31 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Kiểm thử âm |
| API liên quan | POST /api/purchases |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Nhập hàng có cờ theo dõi lô mà không có số lô |
| Expected Result | • Bị từ chối; khi có số lô thì lưu vào mst_inventory_lots |
| Actual Result | — |
| Status | Blocked |
| Evidence | — |
| Ghi chú | Chưa có cờ "theo dõi lô" trên hàng hoá và nhập hàng không ghi lô (nghi vấn N-10). |

## Trả hàng NCC

### IT-PR-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-PR-001 |
| Test Name | Trả hàng NCC: tồn giảm, công nợ NCC giảm, không vượt SL đã nhận |
| Module | Trả hàng NCC |
| Requirement ID | BR-24, BR-25, FLOW-06 |
| Use Case ID | UC-33 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Giá trị biên |
| API liên quan | POST /api/purchasereturns; POST /api/purchasereturns/{id:int}/refunds |
| Preconditions | — |
| Test Data | Phiếu nhập H1 × 10; trả 3, rồi trả 8 |
| Test Steps | 1. Trả 3<br>2. Trả tiếp 8<br>3. Ghi nhận NCC hoàn tiền |
| Expected Result | • Lần 1: tồn −3, công nợ giảm 3 × giá vốn phiếu<br>• Lần 2 bị từ chối (vượt 7 còn lại)<br>• Hoàn tiền ghi phiếu tài chính |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-PUR-002

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-PUR-002 |
| Test Name | Đặt hàng nhập → nhập → trả NCC → tồn → công nợ NCC |
| Module | Trả hàng NCC |
| Requirement ID | BR-24, BR-25, FLOW-06 |
| Use Case ID | UC-33, UC-69 |
| Test Type | System |
| Priority | High |
| Kỹ thuật | Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Từ phiếu nhập ở ST-PUR-001 tạo phiếu trả NCC 10<br>2. Ghi NCC hoàn tiền<br>3. Thử trả vượt SL đã nhận |
| Expected Result | • Tồn −10; công nợ NCC giảm<br>• Hoàn tiền ghi nhận<br>• Trả vượt bị chặn<br>• Trạng thái cuối khớp giữa giao diện, API và database |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Nhà cung cấp

### API-SUP-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SUP-001 |
| Test Name | Warehouse Accountant ghi phiếu chi NCC và nhận tiền NCC hoàn |
| Module | Nhà cung cấp |
| Requirement ID | BR-02, BR-25 |
| Use Case ID | UC-85 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Bảo mật |
| API liên quan | POST /api/suppliers/{id}/payments; POST /api/purchasereturns/{id:int}/refunds |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. whstaff01 ghi phiếu chi<br>2. whstaff01 ghi tiền hoàn của phiếu trả NCC |
| Expected Result | • 200 (Report 3 mục 2.1: Warehouse Accountant ghi phiếu chi NCC) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Nghi vấn N-07: cần FIN_CREATE, quyền mặc định WarehouseStaff không có. |

### API-SUP-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SUP-002 |
| Test Name | Phiếu chi NCC: số tiền 0, vượt công nợ; xoá NCC đã có giao dịch |
| Module | Nhà cung cấp |
| Requirement ID | BR-46, BR-06 |
| Use Case ID | UC-85 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Giá trị biên, Kiểm thử âm |
| API liên quan | POST /api/suppliers/{id}/payments; DELETE /api/suppliers/{id} |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chi 0<br>2. Chi vượt công nợ<br>3. Xoá NCC có phiếu nhập |
| Expected Result | • MSG59<br>• Bị từ chối<br>• MSG17; chỉ được ngừng hoạt động |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |
