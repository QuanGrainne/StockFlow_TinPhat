# Spec: Thiết lập BOM và định mức xuất NVL cho thành phẩm (StockFlow – G82)

Trạng thái: **DRAFT – chưa được Tín Phát / GVHD xác nhận.** Mức AIAS: 3.
Nguồn: SRS Report 3 (UC-45, UC-46, UC-49, UC-51/A51.6, UC-57, UC-58/59, BR-30–BR-38), video thao tác MISA SME ngày 16/10/2026, và các câu trả lời của nhóm ngày 12/11/2026.
Mục đích: gom quyết định đã chốt thành đặc tả để sửa SRS và làm đầu vào cho Claude Code. Các chỗ "[GIẢ ĐỊNH]" chưa ai xác nhận.

## 1. Quyết định đã chốt

| # | Quyết định | Nguồn |
| --- | --- | --- |
| D1 | Một lệnh sản xuất (LSX) chứa **nhiều thành phẩm** | Nhóm trả lời 12/11 |
| D2 | **Được điều chỉnh định mức** trên từng lệnh (thêm, bớt dòng NVL, đổi số lượng/đơn vị thành phẩm) | Nhóm trả lời; video |
| D3 | Hao hụt do **hệ thống tự tính** từ tỷ lệ hao hụt trong BOM [GIẢ ĐỊNH: không tự suy từ lịch sử] | Nhóm trả lời |
| D4 | Số lượng định mức cho phép **tối đa 6 chữ số sau dấu thập phân** (thay cho mức 3 ở bản trước) | Nhóm trả lời 12/11 |
| D5 | Thành phần BOM gồm NVL, hàng hoá, bao bì, công cụ; lấy từ **nhiều kho** trong cùng một phiếu xuất | Video |
| D6 | Xuất NVL **theo từng thành phẩm** của lệnh (chọn thành phẩm cần xuất) | Video |
| D7 | BOM **một cấp** (không nhiều cấp) | Video không thể hiện |
| D8 | StockFlow **không tính giá thành** sản phẩm, chỉ ghi số lượng [GIẢ ĐỊNH] | SRS BR-39, 5.3 |

## 2. Quy tắc số lượng và làm tròn

- Định mức trên một đơn vị thành phẩm, tổng nhu cầu, số đã xuất, số còn thiếu: lưu `DECIMAL(18,6)`, hiển thị bỏ các số 0 thừa ở cuối.
- Tỷ lệ hao hụt: phần trăm, từ 0 đến 100, tối đa 4 chữ số thập phân. Mặc định 0.
- **Chỉ làm tròn một lần, ở kết quả cuối** của mỗi dòng NVL: làm tròn nửa lên (half-up) tại 6 chữ số thập phân. Không làm tròn các bước trung gian.
- Số lượng thực xuất (UC-46) và số lượng tồn kho của NVL cũng phải dùng cùng độ chính xác 6 chữ số, nếu không số đã xuất và số nhu cầu sẽ lệch nhau. [GIẢ ĐỊNH: cần kiểm tra bảng InventoryBalance hiện tại.]
- Mọi số lượng phải quy về đơn vị cơ sở của hàng hoá trước khi so sánh (BR-26).

Công thức (thay cho BR-31):

```
Nhu cầu NVL (dòng) = ROUND_HALF_UP( Số lượng thành phẩm × Định mức/1 đơn vị × (1 + Hao hụt% / 100), 6 )
```

Ví dụ (đã tính tay):

| Số lượng TP | Định mức/đv | Hao hụt | Nhu cầu |
| --- | --- | --- | --- |
| 1.000 | 0,025 kg | 0% | 25,000000 kg |
| 1.000 | 0,025 kg | 5% | 26,250000 kg |
| 7 | 0,001 lít | 5% | 0,007350 lít |
| 3 | 0,0000013 → không hợp lệ (7 chữ số) | – | bị từ chối, xem MSG68 |
| 3 | 0,000013 | 5% | 0,000041 lít (3 × 0,000013 × 1,05 = 0,00004095 → làm tròn 0,000041) |

## 3. Mô hình dữ liệu (thay đổi so với ERD hiện tại)

Chỉ thêm/sửa những gì cần. Mỗi bảng phải truy về UC.

| Bảng | Thay đổi | UC dùng |
| --- | --- | --- |
| `BOM` | Thêm `status` (Draft / Active / Inactive), `effective_date`, `description`. Ràng buộc: tối đa một bản Active cho mỗi thành phẩm (BR-30) | UC-51/A51.6, UC-57 |
| `BOMItem` | `material_id`, `unit_id`, `qty_per_unit` DECIMAL(18,6) > 0, `wastage_rate` DECIMAL(7,4) 0–100. Duy nhất theo (bom_id, material_id) | UC-57 |
| `ProductionOrder` | Chỉ còn phần đầu lệnh: mã, ngày, xưởng phụ trách, hạn hoàn thành, trạng thái, người tạo. Bỏ `product_id`, `planned_qty` khỏi bảng này | UC-58, UC-59 |
| `ProductionOrderItem` (mới) | Một dòng cho mỗi thành phẩm: `order_id`, `product_id`, `bom_id` (phiên bản đã áp dụng), `planned_qty`, `received_qty`, trạng thái dòng | UC-58, UC-44, UC-49 |
| `ProductionMaterialRequirement` | Gắn vào `ProductionOrderItem`. Cột: `material_id`, `unit_id`, `source_bom_item_id` (null nếu thêm tay), `norm_per_unit`, `wastage_rate`, `required_qty`, `issued_qty`, `shortage_qty`, `is_adjusted`, `adjust_reason`, `adjusted_by`, `adjusted_at` | UC-58, UC-45, UC-46 |
| `StockIssueItem` | Thêm tham chiếu tới `ProductionMaterialRequirement` và kho của từng dòng | UC-46 |

Nguyên tắc: nhu cầu NVL được **chụp (snapshot)** vào `ProductionMaterialRequirement` khi tạo lệnh. Sửa hay kích hoạt BOM sau đó không làm đổi lệnh đã tạo.

## 4. Business Rule (viết lại hoặc thêm)

| ID | Nội dung |
| --- | --- |
| BR-30 (sửa) | Chỉ tạo được dòng thành phẩm cho lệnh nếu thành phẩm có BOM Active. Mỗi thành phẩm có tối đa một BOM Active. |
| BR-31 (sửa) | Nhu cầu NVL của mỗi dòng thành phẩm do hệ thống tính theo công thức ở mục 2 từ BOM Active tại thời điểm tạo lệnh. Người dùng không nhập tổng số trực tiếp. Hao hụt do hệ thống tự áp theo tỷ lệ của BOM. |
| BR-51 (mới) | Manager có thể điều chỉnh định mức của một dòng thành phẩm ngay trên lệnh: sửa định mức/đơn vị, sửa tỷ lệ hao hụt, thêm hoặc bỏ dòng NVL. Bắt buộc có lý do. Hệ thống tính lại nhu cầu và ghi Audit Trail (giá trị trước/sau). Điều chỉnh chỉ áp cho lệnh đó, không đổi BOM gốc. [GIẢ ĐỊNH: chỉ Manager.] |
| BR-52 (mới) | Không được điều chỉnh để làm nhu cầu một NVL thấp hơn số đã xuất. Không được bỏ dòng NVL đã có phiếu xuất. [GIẢ ĐỊNH] |
| BR-53 (mới) | Số lượng định mức, nhu cầu, số xuất có tối đa 6 chữ số thập phân; tỷ lệ hao hụt tối đa 4 chữ số thập phân. Giá trị vượt quá bị từ chối, không tự cắt. |
| BR-54 (mới) | Thành phần BOM là mặt hàng loại NVL, hàng hoá, bao bì hoặc công cụ đang hoạt động. Một BOM không được có hai dòng cùng một mặt hàng, và không được chứa chính thành phẩm của nó. |
| BR-55 (mới) | Phiếu xuất NVL cho sản xuất chọn một hoặc nhiều dòng thành phẩm của lệnh. Mỗi dòng NVL trên phiếu có kho riêng và chỉ xuất được từ kho được cấp quyền cho người dùng (BR-04). |
| BR-32 (sửa) | Số đã xuất lũy kế và số còn thiếu được theo dõi theo từng dòng NVL của từng dòng thành phẩm. |
| BR-38 (sửa) | Trạng thái dòng thành phẩm: Not Started → In Progress (xuất NVL lần đầu cho dòng đó) → Completed. Trạng thái lệnh: In Progress khi có dòng In Progress; Completed khi mọi dòng Completed hoặc đã đóng. Chỉ hủy được lệnh chưa xuất NVL cho dòng nào. |

BR-33, BR-34, BR-35, BR-37 giữ nguyên nội dung nhưng áp dụng theo dòng thành phẩm.

## 5. Use Case

- **UC-57 Manage BOM / Material Norm** (Manager): tạo BOM nháp cho một thành phẩm, thêm/sửa/xóa dòng NVL (mặt hàng, đơn vị, định mức, hao hụt), lưu, kích hoạt phiên bản (bản Active cũ chuyển Inactive, BR-30), xem lịch sử phiên bản. Lỗi: BOM không có NVL, trùng NVL, số lượng ≤ 0, vượt 6 chữ số thập phân, hao hụt ngoài khoảng.
- **UC-58/59 Manage Production Order** (Manager): chọn nhiều thành phẩm, nhập số lượng từng dòng, hệ thống hiển thị BOM áp dụng và nhu cầu NVL từng dòng, tồn kho và thiếu hụt (theo kho được quyền). Manager có thể điều chỉnh định mức (BR-51).
- **UC-45 View Material Requirement** (Production Accountant): xem theo từng thành phẩm: nhu cầu, đã xuất, còn thiếu, tồn. Không thấy giá (BR-39).
- **UC-46 Process Material Stock Issue** (Production Accountant): nhập mã lệnh, chọn thành phẩm cần xuất, nhập số lượng thực xuất theo báo cáo kiểm đếm, chọn kho cho từng dòng, xác nhận. Hệ thống trừ kho, cộng dồn số đã xuất, tính lại thiếu, đổi trạng thái dòng.
- **UC-49 Record Finished Goods Receipt**: ghi nhận theo từng dòng thành phẩm; cảnh báo BR-37 theo dòng.

## 6. Thông báo hệ thống mới (đề xuất MSG66+)

| ID | Loại | Khi nào | Nội dung |
| --- | --- | --- | --- |
| MSG66 | Inline (Error) | BOM không có NVL | Bill of materials must contain at least one material. |
| MSG67 | Inline (Error) | Trùng NVL trong BOM | This material is already in the BOM. |
| MSG68 | Inline (Error) | Quá 6 chữ số thập phân hoặc ≤ 0 | Quantity must be greater than 0 and have at most 6 decimal places. |
| MSG69 | Inline (Error) | Hao hụt ngoài 0–100 hoặc quá 4 chữ số thập phân | Wastage rate must be between 0 and 100 with at most 4 decimal places. |
| MSG70 | Confirm | Kích hoạt BOM | Activating this version will deactivate the current active version. Continue? |
| MSG71 | Toast (Success) | Kích hoạt xong | BOM version {version} activated. |
| MSG72 | Inline (Error) | Điều chỉnh thiếu lý do | A reason is required to adjust the material norm. |
| MSG73 | Inline (Error) | Vi phạm BR-52 | The material requirement cannot be lower than the quantity already issued. |
| MSG74 | Inline (Error) | BOM chứa chính thành phẩm | A product cannot be a component of its own BOM. |

(MSG58 "No active BOM" giữ nguyên, hiển thị cho từng thành phẩm.)

## 7. Tiêu chí nghiệm thu (Given–When–Then)

| ID | Given | When | Then | Nguồn |
| --- | --- | --- | --- | --- |
| AC-01 | Thành phẩm P có BOM Active: NVL A định mức 0,025, hao hụt 0% | Manager tạo lệnh với P số lượng 1.000 | Nhu cầu A là 25,000000 | BR-31 |
| AC-02 | Như AC-01 nhưng hao hụt 5% | Tạo lệnh P số lượng 1.000 | Nhu cầu A là 26,250000 | BR-31 |
| AC-03 | NVL B định mức 0,001, hao hụt 5% | Tạo lệnh P số lượng 7 | Nhu cầu B là 0,007350 | BR-31, BR-53 |
| AC-04 | Đang nhập BOM | Nhập định mức 0,0000013 | Hệ thống từ chối, hiện MSG68, không lưu | BR-53 |
| AC-05 | Thành phẩm Q chưa có BOM Active | Thêm Q vào lệnh | Hiện MSG58, dòng Q không được tạo, các thành phẩm khác không bị ảnh hưởng | BR-30 |
| AC-06 | Lệnh có hai thành phẩm P và Q | Manager lưu lệnh | Có hai dòng thành phẩm, mỗi dòng có bảng nhu cầu NVL riêng | D1 |
| AC-07 | Lệnh đã tạo từ BOM phiên bản 1 | Manager kích hoạt phiên bản 2 | Nhu cầu của lệnh đã tạo không đổi | Snapshot |
| AC-08 | Lệnh Not Started | Manager đổi định mức của A từ 0,025 thành 0,03 kèm lý do | Nhu cầu A tính lại, BOM gốc không đổi, Audit Trail có giá trị trước/sau | BR-51 |
| AC-09 | Như AC-08 | Manager đổi định mức mà không nhập lý do | Hiện MSG72, không lưu | BR-51 |
| AC-10 | A đã xuất 20, nhu cầu 25 | Manager hạ nhu cầu A xuống 15 | Hiện MSG73, không lưu | BR-52 |
| AC-11 | Lệnh có P và Q | Production Accountant xuất NVL chỉ cho P | Chỉ trừ kho và cộng dồn số đã xuất cho các dòng NVL của P; dòng P chuyển In Progress, dòng Q vẫn Not Started | BR-55, BR-38 |
| AC-12 | Một phiếu xuất gồm NVL ở kho K1 và K2 | Người dùng chỉ được cấp quyền kho K1 | Dòng của K2 bị từ chối | BR-04, BR-55 |
| AC-13 | Production Accountant mở màn hình nhu cầu NVL | Xem dữ liệu | Không có giá hay đơn giá | BR-39 |
| AC-14 | BOM có hai dòng cùng NVL A | Lưu BOM | Hiện MSG67, không lưu | BR-54 |

## 8. Ngoài phạm vi

BOM nhiều cấp, tính giá thành, đối tượng tập hợp chi phí, tự suy tỷ lệ hao hụt từ lịch sử, tích hợp MISA.

## 9. Việc còn mở (cần hỏi lại)

1. "Hao hụt tự tính" có đúng là áp tỷ lệ trong BOM không (D3)?
2. Chỉ Manager được điều chỉnh định mức, hay Production Accountant cũng được đề xuất (BR-51)?
3. Có cho điều chỉnh khi lệnh đã xuất một phần NVL không (BR-52)?
4. Công ty có thật sự không cần tính giá thành trong StockFlow (D8)?
5. Độ chính xác 6 chữ số có áp cho cả tồn kho NVL hiện tại không? Cần kiểm tra schema InventoryBalance.
6. Bao bì và công cụ (ví dụ bình chữa khí) có cần loại hàng riêng, hay dùng chung loại NVL/hàng hoá?