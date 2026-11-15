# 05 — Đặc tả chi tiết Use Case đề xuất

Tất cả Use Case dưới đây là **đề xuất**, chưa có trong Report 3 và chưa có trong code. Mã UC-PP-xx, BR-PP-xx là mã tạm (xem file 04 mục 1). Quy tắc nghiệp vụ được nêu đầy đủ ở file 06.

> **Cập nhật 14/11/2026:** Ninh đã chốt phương án mặc định cho Q1–Q12 (file 06 mục 3). Các điểm **[Cần xác nhận]** bên dưới áp dụng theo mặc định: Production Accountant và Manager đều lập được, chỉ Manager duyệt (Q1, Q2); mỗi thành phẩm một dòng (Q3); vẫn cho lập lệnh trực tiếp (Q4); sửa kế hoạch đã duyệt không phải duyệt lại, chỉ Manager sửa (Q5); không có chức năng rút lại (Q6, bỏ luồng 1a của UC-PP-04); chặn lập lệnh vượt số còn lại (Q7); so với tồn thực tế, không trừ lệnh đang mở (Q8); Manager đóng kế hoạch bằng tay (Q9).

Trạng thái kế hoạch dùng trong tài liệu (đề xuất, xem file 06 mục 1): `DRAFT` Nháp, `PENDING_APPROVAL` Chờ duyệt, `APPROVED` Đã duyệt, `REJECTED` Bị từ chối, `CLOSED` Đã đóng, `CANCELLED` Đã hủy.

---

## UC-PP-01 — Xem kế hoạch sản xuất

| Mục | Nội dung |
|---|---|
| Actor | Manager, Production Accountant |
| Mục đích | Tra cứu kế hoạch và theo dõi tiến độ thực hiện |
| Điều kiện trước | Đã đăng nhập, có quyền xem sản xuất |
| Kích hoạt | Mở menu "Kế hoạch sản xuất" |

**Luồng chính**
1. Hệ thống hiển thị danh sách kế hoạch: mã, tên, kỳ, trạng thái, người lập, số dòng, tỷ lệ đã lập lệnh.
2. Người dùng lọc theo trạng thái, kỳ, từ khóa (mã hoặc tên).
3. Người dùng chọn một kế hoạch.
4. Hệ thống hiển thị chi tiết: thông tin chung, người duyệt và thời điểm duyệt, từng dòng với số kế hoạch, **số đã lập lệnh, số còn lại, số đã nhập kho**, và danh sách lệnh sản xuất thuộc kế hoạch.
5. Người dùng bấm vào mã lệnh để mở chi tiết lệnh (màn hình đang có).

**Luồng thay thế**
- 4a. Kế hoạch chưa có lệnh nào: các cột tiến độ hiển thị 0; danh sách lệnh trống.

**Ngoại lệ**
- Kế hoạch không tồn tại: báo "Không tìm thấy kế hoạch sản xuất".

**Điều kiện sau:** không thay đổi dữ liệu.
**Quy tắc:** BR-PP-10, BR-PP-11, BR-PP-18.
**Dữ liệu:** `trx_production_plans`, `dtl_production_plan_items`, `trx_production_orders`, `dtl_production_order_items`.

---

## UC-PP-02 — Lập / sửa kế hoạch sản xuất

| Mục | Nội dung |
|---|---|
| Actor | Người lập kế hoạch (**[Cần xác nhận]** vai trò nào, xem câu Q1) |
| Mục đích | Ghi nhận dự định sản xuất của một kỳ |
| Điều kiện trước | Có quyền lập kế hoạch. Khi sửa: kế hoạch ở `DRAFT` hoặc `REJECTED` (sửa hạn chế ở `APPROVED`, xem luồng 2b) |
| Kích hoạt | Bấm "Lập kế hoạch" hoặc "Sửa" ở chi tiết kế hoạch |

**Luồng chính (tạo mới)**
1. Người dùng nhập tên kế hoạch, kỳ (từ ngày, đến ngày), ghi chú.
2. Người dùng thêm dòng: chọn thành phẩm, nhập số lượng, ngày bắt đầu, ngày kết thúc, kho nhận (tùy chọn), ghi chú.
3. Với mỗi dòng, hệ thống cho biết thành phẩm có BOM đang áp dụng hay không.
4. Người dùng có thể xem nhu cầu vật tư dự kiến (UC-PP-03).
5. Người dùng bấm "Lưu".
6. Hệ thống kiểm tra dữ liệu, sinh mã kế hoạch, lưu với trạng thái `DRAFT`, ghi người lập và ngày lập.

**Luồng thay thế**
- 2a. Sửa kế hoạch `DRAFT` hoặc `REJECTED`: được đổi mọi trường, thêm và xóa dòng. Kế hoạch `REJECTED` sau khi lưu vẫn là `REJECTED` cho tới khi gửi duyệt lại.
- 2b. Sửa kế hoạch `APPROVED`: chỉ được đổi số lượng (không thấp hơn số đã lập lệnh), ngày của dòng, kho nhận, ghi chú; không xóa dòng đã có lệnh. Việc tăng số lượng hoặc thêm dòng có phải duyệt lại hay không: **[Cần xác nhận]** (Q5).
- 3a. Thành phẩm chưa có BOM đang áp dụng: hiện cảnh báo, vẫn cho lưu nháp.

**Ngoại lệ**
- Thiếu tên, kỳ hoặc không có dòng nào: báo lỗi, không lưu.
- Ngày kết thúc trước ngày bắt đầu (kỳ hoặc dòng); ngày của dòng nằm ngoài kỳ: báo lỗi.
- Số lượng ≤ 0: báo lỗi.
- Sản phẩm không phải thành phẩm hoặc đã ngừng dùng: báo lỗi.
- Trùng sản phẩm trong cùng kế hoạch: báo lỗi (theo phương án mặc định của Q3).
- Kho nhận không thuộc quyền của người dùng: báo lỗi.
- Kế hoạch ở trạng thái không cho sửa (`PENDING_APPROVAL`, `CLOSED`, `CANCELLED`): báo lỗi.

**Điều kiện sau:** kế hoạch được lưu; chưa ảnh hưởng tồn kho, chưa có lệnh nào được tạo.
**Quy tắc:** BR-PP-01 → BR-PP-08, BR-PP-12, BR-PP-13.
**Dữ liệu:** ghi `trx_production_plans`, `dtl_production_plan_items`; đọc `mst_products`, `mst_boms`, `mst_warehouses`.

---

## UC-PP-03 — Kiểm tra nhu cầu nguyên vật liệu dự kiến

| Mục | Nội dung |
|---|---|
| Actor | Người lập kế hoạch, Manager |
| Mục đích | Biết kế hoạch cần bao nhiêu vật tư và đang thiếu gì trước khi gửi duyệt hoặc duyệt |
| Điều kiện trước | Kế hoạch (đã lưu hoặc đang soạn) có ít nhất một dòng |
| Kích hoạt | Bấm "Xem nhu cầu vật tư" ở form lập hoặc ở chi tiết kế hoạch |

**Luồng chính**
1. Người dùng chọn kho vật tư để so tồn (trong các kho được phân quyền).
2. Hệ thống lấy BOM đang áp dụng của từng thành phẩm, tính nhu cầu từng vật tư theo công thức định mức và hao hụt (BR-31 đang dùng cho lệnh), cộng dồn theo vật tư trên toàn kế hoạch.
3. Hệ thống hiển thị: vật tư, đơn vị, tổng nhu cầu, tồn hiện có tại kho đã chọn, số thiếu.
4. Vật tư thiếu được tô nổi; đầu bảng hiện tổng số vật tư thiếu.

**Luồng thay thế**
- 2a. Kế hoạch đã có lệnh: mặc định tính cho **số còn lại chưa lập lệnh**; người dùng có thể chuyển sang xem theo tổng số kế hoạch.
- 2b. Có thành phẩm chưa có BOM đang áp dụng: bỏ qua thành phẩm đó trong phép tính và liệt kê riêng ở mục "Chưa có định mức".

**Ngoại lệ**
- Người dùng không có quyền với kho đã chọn: báo lỗi.

**Điều kiện sau:** không thay đổi dữ liệu; kết quả không được lưu.
**Quy tắc:** BR-PP-09, BR-PP-14, BR-PP-15, BR-31 (đang có).
**Dữ liệu:** đọc `mst_boms`, `dtl_bom_items`, `trx_inventory_balances`.
**Ghi chú:** tồn hiển thị là tồn thực tế, chưa trừ phần vật tư các lệnh đang mở sẽ dùng. Có trừ hay không: **[Cần xác nhận]** (Q8).

---

## UC-PP-04 — Gửi duyệt và phê duyệt / từ chối kế hoạch

| Mục | Nội dung |
|---|---|
| Actor | Người lập kế hoạch (gửi duyệt); Manager (duyệt, từ chối) |
| Mục đích | Kiểm soát kế hoạch trước khi được phép lập lệnh |
| Điều kiện trước | Gửi duyệt: kế hoạch `DRAFT` hoặc `REJECTED`. Duyệt, từ chối: kế hoạch `PENDING_APPROVAL` |
| Kích hoạt | Bấm "Gửi duyệt", "Duyệt" hoặc "Từ chối" ở chi tiết kế hoạch |

**Luồng chính**
1. Người lập bấm "Gửi duyệt".
2. Hệ thống kiểm tra mọi thành phẩm đều có BOM đang áp dụng, rồi chuyển kế hoạch sang `PENDING_APPROVAL`.
3. Manager mở kế hoạch, xem các dòng và nhu cầu vật tư dự kiến (UC-PP-03).
4. Manager bấm "Duyệt".
5. Hệ thống chuyển sang `APPROVED`, ghi người duyệt và thời điểm duyệt.

**Luồng thay thế**
- 4a. Manager bấm "Từ chối" và nhập lý do (bắt buộc). Hệ thống chuyển sang `REJECTED`, ghi lý do. Người lập sửa (UC-PP-02) rồi gửi duyệt lại.
- 1a. Người lập rút lại kế hoạch đang chờ duyệt để sửa: kế hoạch về `DRAFT`. **[Cần xác nhận]** có cần chức năng này không (Q6).
- 3a. Kế hoạch có vật tư thiếu: hệ thống hiện cảnh báo, Manager vẫn duyệt được.

**Ngoại lệ**
- Có thành phẩm chưa có BOM đang áp dụng: không cho gửi duyệt, nêu tên thành phẩm.
- Kế hoạch không ở đúng trạng thái (ví dụ người khác vừa duyệt): báo lỗi, tải lại.
- Người duyệt không có quyền duyệt: từ chối thao tác.

**Điều kiện sau:** kế hoạch `APPROVED` mới được dùng để lập lệnh; kế hoạch `REJECTED` sửa được.
**Quy tắc:** BR-PP-09, BR-PP-15, BR-PP-16, BR-PP-17.
**Dữ liệu:** ghi `trx_production_plans.status`, `approved_by`, `approval_date`, `notes`.
**Ghi chú ERD:** không có cột riêng cho lý do từ chối, người và thời điểm gửi duyệt (xem file 07, mục G2).

---

## UC-PP-05 — Lập lệnh sản xuất từ kế hoạch

| Mục | Nội dung |
|---|---|
| Actor | Manager |
| Mục đích | Chuyển một phần hoặc toàn bộ kế hoạch đã duyệt thành lệnh sản xuất |
| Điều kiện trước | Kế hoạch `APPROVED`; còn ít nhất một dòng có số còn lại > 0; người dùng có quyền lập lệnh |
| Kích hoạt | Bấm "Lập lệnh sản xuất" ở chi tiết kế hoạch |

**Luồng chính**
1. Hệ thống hiển thị các dòng còn số chưa lập lệnh, kèm số còn lại.
2. Manager chọn các dòng và nhập số lượng lập lệnh cho từng dòng (mặc định bằng số còn lại).
3. Hệ thống mở form lập lệnh đang có (UC-59), điền sẵn thành phẩm, số lượng, hạn hoàn thành (ngày kết thúc muộn nhất của các dòng đã chọn) và mã kế hoạch.
4. Manager bổ sung xưởng, ghi chú, xem nhu cầu vật tư của lệnh, rồi lưu.
5. Hệ thống tạo lệnh theo quy trình đang có (trạng thái `NOT_STARTED`, tính nhu cầu vật tư từ BOM) và gắn `production_plan_id`.
6. Chi tiết kế hoạch cập nhật số đã lập lệnh và số còn lại.

**Luồng thay thế**
- 2a. Lập một phần: số nhập nhỏ hơn số còn lại; phần dư tiếp tục nằm trên kế hoạch để lập lệnh sau.
- 5a. Lệnh thuộc kế hoạch bị hủy về sau (UC-59): số lượng của lệnh đó được trả lại vào số còn lại của kế hoạch.

**Ngoại lệ**
- Số lập lệnh lớn hơn số còn lại của dòng: báo lỗi, không tạo lệnh. **[Cần xác nhận]** chặn hay chỉ cảnh báo (Q7).
- Kế hoạch không còn ở `APPROVED` lúc lưu: báo lỗi.
- Các lỗi sẵn có của lập lệnh (thiếu BOM, hạn hoàn thành không hợp lệ…): theo UC-59.

**Điều kiện sau:** có thêm một lệnh `NOT_STARTED` gắn với kế hoạch; tồn kho chưa thay đổi.
**Quy tắc:** BR-PP-10, BR-PP-11, BR-PP-19, BR-PP-20, BR-PP-21; các quy tắc của UC-59.
**Dữ liệu:** ghi `trx_production_orders` (gồm `production_plan_id`), `dtl_production_order_items`, `trx_production_material_requirements`.
**Không trùng UC-59:** Use Case này không định nghĩa lại cách tạo lệnh; nó chỉ thêm điểm vào từ kế hoạch, dữ liệu điền sẵn và kiểm tra số còn lại.
**Điểm mở:** lệnh lập trực tiếp không qua kế hoạch có còn được phép không: **[Cần xác nhận]** (Q4).

---

## UC-PP-06 — Hủy / đóng kế hoạch

| Mục | Nội dung |
|---|---|
| Actor | Manager (người lập được hủy kế hoạch `DRAFT` của mình) |
| Mục đích | Kết thúc kế hoạch không làm tiếp |
| Điều kiện trước | Hủy: `DRAFT`, `REJECTED`, `PENDING_APPROVAL`, hoặc `APPROVED` chưa có lệnh nào còn hiệu lực. Đóng: `APPROVED` |
| Kích hoạt | Bấm "Hủy kế hoạch" hoặc "Đóng kế hoạch" |

**Luồng chính (hủy)**
1. Người dùng bấm "Hủy kế hoạch" và nhập lý do.
2. Hệ thống kiểm tra kế hoạch không có lệnh nào khác trạng thái `CANCELLED`.
3. Hệ thống chuyển kế hoạch sang `CANCELLED`, ghi lý do.

**Luồng thay thế (đóng)**
- 1a. Manager bấm "Đóng kế hoạch" trên kế hoạch `APPROVED`.
- 1b. Hệ thống cho biết số còn lại chưa lập lệnh sẽ bị bỏ, và các lệnh đang mở (nếu có) vẫn tiếp tục chạy bình thường.
- 1c. Manager xác nhận. Hệ thống chuyển sang `CLOSED`; không lập thêm lệnh từ kế hoạch này được nữa.

**Ngoại lệ**
- Hủy kế hoạch đã có lệnh còn hiệu lực: từ chối, gợi ý dùng "Đóng kế hoạch" hoặc hủy các lệnh trước.
- Kế hoạch đã `CLOSED` hoặc `CANCELLED`: từ chối.

**Điều kiện sau:** kế hoạch ở trạng thái kết thúc; các lệnh đã lập **không** bị thay đổi.
**Quy tắc:** BR-PP-22, BR-PP-23, BR-PP-24.
**Dữ liệu:** ghi `trx_production_plans.status`, `notes`.
**Điểm mở:** kế hoạch có tự chuyển `CLOSED` khi mọi dòng đã lập đủ lệnh và các lệnh đều kết thúc không: **[Cần xác nhận]** (Q9). Đề xuất mặc định: không tự động, Manager đóng bằng tay.
