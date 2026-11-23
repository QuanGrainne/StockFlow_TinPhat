// API test: gọi HTTP thật vào API (database tạm), kiểm mã trạng thái, thông báo, schema và tác dụng lên database.
// Quy ước lỗi của API: 400 nghiệp vụ / VALIDATION_FAILED, 401 / 403 kèm { message }, 404 ở một số controller, 500 lỗi chưa xử lý.
'use strict';
const T = (id, mod, pri, name, req, o = {}) => ({ id, mod, type: 'API', pri, name, req, status: 'Not Run', ...o });

module.exports = [
  // ── Bảo mật chung, tham số hoá trên toàn bộ endpoint (01b_API_INVENTORY.md) ──
  T('API-SEC-001', 'SEC', 'Critical', 'Mọi endpoint (trừ login, health) trả 401 khi không có token', ['BR-02', 'NFR-SEC-01'], {
    api: ['*'], data: '198 endpoint đọc từ 01b_API_INVENTORY.md', steps: ['Gọi từng endpoint không kèm Authorization'], exp: ['401 kèm { message }; không lộ dữ liệu'], tech: ['SEC', 'DT'] }),
  T('API-SEC-002', 'SEC', 'Critical', 'Token sai chữ ký, hết hạn, sai issuer bị từ chối', ['BR-05', 'NFR-SEC-04'], {
    api: ['GET /api/auth/me', 'GET /api/orders'], data: 'Token sửa 1 ký tự; token hết hạn; token ký bằng khoá khác', steps: ['Gọi API với từng token'], exp: ['401'], tech: ['SEC', 'NEG'] }),
  T('API-SEC-003', 'SEC', 'Critical', 'Ma trận quyền: vai trò thiếu quyền của endpoint nhận 403', ['BR-02', 'BR-03', 'NFR-SEC-01'], {
    api: ['*'], data: 'Mỗi endpoint có [RequirePermission] / [RequireAdmin] × 5 tài khoản seed (admin, manager01, sales01, whstaff01, prodstaff01) theo quyền mặc định',
    steps: ['Sinh bảng mong đợi từ PermissionConstants.GetDefaultPermissionCodes', 'Gọi từng cặp (endpoint, vai trò)'], exp: ['Vai trò có quyền: không 401 / 403', 'Vai trò không có quyền: 403'], tech: ['SEC', 'DT'] }),
  T('API-SEC-004', 'SEC', 'High', 'Tắt chức năng menu (feature) của vai trò thì API tương ứng trả 403', ['UC-13', 'BR-02', 'NFR-SEC-02'], {
    api: ['PUT /api/roles/feature-matrix', 'POST /api/orders/pos', 'POST /api/production/mrp/runs'], steps: ['Bỏ feat-pos của SalesStaff', 'sales01 tạo hoá đơn POS', 'Bỏ feat-production-mrp của Manager, manager01 chạy MRP'],
    exp: ['Cả hai 403'], tech: ['SEC'] }),
  T('API-SEC-005', 'SEC', 'High', 'Endpoint chỉ cần đăng nhập không lộ cấu hình và kho cho vai trò không liên quan', ['NFR-SEC-01', 'NFR-SEC-05', 'UC-97'], {
    api: ['GET /api/order-settings', 'GET /api/warehouses', 'GET /api/warehouses/{id}', 'GET /api/suppliers/warehouses', 'GET /api/warehousepermissions/facilities'],
    steps: ['prodstaff01 gọi từng endpoint'], exp: ['Chỉ nhận dữ liệu thuộc kho được gán; cấu hình chỉ Admin / Manager xem (UC-97)'], tech: ['SEC'],
    note: 'Nghi vấn N-09: 10 endpoint không khai [RequirePermission].' }),
  T('API-SEC-006', 'SEC', 'Critical', 'IDOR: xem chứng từ của kho không được gán', ['BR-04', 'NFR-SEC-01', 'FLOW-07'], {
    api: ['GET /api/purchases/{id}', 'GET /api/transfers/{id}', 'GET /api/stocktakes/{id:int}', 'GET /api/disposals/{id:int}', 'GET /api/orders/{id}', 'GET /api/sales-returns/{id:int}', 'GET /api/production/orders/{id:int}', 'GET /api/production/mrp/runs/{id:int}'],
    pre: 'U1 chỉ có K001; chứng từ X thuộc K002', steps: ['U1 gọi chi tiết X theo id'], exp: ['403 hoặc 404; không trả dữ liệu X'], tech: ['SEC'] }),
  T('API-SEC-007', 'SEC', 'High', 'Production Accountant không thấy giá mua, giá vốn, MAC, giá bán', ['BR-39', 'NFR-SEC-05'], {
    api: ['GET /api/products', 'GET /api/products/{id}', 'GET /api/production/orders/{id:int}', 'GET /api/production/lookups/products'],
    steps: ['prodstaff01 gọi từng endpoint', 'Tìm các trường giá trong JSON'], exp: ['Không có hoặc rỗng các trường giá, giá vốn, MAC'], tech: ['SEC'] }),
  T('API-SEC-008', 'SEC', 'High', 'Chuỗi SQL injection / XSS trong tìm kiếm và tên', ['NFR-SEC-01'], {
    api: ['GET /api/products', 'GET /api/customers', 'POST /api/customers'], data: "' OR 1=1 --; <script>alert(1)</script>; 5.000 ký tự",
    steps: ['Tìm kiếm với từng chuỗi', 'Tạo khách hàng tên chứa <script>'], exp: ['Không 500; tìm kiếm trả kết quả đúng nghĩa chữ', 'Tên lưu nguyên văn, giao diện hiển thị dạng chữ'], tech: ['SEC', 'EG'] }),
  T('API-SEC-009', 'AUTH', 'Medium', 'Dùng lại token sau khi đăng xuất', ['UC-02', 'NFR-SEC-04'], {
    api: ['GET /api/auth/me'], steps: ['Đăng xuất trên giao diện', 'Gọi API bằng token cũ'], exp: ['Theo UC-02 phiên phải kết thúc: 401'], tech: ['SEC'],
    note: 'Nghi vấn N-16: đăng xuất chỉ xoá token ở trình duyệt; JWT còn hạn vẫn dùng được.' }),
  T('API-SEC-010', 'MST', 'Medium', 'Tải ảnh hàng hoá sai định dạng hoặc lớn hơn 2 MB', ['UC-52', 'NFR-SEC-01'], {
    api: ['POST /api/products', 'PUT /api/products/{id}'], data: 'File .exe đổi đuôi .jpg; ảnh 2,1 MB; ảnh 2 MB', steps: ['Lưu hàng hoá với từng ảnh'], exp: ['Hai file đầu bị từ chối', 'Ảnh 2 MB được lưu'], tech: ['BVA', 'SEC'] }),

  // ── Xác thực, tài khoản, vai trò, quyền kho ──
  T('API-AUTH-001', 'AUTH', 'Critical', 'Đăng nhập bằng username, email, mã nhân viên', ['UC-01', 'BR-01'], {
    api: ['POST /api/auth/login'], steps: ['Đăng nhập lần lượt bằng 3 định danh của cùng tài khoản'], exp: ['200 kèm token; /api/auth/me trả đúng vai trò và kho'], tech: ['EP'] }),
  T('API-AUTH-002', 'AUTH', 'Critical', 'Sai mật khẩu, tài khoản không tồn tại, tài khoản khoá', ['UC-01', 'BR-01'], {
    api: ['POST /api/auth/login'], steps: ['Sai mật khẩu', 'Username không tồn tại', 'Tài khoản bị khoá'], exp: ['Hai ca đầu cùng một thông báo MSG02 (không nói trường nào sai)', 'Tài khoản khoá: MSG03'], tech: ['NEG', 'SEC'] }),
  T('API-AUTH-003', 'AUTH', 'High', 'Đổi mật khẩu: sai mật khẩu hiện tại, mật khẩu mới không hợp lệ, thành công', ['UC-03', 'BR-05'], {
    api: ['POST /api/auth/change-password'], steps: ['Sai mật khẩu hiện tại', 'Mật khẩu mới 7 ký tự', 'Hợp lệ', 'Đăng nhập bằng mật khẩu mới'],
    exp: ['MSG06', 'MSG07', '200', 'Đăng nhập được; mật khẩu cũ không còn dùng được'], tech: ['BVA', 'NEG'] }),
  T('API-AUTH-004', 'AUTH', 'Medium', 'Khách hàng và nhà cung cấp không có tài khoản trong StockFlow', ['BR-07', 'UC-01'], {
    api: ['POST /api/auth/login', 'POST /api/customers'], steps: ['Tạo khách hàng có email', 'Đăng nhập bằng email / mã khách hàng đó'], exp: ['MSG02; không có cách tạo tài khoản đăng nhập cho đối tác'], tech: ['NEG'] }),
  T('API-ACC-005', 'ACC', 'Medium', 'Xem và tìm tài khoản theo tên, mã nhân viên, email, vai trò, trạng thái', ['UC-04', 'UC-05', 'UC-06'], {
    api: ['GET /api/staff'], data: '12 tài khoản, 5 vai trò, 2 bị khoá', steps: ['Lấy danh sách', 'Tìm theo một phần tên', 'Lọc theo vai trò, trạng thái'],
    exp: ['Đủ 12 tài khoản kèm vai trò, kho', 'Kết quả tìm / lọc đúng'], tech: ['EP'], note: 'Audit 13/11 ghi chưa lọc theo vai trò; cần xác nhận.' }),
  T('API-ROLE-003', 'ROLE', 'High', 'Xem vai trò, quyền của vai trò và gán vai trò cho tài khoản', ['UC-11', 'UC-13', 'UC-14', 'BR-03'], {
    api: ['GET /api/roles', 'GET /api/roles/{roleCode}/permissions', 'GET /api/roles/feature-matrix', 'PUT /api/staff/{id}'],
    steps: ['Lấy danh sách vai trò và số tài khoản', 'Xem quyền vai trò WarehouseStaff', 'Đổi vai trò của whstaff01 sang SalesStaff', 'whstaff01 gọi API mua hàng và bán hàng'],
    exp: ['Mỗi tài khoản đúng một vai trò', 'Sau khi đổi: mất quyền mua hàng, có quyền bán hàng ở request kế tiếp'], tech: ['EP', 'ST'] }),
  T('API-WHA-002', 'WHA', 'Medium', 'Xem quyền kho theo kho và theo nhân viên', ['UC-16'], {
    api: ['GET /api/warehousepermissions', 'GET /api/warehousepermissions/facilities'], steps: ['Admin lọc theo K001', 'Tìm nhân viên'], exp: ['Danh sách nhân viên có quyền K001 đúng dữ liệu jnc_user_warehouse_access'], tech: ['EP'] }),
  T('API-ACC-001', 'ACC', 'High', 'Tạo nhân viên trùng username, email, mã nhân viên', ['UC-07', 'BR-06'], {
    api: ['POST /api/staff'], steps: ['Tạo với từng trường trùng'], exp: ['MSG09 cho từng trường hợp'], tech: ['NEG'] }),
  T('API-ACC-002', 'ACC', 'High', 'Không tạo được tài khoản vai trò Admin; thiếu trường bắt buộc', ['UC-07', 'BR-03'], {
    api: ['POST /api/staff'], steps: ['Tạo với vai trò Admin', 'Thiếu email / email sai định dạng'], exp: ['MSG01 (E4.2)'], tech: ['NEG'] }),
  T('API-ACC-003', 'ACC', 'Critical', 'Sửa nhân viên không gửi danh sách kho thì giữ nguyên quyền kho', ['UC-08', 'BR-04'], {
    api: ['PUT /api/staff/{id}'], pre: 'sales01 có K001, K002', steps: ['Sửa số điện thoại, request không có AssignedWarehouses', 'Đọc quyền kho'], exp: ['Vẫn K001, K002'], tech: ['EG'],
    note: 'Nghi vấn N-01: UpdateStaffCommand.cs:163 xoá hết quyền kho.' }),
  T('API-ACC-004', 'ACC', 'High', 'Khoá / mở khoá và đặt lại mật khẩu nhân viên', ['UC-09', 'BR-01', 'BR-05'], {
    api: ['PUT /api/staff/{id}/toggle-status', 'POST /api/staff/{id}/reset-password'], steps: ['Khoá', 'Đăng nhập', 'Mở khoá, đặt lại mật khẩu', 'Đăng nhập bằng mật khẩu mới'],
    exp: ['Khi khoá: MSG03', 'Sau mở khoá: đăng nhập được'], tech: ['ST'] }),
  T('API-ROLE-001', 'ROLE', 'High', 'Tạo vai trò trùng tên / mã; sửa hoặc xoá vai trò mặc định, vai trò đang được dùng', ['UC-12', 'BR-03'], {
    api: ['POST /api/roles', 'PUT /api/roles/{roleIdOrCode}', 'DELETE /api/roles/{roleIdOrCode}'], steps: ['Tạo trùng', 'Xoá vai trò Manager', 'Xoá vai trò tuỳ chỉnh đang gán cho nhân viên'],
    exp: ['MSG09', 'MSG14', 'MSG14'], tech: ['NEG'] }),
  T('API-ROLE-002', 'ROLE', 'High', 'Chỉ Admin cấu hình vai trò, quyền, quyền kho, kho', ['BR-03'], {
    api: ['PUT /api/roles/{roleCode}/permissions', 'PUT /api/warehousepermissions/{userId}', 'POST /api/warehouses', 'PUT /api/warehouses/{id}'],
    steps: ['manager01 gọi từng endpoint'], exp: ['403'], tech: ['SEC'] }),
  T('API-WHA-001', 'WHA', 'High', 'Gán quyền kho cho nhân viên; mã kho trùng', ['UC-15', 'UC-17', 'BR-03', 'BR-06'], {
    api: ['PUT /api/warehousepermissions/{userId}', 'POST /api/warehouses'], steps: ['Gán K001, K003 cho whstaff01', 'Tạo kho trùng mã K001'],
    exp: ['GET /api/warehouses/my-warehouses của whstaff01 trả đúng K001, K003', 'MSG09'], tech: ['EP', 'NEG'] }),

  // ── Đặt hàng, POS, tín dụng, bảng giá ──
  T('API-BKG-001', 'BKG', 'Critical', 'Tạo đơn đặt không đổi tồn, tăng số giữ chỗ', ['UC-18', 'UC-19', 'BR-08', 'BR-11'], {
    api: ['POST /api/sales-bookings', 'GET /api/sales-bookings/reserved'], steps: ['Tạo đơn đặt H1 × 5', 'Đọc tồn và số giữ chỗ'], exp: ['Tồn không đổi; giữ chỗ H1 + 5; đơn giá lấy từ bảng giá áp dụng'], tech: ['EP'] }),
  T('API-BKG-002', 'BKG', 'High', 'Tắt nhận đơn đặt mới trong cài đặt', ['UC-19', 'UC-97'], {
    api: ['PUT /api/order-settings', 'POST /api/sales-bookings'], steps: ['Tắt nhận đơn mới', 'Tạo đơn đặt'], exp: ['MSG66'], tech: ['DT'] }),
  T('API-BKG-003', 'BKG', 'High', 'Sửa / huỷ đơn đặt đã giao bị chặn', ['UC-21', 'UC-22', 'BR-09'], {
    api: ['PUT /api/sales-bookings/{id:int}', 'POST /api/sales-bookings/{id:int}/cancel'], pre: 'Đơn đặt DELIVERING', steps: ['Sửa dòng hàng', 'Huỷ'], exp: ['MSG17'], tech: ['ST', 'NEG'] }),
  T('API-BKG-004', 'BKG', 'High', 'Gộp đơn đặt khác khách hoặc khác kho bị chặn', ['UC-24', 'BR-10'], {
    api: ['POST /api/sales-bookings/merge'], steps: ['Gộp 2 đơn khác khách', 'Gộp 2 đơn khác kho', 'Gộp 2 đơn cùng khách cùng kho'],
    exp: ['MSG20', 'MSG20', 'Đơn mới; hai đơn nguồn CANCELLED, liên kết đơn mới'], tech: ['DT'] }),
  T('API-BKG-005', 'BKG', 'High', 'Sales Accountant huỷ đơn đặt của mình', ['UC-22', 'BR-09', 'BR-02'], {
    api: ['POST /api/sales-bookings/{id:int}/cancel'], pre: 'Đơn đặt DRAFT do sales01 tạo', steps: ['sales01 huỷ đơn'], exp: ['200; đơn CANCELLED; giữ chỗ giảm'], tech: ['SEC'],
    note: 'Nghi vấn N-07: endpoint cần SALES_DELETE, quyền mặc định SalesStaff không có.' }),
  T('API-POS-001', 'POS', 'High', 'Số tiền khách trả ngoài khoảng [0, tổng]; chuyển khoản thiếu mã tham chiếu', ['UC-25', 'BR-14'], {
    api: ['POST /api/orders/pos'], data: 'Trả −1; trả tổng + 1 (không phải tiền thừa); chuyển khoản không có mã tham chiếu', steps: ['Gửi từng hoá đơn'],
    exp: ['Hai ca đầu bị từ chối', 'Ca 3 bị từ chối (BR-14 bắt buộc mã tham chiếu)'], tech: ['BVA', 'NEG'], note: 'Audit 13/11 ghi chưa có mã tham chiếu chuyển khoản.' }),
  T('API-POS-002', 'POS', 'High', 'Huỷ hoá đơn đã huỷ', ['UC-35'], {
    api: ['POST /api/orders/{id:int}/cancel'], steps: ['Huỷ lần 1', 'Huỷ lần 2'], exp: ['Lần 2: MSG17; tồn chỉ hoàn một lần'], tech: ['ST', 'NEG'] }),
  T('API-POS-003', 'POS', 'Medium', 'Danh sách và chi tiết hoá đơn chỉ thuộc kho được gán', ['UC-63', 'BR-04'], {
    api: ['GET /api/orders', 'GET /api/orders/{id}'], steps: ['sales01 (chỉ K001) lấy danh sách hoá đơn không lọc kho'], exp: ['Chỉ có hoá đơn K001'], tech: ['SEC'] }),
  T('API-CRD-001', 'CRD', 'High', 'Gửi, duyệt, từ chối yêu cầu tín dụng: các lỗi nghiệp vụ', ['UC-27', 'UC-64', 'BR-13', 'BR-50'], {
    api: ['POST /api/credit-requests', 'POST /api/credit-requests/{id:int}/approve', 'POST /api/credit-requests/{id:int}/reject', 'GET /api/credit-requests/{id:int}/customer-history'],
    steps: ['Từ chối không lý do', 'Duyệt hạn mức mới = 0', 'Duyệt hợp lệ', 'Duyệt lại yêu cầu đã duyệt'], exp: ['MSG40', 'MSG40', '200, ghi người duyệt', 'MSG57'], tech: ['BVA', 'ST'] }),
  T('API-CRD-002', 'CRD', 'High', 'Đặt hạn mức một / nhiều khách có lý do, lưu lịch sử', ['UC-55', 'BR-13', 'BR-49'], {
    api: ['PATCH /api/customers/{id:int}/credit-limit', 'PATCH /api/customers/credit-limit/batch', 'GET /api/customers/{id:int}/credit-limit-history'],
    steps: ['Đặt hạn mức 1 khách', 'Tăng 10% cho 3 khách', 'Đặt hạn mức âm'], exp: ['Lịch sử có giá trị cũ / mới / lý do / người sửa', 'Hạn mức âm bị từ chối'], tech: ['EP', 'BVA'] }),
  T('API-PB-001', 'PB', 'Medium', 'Bảng giá: ngày hiệu lực, công thức tham chiếu chính nó, áp giá', ['UC-91', 'BR-11'], {
    api: ['POST /api/price-books', 'PUT /api/price-books/{id:int}', 'POST /api/price-books/{id:int}/apply-formula', 'PUT /api/price-books/{id:int}/prices', 'GET /api/price-books/matrix'],
    steps: ['Tạo bảng giá From > To', 'Tạo công thức dựa trên chính nó', 'Tạo hợp lệ và áp công thức', 'Bán hàng cho khách thuộc phạm vi bảng giá'],
    exp: ['MSG68', 'MSG68', 'Giá đúng công thức', 'Đơn giá dòng hoá đơn lấy từ bảng giá đó'], tech: ['BVA', 'EP'] }),

  // ── Mua hàng, nhập hàng, NCC ──
  T('API-PO-001', 'PO', 'High', 'Đơn đặt thiếu NCC / dòng hàng / SL ≤ 0; ngày giao trước ngày đặt', ['UC-30', 'BR-22', 'BR-MRP-30..33'], {
    api: ['POST /api/purchase-orders'], steps: ['Gửi từng request lỗi'], exp: ['MSG01 cho 3 ca đầu', 'MSG81 cho ngày giao'], tech: ['BVA', 'NEG'] }),
  T('API-PO-002', 'PO', 'High', 'Warehouse Accountant sửa, huỷ, kết thúc, gộp đơn đặt', ['UC-30', 'BR-02', 'BR-22'], {
    api: ['PUT /api/purchase-orders/{id:int}', 'POST /api/purchase-orders/{id:int}/cancel', 'POST /api/purchase-orders/{id:int}/finish', 'POST /api/purchase-orders/merge'],
    steps: ['whstaff01 gọi từng thao tác trên đơn chưa nhận'], exp: ['200 (Report 3 mục 2.1: Warehouse Accountant ghi đơn đặt hàng nhập)'], tech: ['SEC'],
    note: 'Nghi vấn N-07: các endpoint cần PURCHASE_UPDATE, quyền mặc định WarehouseStaff không có.' }),
  T('API-GR-001', 'GR', 'High', 'Nhập hàng kho không có quyền, SL âm, thiếu NCC', ['UC-31', 'BR-04'], {
    api: ['POST /api/purchases'], steps: ['Nhập vào K002 (không có quyền)', 'SL −1', 'Không có NCC'], exp: ['MSG04', 'MSG01', 'MSG01'], tech: ['NEG'] }),
  T('API-GR-002', 'GR', 'Medium', 'Hàng theo dõi lô bắt buộc số lô và hạn dùng khi nhập', ['UC-31', 'BR-27'], {
    api: ['POST /api/purchases'], steps: ['Nhập hàng có cờ theo dõi lô mà không có số lô'], exp: ['Bị từ chối; khi có số lô thì lưu vào mst_inventory_lots'], tech: ['NEG'],
    status: 'Blocked', note: 'Chưa có cờ "theo dõi lô" trên hàng hoá và nhập hàng không ghi lô (nghi vấn N-10).' }),
  T('API-SUP-001', 'SUP', 'High', 'Warehouse Accountant ghi phiếu chi NCC và nhận tiền NCC hoàn', ['UC-85', 'BR-02', 'BR-25'], {
    api: ['POST /api/suppliers/{id}/payments', 'POST /api/purchasereturns/{id:int}/refunds'], steps: ['whstaff01 ghi phiếu chi', 'whstaff01 ghi tiền hoàn của phiếu trả NCC'],
    exp: ['200 (Report 3 mục 2.1: Warehouse Accountant ghi phiếu chi NCC)'], tech: ['SEC'], note: 'Nghi vấn N-07: cần FIN_CREATE, quyền mặc định WarehouseStaff không có.' }),
  T('API-SUP-002', 'SUP', 'High', 'Phiếu chi NCC: số tiền 0, vượt công nợ; xoá NCC đã có giao dịch', ['UC-85', 'BR-46', 'BR-06'], {
    api: ['POST /api/suppliers/{id}/payments', 'DELETE /api/suppliers/{id}'], steps: ['Chi 0', 'Chi vượt công nợ', 'Xoá NCC có phiếu nhập'], exp: ['MSG59', 'Bị từ chối', 'MSG17; chỉ được ngừng hoạt động'], tech: ['BVA', 'NEG'] }),

  // ── Danh mục, tồn kho ──
  T('API-MST-001', 'MST', 'High', 'Hàng hoá: mã trùng, xoá hàng đã có giao dịch, ngừng kinh doanh', ['UC-52', 'BR-06'], {
    api: ['POST /api/products', 'DELETE /api/products/{id}', 'PATCH /api/products/{id}/toggle-status'], steps: ['Tạo mã trùng', 'Xoá hàng đã bán', 'Ngừng kinh doanh hàng đó'], exp: ['MSG09', 'MSG17', '200'], tech: ['NEG'] }),
  T('API-MST-002', 'MST', 'High', 'Nhập hàng hoá từ Excel và điều chỉnh tồn', ['UC-99', 'BR-06', 'BR-29'], {
    api: ['POST /api/products/import', 'POST /api/products/{id}/stock-adjustments'], steps: ['Nhập file có dòng trùng mã khác tên', 'Nhập file hợp lệ', 'Điều chỉnh tồn thêm 0', 'Điều chỉnh tồn thực tế −1', 'Điều chỉnh tồn thực tế 15'],
    exp: ['MSG01, dừng nhập', 'MSG72 (số mới / cập nhật)', 'MSG01', 'MSG01', 'Tồn = 15; tạo phiếu kiểm kê BALANCED'], tech: ['BVA', 'NEG'] }),
  T('API-MST-003', 'MST', 'High', 'BOM: chỉ một bản active; không xoá BOM đã dùng cho lệnh', ['UC-57', 'BR-30'], {
    api: ['POST /api/production/boms', 'POST /api/production/boms/{id:int}/activate', 'DELETE /api/production/boms/{id:int}'], steps: ['Kích hoạt bản v2 khi v1 đang active', 'Xoá v1 đã dùng'],
    exp: ['v2 active, v1 ngừng', 'MSG17'], tech: ['ST'] }),
  T('API-MST-004', 'MST', 'Medium', 'Khách hàng / NCC: mã trùng, ngừng hoạt động hàng loạt', ['UC-54', 'BR-06'], {
    api: ['POST /api/customers', 'PATCH /api/customers/batch-status', 'POST /api/suppliers', 'PUT /api/customers/{id}'], steps: ['Tạo trùng mã', 'Ngừng 3 khách', 'Sửa khách và gửi kèm dư nợ khác'],
    exp: ['MSG09', '3 khách ngừng', 'Dư nợ không đổi qua API sửa thông tin'], tech: ['NEG'] }),
  T('API-INV-001', 'INV', 'High', 'Thẻ kho đúng thứ tự thời gian, số dư chạy khớp tồn', ['UC-73', 'NFR-REL-01'], {
    api: ['GET /api/products/{id}/stock-card'], steps: ['Sau IT-CONC-003, đọc thẻ kho H1 tại K001'], exp: ['Số dư dòng cuối = tồn hiện tại; mỗi dòng có loại, chứng từ, người'], tech: ['EP'] }),
  T('API-INV-002', 'INV', 'Medium', 'Lọc hàng dưới định mức tồn', ['UC-77', 'BR-48'], {
    api: ['GET /api/products'], data: 'H1 tồn 5 điểm đặt 5; H2 tồn 6 điểm đặt 5', steps: ['Lọc "Dưới định mức tồn"'], exp: ['Có H1, không có H2'], tech: ['BVA'] }),
  T('API-INV-003', 'INV', 'Medium', 'Cảnh báo lô sắp hết hạn', ['UC-78', 'BR-48'], {
    steps: ['Mở cảnh báo hạn dùng'], exp: ['Liệt kê lô hết hạn trong số ngày cấu hình'], tech: ['EP'], status: 'Blocked', note: 'Chưa có chức năng và không thu hạn dùng (UC-78 "Chưa có code").' }),

  // ── Kiểm kê, huỷ hàng, chuyển kho, trả hàng ──
  T('API-STK-001', 'STK', 'High', 'Kiểm kê: SL đếm âm, không có hàng, sửa phiếu đã cân bằng', ['UC-39', 'BR-43'], {
    api: ['POST /api/stocktakes', 'PUT /api/stocktakes/{id:int}'], steps: ['SL đếm −1', 'Không có dòng', 'Sửa phiếu BALANCED'], exp: ['MSG01', 'MSG01', 'MSG17'], tech: ['BVA', 'NEG'] }),
  T('API-DSP-001', 'DSP', 'High', 'Huỷ hàng: hoàn thành thiếu lý do; sửa phiếu đã hoàn thành', ['UC-43', 'BR-44'], {
    api: ['POST /api/disposals', 'PUT /api/disposals/{id:int}', 'PUT /api/disposals/{id:int}/info'], steps: ['Hoàn thành không lý do', 'Sửa dòng phiếu COMPLETED', 'Sửa ghi chú phiếu COMPLETED'],
    exp: ['MSG40', 'Bị từ chối', '200'], tech: ['ST', 'NEG'] }),
  T('API-TRF-001', 'TRF', 'High', 'Chuyển kho: cùng kho, không có dòng, nhận phiếu chưa xuất, huỷ phiếu đã nhận', ['UC-37', 'BR-40'], {
    api: ['POST /api/transfers', 'POST /api/transfers/{id}/receive', 'POST /api/transfers/{id}/cancel'], steps: ['Nguồn = đích', 'Không dòng hàng', 'Nhận phiếu DRAFT', 'Huỷ phiếu RECEIVED'],
    exp: ['MSG46', 'MSG46', 'MSG17', 'MSG17 (A37.2)'], tech: ['ST', 'NEG'], note: 'Ca 4 – nghi vấn N-08.' }),
  T('API-RET-001', 'RET', 'High', 'Trả hàng từ hoá đơn chưa hoàn tất / đã huỷ; không dòng nào có SL > 0', ['UC-28', 'BR-19'], {
    api: ['POST /api/sales-returns', 'GET /api/sales-returns/source/{invoiceId:int}'], steps: ['Trả từ hoá đơn đã huỷ', 'Mọi dòng SL 0'], exp: ['MSG17', 'MSG31'], tech: ['NEG'] }),

  // ── Sản xuất, kế hoạch, MRP ──
  T('API-PRD-001', 'PRD', 'High', 'Thao tác lệnh sản xuất sai trạng thái', ['UC-58', 'BR-38'], {
    api: ['POST /api/production/material-issues', 'POST /api/production/orders/{id:int}/approve', 'POST /api/production/orders/{id:int}/cancel', 'POST /api/production/orders/{id:int}/close'],
    steps: ['Xuất NVL cho lệnh COMPLETED', 'Duyệt hoàn thành lệnh NOT_STARTED', 'Huỷ lệnh IN_PROGRESS', 'Đóng lệnh không lý do'], exp: ['MSG17 cho 3 ca đầu', 'Đóng sớm phải có lý do (BR-38)'], tech: ['ST', 'NEG'] }),
  T('API-PRD-002', 'PRD', 'High', 'Nhập thành phẩm vào kho không được gán', ['UC-49', 'BR-04'], {
    api: ['POST /api/production/finished-goods-receipts'], steps: ['prodstaff01 nhập TP vào kho không có quyền'], exp: ['MSG04'], tech: ['SEC'] }),
  T('API-PLN-001', 'PLN', 'High', 'Bộ API kế hoạch sản xuất có sẵn (pptest.ps1, pptest2–5.ps1)', ['UC-92', 'UC-93', 'UC-94', 'UC-95', 'UC-96', 'BR-PP-01..08', 'BR-PP-09..15', 'BR-PP-16..21', 'BR-PP-22..24'], {
    api: ['POST /api/production/plans', 'PUT /api/production/plans/{id:int}', 'POST /api/production/plans/{id:int}/submit', 'POST /api/production/plans/{id:int}/approve', 'POST /api/production/plans/{id:int}/reject', 'POST /api/production/plans/{id:int}/close', 'POST /api/production/plans/{id:int}/cancel', 'POST /api/production/plans/{id:int}/orders', 'POST /api/production/plans/material-requirements/preview'],
    steps: ['Chạy các script trên database tạm (env.ps1)'], exp: ['Mọi ca đạt (lần gần nhất: 101 ca ghi trong results*.json)'], tech: ['EP', 'BVA', 'ST'], note: 'Có sẵn trong specs/production-planning-implementation/api-tests.' }),
  T('API-PLN-002', 'PLN', 'High', 'Lập lệnh vượt số còn lại; huỷ kế hoạch có lệnh chưa huỷ', ['UC-95', 'UC-96', 'BR-PP-16..21', 'BR-PP-22..24'], {
    api: ['POST /api/production/plans/{id:int}/orders', 'POST /api/production/plans/{id:int}/cancel'], steps: ['Lập lệnh 101 khi còn 100', 'Huỷ kế hoạch có lệnh đang mở'], exp: ['MSG69', 'MSG70'], tech: ['BVA', 'NEG'] }),
  T('API-PLN-003', 'PLN', 'High', 'Production Accountant không được huỷ / đóng kế hoạch', ['UC-96', 'BR-02'], {
    api: ['POST /api/production/plans/{id:int}/cancel', 'POST /api/production/plans/{id:int}/close'], steps: ['prodstaff01 huỷ kế hoạch APPROVED', 'prodstaff01 đóng kế hoạch'], exp: ['403 (UC-96 thuộc Manager)'], tech: ['SEC'],
    note: 'Nghi vấn N-07: huỷ chỉ cần PROD_UPDATE (Production Accountant có).' }),
  T('API-PLN-004', 'PLN', 'High', 'Kế hoạch đã đóng không lập thêm lệnh, không đổi lệnh đã lập', ['UC-96', 'BR-PP-16..21', 'BR-PP-22..24'], {
    api: ['POST /api/production/plans/{id:int}/close', 'POST /api/production/plans/{id:int}/orders', 'POST /api/production/orders/{id:int}/adjust-norms'],
    steps: ['Đóng kế hoạch còn 40 chưa lập lệnh', 'Lập lệnh từ kế hoạch đã đóng', 'Điều chỉnh định mức lệnh đã lập của kế hoạch'],
    exp: ['Lập lệnh bị từ chối (MSG17)', 'Điều chỉnh định mức chỉ đổi nhu cầu NVL, không đổi SL thành phẩm của lệnh'], tech: ['ST'],
    note: 'Nghi vấn N-06 (S-01): UpdateProductionOrderCommand đã không còn trong code (kiểm 19/11/2026), ca này xác nhận lại.' }),
  T('API-MRP-001', 'MRP', 'Critical', 'Bộ API MRP có sẵn (mrptest.ps1, MT-01..37)', ['UC-100', 'UC-101', 'UC-102', 'UC-103', 'UC-104', 'UC-105', 'BR-MRP-01..09', 'BR-MRP-10..17', 'BR-MRP-18..22', 'BR-MRP-23..29', 'BR-MRP-30..33'], {
    api: ['POST /api/production/mrp/runs', 'GET /api/production/mrp/runs', 'GET /api/production/mrp/runs/{id:int}', 'GET /api/production/mrp/runs/{id:int}/daily-requirements', 'GET /api/production/mrp/runs/{id:int}/monthly-demand', 'GET /api/production/mrp/runs/{id:int}/shortages', 'GET /api/production/mrp/runs/{id:int}/materials/{materialId:int}/projection', 'GET /api/production/mrp/runs/{id:int}/purchase-suggestions'],
    steps: ['Chạy specs/mrp/api-tests/mrptest.ps1 trên database tạm'], exp: ['37/37 đạt (lần gần nhất 18/11/2026)'], tech: ['EP', 'BVA', 'DT', 'ST'], note: 'Có sẵn; phủ cả phân quyền kho và cảnh báo lỗi thời.' }),
  T('API-MRP-002', 'MRP', 'High', 'MRP: lần chạy không tồn tại, vai trò bán hàng gọi MRP', ['UC-100', 'BR-02', 'BR-MRP-30..33'], {
    api: ['GET /api/production/mrp/runs/{id:int}', 'POST /api/production/mrp/runs'], steps: ['Đọc lần chạy id 999999', 'sales01 chạy MRP'], exp: ['MSG79', '403'], tech: ['NEG', 'SEC'] }),

  // ── Tài chính, báo cáo, cài đặt ──
  T('API-FIN-001', 'FIN', 'Medium', 'Báo cáo công nợ, nhập – xuất – tồn, doanh thu – lợi nhuận, chi phí', ['UC-86', 'UC-87', 'UC-88', 'UC-89', 'BR-47'], {
    steps: ['Gọi API báo cáo theo kỳ'], exp: ['Số liệu chỉ từ giao dịch đã xác nhận; khớp chứng từ nguồn'], tech: ['EP'], status: 'Blocked', note: 'Chưa có API báo cáo (UC-86 – UC-89 "Chưa có code").' }),
  T('API-FIN-002', 'FIN', 'Medium', 'Dashboard quản lý: KPI và việc chờ duyệt', ['UC-90'], {
    steps: ['Mở dashboard Manager'], exp: ['Hiện KPI, việc chờ duyệt; xuất .xlsx / .pdf'], tech: ['EP'], status: 'Blocked', note: '/dashboard hiện là bảng quản trị của Admin.' }),
  T('API-SET-001', 'SET', 'High', 'Cài đặt đơn hàng: biên giá trị, quyền Admin đổi quy tắc giao dịch', ['UC-97', 'BR-06'], {
    api: ['GET /api/order-settings', 'PUT /api/order-settings', 'GET /api/settings/debt-warning', 'PUT /api/settings/debt-warning'],
    data: 'Số ngày nợ 0, 3650, 3651; tiền tố 10 và 11 ký tự', steps: ['Lưu từng giá trị', 'manager01 đổi quy tắc mã chứng từ'],
    exp: ['0, 3650 và tiền tố 10 ký tự đạt', '3651 và 11 ký tự: MSG01', 'manager01 đổi quy tắc: MSG73'], tech: ['BVA', 'SEC'] }),

  // ── Ngoài phạm vi (quyết định 19/11/2026) ──
  T('API-OOS-001', 'OOS', 'Low', 'Các UC và BR đã loại khỏi phạm vi', ['UC-34', 'UC-42', 'UC-75', 'UC-76', 'UC-81', 'BR-20', 'BR-28'], {
    steps: ['Không thực hiện'], exp: ['—'], status: 'Skipped', note: 'D1, D2, O3 ngày 19/11/2026; Report 3 ghi "Removed".' }),
];
