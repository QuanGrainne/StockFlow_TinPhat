// Integration test: handler + EF Core + PostgreSQL thật (database tạm dựng bằng migration), không mock database.
// Mỗi ca kiểm cả dữ liệu sau commit (bảng chứng từ, trx_inventory_balances, trx_inventory_transactions, công nợ).
'use strict';
const T = (id, mod, pri, name, req, o = {}) => ({ id, mod, type: 'Integration', pri, name, req, status: 'Not Run', ...o });
const DB_CHECK = 'Σ quantity của trx_inventory_transactions (hàng, kho) = quantity trong trx_inventory_balances';

module.exports = [
  // ── Nhập kho, giá vốn, công nợ NCC ──
  T('IT-INV-001', 'GR', 'Critical', 'Nhập kho hoàn thành: phiếu, dòng, tồn, thẻ kho, MAC, công nợ NCC', ['UC-31', 'BR-23', 'BR-24', 'BR-25', 'BR-29', 'NFR-REL-02', 'FLOW-01'], {
    api: ['POST /api/purchases'], pre: 'Kho K001, NCC N1 (công nợ 0), hàng H1 tồn 10 × MAC 100.000, người dùng whstaff01 có quyền K001',
    data: 'Phiếu nhập Hoàn thành: H1 SL đạt 10, đơn giá 200.000, trả NCC 500.000', steps: ['Gửi lệnh tạo phiếu nhập trạng thái Hoàn thành', 'Đọc lại các bảng liên quan'],
    exp: ['trx_goods_receipts COMPLETED, created_by = whstaff01', 'Tồn H1 tại K001 = 20; MAC = 150.000', 'Thẻ kho thêm 1 dòng INBOUND_RECEIPT, reference GOODS_RECEIPT = id phiếu', 'Công nợ N1 tăng 1.500.000 (2.000.000 − 500.000, BR-25)', DB_CHECK],
    tech: ['EP'] }),
  T('IT-INV-002', 'GR', 'Critical', 'Hàng lỗi khi nhận không vào kho, không tính tiền', ['UC-32', 'BR-24'], {
    api: ['POST /api/purchases'], data: 'H1 SL đạt 8, SL lỗi 2, đơn giá 200', steps: ['Tạo phiếu nhập Hoàn thành'],
    exp: ['Tồn tăng 8', 'Giá trị phiếu = 8 × 200', 'Dòng phiếu ghi DefectiveQty = 2'], tech: ['EP'] }),
  T('IT-INV-003', 'GR', 'Critical', 'Lỗi giữa chừng không để lại dữ liệu dở dang (rollback)', ['UC-31', 'NFR-REL-02', 'NFR-REL-03'], {
    api: ['POST /api/purchases'], data: 'Phiếu 2 dòng: dòng 1 hợp lệ, dòng 2 product_id không tồn tại', steps: ['Gửi lệnh', 'Đếm bản ghi phiếu, tồn, thẻ kho trước / sau'],
    exp: ['Lệnh thất bại với thông báo lỗi', 'Không có phiếu nhập mới, tồn và thẻ kho không đổi, công nợ không đổi'], tech: ['EG'] }),
  T('IT-INV-004', 'GR', 'High', 'Hoàn thành phiếu nhập tạm', ['UC-31', 'BR-23'], {
    api: ['POST /api/purchases', 'PATCH /api/purchases/{id}/complete'], steps: ['Tạo phiếu DRAFT', 'Kiểm tồn không đổi', 'Hoàn thành phiếu'],
    exp: ['DRAFT không đổi tồn', 'Sau hoàn thành: như IT-INV-001'], tech: ['ST'] }),
  T('IT-INV-005', 'GR', 'High', 'Huỷ phiếu nhập đã hoàn thành đảo tồn và công nợ', ['UC-31', 'BR-15', 'BR-25'], {
    api: ['PATCH /api/purchases/{id}/cancel'], steps: ['Huỷ phiếu đã hoàn thành'], exp: ['Tồn giảm lại đúng SL đạt', 'Công nợ NCC giảm lại', 'Thẻ kho có dòng đảo'],
    tech: ['ST'], note: 'BR-15 ghi "huỷ chứng từ thì đảo tác dụng"; nếu tồn hiện tại < SL cần trừ, hệ thống phải báo lỗi rõ.' }),
  T('IT-PO-001', 'PO', 'Critical', 'Nhận hàng trên đơn đặt: đơn chuyển Nhập một phần rồi Hoàn thành', ['UC-30', 'UC-31', 'BR-23'], {
    api: ['POST /api/purchase-orders', 'POST /api/purchase-orders/{id:int}/receive'], data: 'Đơn đặt H1 × 100', steps: ['Nhận 40', 'Nhận 60'],
    exp: ['Sau lần 1: PARTIAL, đã nhận 40', 'Sau lần 2: COMPLETED', 'Mỗi lần tạo 1 phiếu nhập COMPLETED liên kết đơn'], tech: ['ST'] }),
  T('IT-PO-002', 'PO', 'High', 'Gộp đơn đặt cùng NCC giữ ngày giao dự kiến sớm nhất', ['UC-30', 'BR-22', 'BR-MRP-30..33'], {
    api: ['POST /api/purchase-orders/merge'], data: 'Đơn A giao D+10, đơn B giao D+5, cùng NCC', steps: ['Gộp A và B'],
    exp: ['Đơn gộp có ngày giao D+5', 'Đơn nguồn liên kết đơn gộp'], tech: ['EP'] }),
  T('IT-PO-003', 'PO', 'High', 'Không sửa / huỷ đơn đặt đã có phiếu nhập', ['UC-30', 'BR-22'], {
    api: ['PUT /api/purchase-orders/{id:int}', 'POST /api/purchase-orders/{id:int}/cancel'], pre: 'Đơn đã nhận 1 phần',
    steps: ['Sửa SL', 'Huỷ đơn'], exp: ['Cả hai bị từ chối MSG17; dữ liệu không đổi'], tech: ['ST', 'NEG'] }),
  T('IT-PR-001', 'PR', 'Critical', 'Trả hàng NCC: tồn giảm, công nợ NCC giảm, không vượt SL đã nhận', ['UC-33', 'BR-24', 'BR-25', 'FLOW-06'], {
    api: ['POST /api/purchasereturns', 'POST /api/purchasereturns/{id:int}/refunds'], data: 'Phiếu nhập H1 × 10; trả 3, rồi trả 8',
    steps: ['Trả 3', 'Trả tiếp 8', 'Ghi nhận NCC hoàn tiền'],
    exp: ['Lần 1: tồn −3, công nợ giảm 3 × giá vốn phiếu', 'Lần 2 bị từ chối (vượt 7 còn lại)', 'Hoàn tiền ghi phiếu tài chính'], tech: ['BVA'] }),

  // ── Bán hàng POS ──
  T('IT-SAL-001', 'POS', 'Critical', 'Hoàn tất hoá đơn POS: phiếu xuất, tồn, thẻ kho, thanh toán, công nợ', ['UC-23', 'UC-25', 'UC-35', 'BR-14', 'BR-15', 'BR-16', 'BR-45', 'FLOW-02'], {
    api: ['POST /api/orders/pos'], pre: 'K001: H1 tồn 10; khách KH1 nợ 0, hạn mức 10.000.000', data: 'H1 × 3, giá 100.000, trả 200.000 tiền mặt',
    steps: ['Gửi hoá đơn', 'Đọc lại đơn, phiếu xuất, tồn, thẻ kho, công nợ'],
    exp: ['trx_orders INVOICE COMPLETED, đã trả 200.000', 'trx_stock_issues + dòng SL 3', 'Tồn H1 = 7; thẻ kho ISSUE_SALE −3 tham chiếu STOCK_ISSUE', 'Công nợ KH1 = 100.000', 'Tổng tiền không cộng VAT (BR-45)', DB_CHECK],
    tech: ['EP'] }),
  T('IT-SAL-002', 'POS', 'Critical', 'Không đủ tồn và không cho bán âm thì từ chối, không tạo dữ liệu', ['UC-35', 'BR-16'], {
    api: ['POST /api/orders/pos'], pre: 'Cài đặt không cho bán âm; H1 tồn 2', data: 'H1 × 3', steps: ['Gửi hoá đơn'],
    exp: ['Bị từ chối MSG28', 'Không có đơn, phiếu xuất; tồn vẫn 2'], tech: ['BVA', 'NEG'] }),
  T('IT-SAL-003', 'POS', 'High', 'Biên tồn: bán đúng bằng tồn khả dụng', ['UC-35', 'BR-16'], {
    api: ['POST /api/orders/pos'], data: 'H1 tồn 3, bán 3', steps: ['Gửi hoá đơn'], exp: ['Hoàn tất; tồn = 0'], tech: ['BVA'] }),
  T('IT-SAL-004', 'POS', 'High', 'Cho bán âm trong cài đặt thì hoàn tất, tồn âm', ['UC-35', 'UC-97', 'BR-16'], {
    api: ['PUT /api/order-settings', 'POST /api/orders/pos'], pre: 'Bật cho bán âm; H1 tồn 2', data: 'H1 × 5', steps: ['Gửi hoá đơn'], exp: ['Hoàn tất; tồn = −3; thẻ kho −5'], tech: ['DT'] }),
  T('IT-SAL-005', 'POS', 'High', 'Tồn khả dụng trừ số đã giữ cho đơn đặt khác', ['UC-35', 'BR-08', 'BR-16'], {
    api: ['POST /api/sales-bookings', 'POST /api/orders/pos'], pre: 'H1 tồn 10; đơn đặt của KH2 giữ 8; không cho bán âm', data: 'Hoá đơn lẻ H1 × 3',
    steps: ['Gửi hoá đơn'], exp: ['Bị từ chối MSG28 (khả dụng 2)'], tech: ['DT'] }),
  T('IT-SAL-006', 'CRD', 'Critical', 'Kiểm hạn mức tín dụng khi thanh toán (bảng quyết định)', ['UC-23', 'UC-27', 'BR-12'], {
    api: ['POST /api/orders/pos'], pre: 'KH1 hạn mức 1.000.000, nợ 600.000',
    data: 'Bảng: (a) còn nợ mới 400.000 → nợ = hạn mức; (b) 400.001; (c) 500.000 có yêu cầu tín dụng được duyệt ONE_TIME; (d) 500.000 và cài đặt cho nợ vượt hạn mức',
    steps: ['Gửi hoá đơn với từng tổ hợp'], exp: ['(a) hoàn tất', '(b) bị chặn, gợi ý gửi yêu cầu tín dụng', '(c) hoàn tất 1 lần, yêu cầu được dùng', '(d) hoàn tất'], tech: ['DT', 'BVA'] }),
  T('IT-SAL-007', 'BKG', 'Critical', 'Giao một phần đơn đặt: DELIVERING giữ số còn lại; giao nốt: FINISHED', ['UC-23', 'UC-36', 'BR-17'], {
    api: ['POST /api/sales-bookings', 'POST /api/orders/pos'], data: 'Đơn đặt H1 × 10; hoá đơn 1 giao 4; hoá đơn 2 giao 6',
    steps: ['Xử lý đơn đặt thành hoá đơn 1', 'Xử lý tiếp hoá đơn 2'], exp: ['Sau 1: đơn đặt DELIVERING, còn 6, giữ chỗ 6', 'Sau 2: FINISHED, giữ chỗ 0'], tech: ['ST'] }),
  T('IT-SAL-008', 'BKG', 'Critical', 'Không giao vượt số còn lại của đơn đặt', ['UC-23', 'BR-17'], {
    api: ['POST /api/orders/pos'], data: 'Đơn đặt còn 6; hoá đơn giao 7', steps: ['Gửi hoá đơn từ đơn đặt'],
    exp: ['Bị từ chối, hoặc phần vượt không trừ vào đơn đặt theo quy định; đơn đặt không âm số còn lại'], tech: ['BVA', 'NEG'],
    note: 'Audit 13/11 ghi code chưa chặn; cần chạy để xác nhận.' }),
  T('IT-SAL-009', 'POS', 'High', 'Huỷ hoá đơn đảo tồn, công nợ, thanh toán', ['UC-35', 'BR-15'], {
    api: ['POST /api/orders/{id:int}/cancel'], steps: ['Huỷ hoá đơn của IT-SAL-001'], exp: ['Tồn H1 về 10; công nợ KH1 về 0; thẻ kho có dòng đảo; đơn CANCELLED'], tech: ['ST'] }),
  T('IT-SAL-010', 'POS', 'High', 'Gửi lại cùng ClientRequestId không tạo hoá đơn thứ hai', ['UC-23', 'NFR-REL-03'], {
    api: ['POST /api/orders/pos'], data: 'Cùng request, ClientRequestId = R1, gửi tuần tự 2 lần', steps: ['Gửi 2 lần'],
    exp: ['Chỉ 1 hoá đơn; lần 2 trả hoá đơn đã có hoặc MSG67'], tech: ['EG'] }),
  T('IT-SAL-011', 'POS', 'High', 'Bán thành phẩm có tồn ở nhiều lô', ['UC-35', 'BR-16', 'NFR-REL-01'], {
    api: ['POST /api/orders/pos'], pre: 'Thành phẩm TP1 tại K001: lô L1 = 5, lô L2 = 5 (nhập từ 2 lệnh sản xuất)', data: 'Bán TP1 × 8',
    steps: ['Gửi hoá đơn', 'Đối chiếu tồn từng lô và thẻ kho'], exp: ['Hoàn tất (tổng tồn 10 ≥ 8)', 'Tổng tồn TP1 = 2; tồn từng lô không âm', DB_CHECK],
    tech: ['EG', 'RISK'], note: 'Nghi vấn N-04: POS chỉ kiểm / trừ một dòng tồn mỗi hàng.' }),

  // ── Chuyển kho ──
  T('IT-TRF-001', 'TRF', 'Critical', 'Chuyển kho: xuất trừ kho nguồn, nhận cộng kho đích', ['UC-37', 'BR-40', 'FLOW-04'], {
    api: ['POST /api/transfers', 'POST /api/transfers/{id}/complete', 'POST /api/transfers/{id}/receive'], pre: 'K001: H1 = 10; K002: H1 = 0',
    data: 'Chuyển H1 × 6 từ K001 sang K002', steps: ['Tạo phiếu DRAFT', 'Hoàn thành (xuất)', 'Nhận đủ 6'],
    exp: ['DRAFT: không đổi tồn', 'Xuất: K001 = 4, IN_TRANSIT', 'Nhận: K002 = 6, RECEIVED', 'Thẻ kho hai kho đều có dòng tham chiếu phiếu', DB_CHECK], tech: ['ST'] }),
  T('IT-TRF-002', 'TRF', 'High', 'Nhận thiếu phải có ghi chú', ['UC-38', 'BR-41'], {
    api: ['POST /api/transfers/{id}/receive'], data: 'Xuất 6, nhận 5 không ghi chú; rồi nhận 5 có ghi chú', steps: ['Nhận không ghi chú', 'Nhận có ghi chú'],
    exp: ['Lần 1 bị từ chối MSG49', 'Lần 2: K002 + 5, ghi nhận chênh lệch 1'], tech: ['BVA', 'DT'] }),
  T('IT-TRF-003', 'TRF', 'High', 'Nhận nhiều hơn số đã xuất bị chặn', ['UC-38', 'BR-40'], {
    api: ['POST /api/transfers/{id}/receive'], data: 'Xuất 6, nhận 7', steps: ['Nhận 7'], exp: ['Bị từ chối; tồn K002 không đổi'], tech: ['BVA', 'NEG'],
    note: 'Nghi vấn N-02 (ReceiveTransferCommand.cs:63, 99 không chặn).' }),
  T('IT-TRF-004', 'TRF', 'High', 'Huỷ phiếu đang chuyển hoàn tồn kho nguồn', ['UC-37', 'BR-40'], {
    api: ['POST /api/transfers/{id}/cancel'], steps: ['Huỷ phiếu IN_TRANSIT'], exp: ['K001 tăng lại 6; CANCELLED; thẻ kho có dòng đảo'], tech: ['ST'] }),
  T('IT-TRF-005', 'TRF', 'High', 'Quyền kho: xuất cần kho nguồn, nhận cần kho đích', ['UC-37', 'BR-04', 'FLOW-07'], {
    api: ['POST /api/transfers/{id}/complete', 'POST /api/transfers/{id}/receive'], pre: 'U1 chỉ có K001; U2 chỉ có K002',
    steps: ['U2 xuất phiếu K001 → K002', 'U1 xuất', 'U1 nhận', 'U2 nhận'], exp: ['U2 xuất: MSG04', 'U1 xuất: thành công', 'U1 nhận: MSG04', 'U2 nhận: thành công'], tech: ['DT'] }),

  // ── Kiểm kê, huỷ hàng ──
  T('IT-STK-001', 'STK', 'Critical', 'Hoàn thành kiểm kê điều chỉnh tồn bằng SL đếm', ['UC-39', 'UC-40', 'BR-43'], {
    api: ['POST /api/stocktakes'], data: 'H1 hệ thống 10 đếm 8; H2 hệ thống 5 đếm 7', steps: ['Tạo và hoàn thành phiếu kiểm kê'],
    exp: ['Tồn H1 = 8, H2 = 7', 'Thẻ kho STOCKTAKE_OUT −2, STOCKTAKE_IN +2', 'Phiếu BALANCED, lưu chênh lệch SL và giá trị từng dòng', DB_CHECK], tech: ['EP'] }),
  T('IT-STK-002', 'STK', 'Critical', 'Kiểm kê đang Draft chặn xuất NVL, nhập TP, duyệt hoàn thành, huỷ hàng cùng hàng, cùng kho', ['UC-39', 'UC-43', 'UC-46', 'UC-49', 'BR-42'], {
    api: ['POST /api/stocktakes', 'POST /api/production/material-issues', 'POST /api/production/finished-goods-receipts', 'POST /api/production/orders/{id:int}/approve', 'POST /api/disposals'],
    pre: 'Phiếu kiểm kê DRAFT tại K001 có H1, TP1', steps: ['Xuất NVL H1 tại K001', 'Nhập TP1 tại K001', 'Duyệt hoàn thành lệnh nhận TP1 tại K001', 'Huỷ hàng H1 tại K001', 'Xuất NVL H1 tại K002'],
    exp: ['Bốn thao tác đầu bị chặn MSG50', 'Thao tác ở K002 thành công'], tech: ['DT'] }),
  T('IT-STK-003', 'STK', 'High', 'Huỷ phiếu kiểm kê đã cân bằng đảo điều chỉnh', ['UC-39', 'BR-43'], {
    api: ['POST /api/stocktakes/{id:int}/cancel'], steps: ['Huỷ phiếu của IT-STK-001'], exp: ['Tồn H1 = 10, H2 = 5; thẻ kho có dòng đảo'], tech: ['ST'] }),
  T('IT-STK-004', 'STK', 'Medium', 'Gộp các phiếu kiểm kê nháp cùng kho', ['UC-39'], {
    api: ['POST /api/stocktakes/merge'], steps: ['Gộp 2 phiếu DRAFT cùng K001', 'Gộp phiếu K001 với K002'], exp: ['Lần 1: 1 phiếu chứa dòng của cả hai', 'Lần 2 bị từ chối'], tech: ['EP', 'NEG'] }),
  T('IT-DSP-001', 'DSP', 'Critical', 'Hoàn thành huỷ hàng trừ tồn theo giá vốn', ['UC-43', 'BR-44'], {
    api: ['POST /api/disposals'], data: 'H1 tồn 10, MAC 100; huỷ 3, lý do "hỏng"', steps: ['Tạo và hoàn thành phiếu'],
    exp: ['Tồn = 7; giá trị phiếu 300; thẻ kho −3; COMPLETED'], tech: ['EP'] }),
  T('IT-DSP-002', 'DSP', 'High', 'SL huỷ vượt tồn bị chặn', ['UC-43', 'BR-44'], {
    api: ['POST /api/disposals'], data: 'Tồn 3, huỷ 4', steps: ['Hoàn thành phiếu'], exp: ['Bị từ chối MSG54; tồn không đổi'], tech: ['BVA'] }),
  T('IT-DSP-003', 'DSP', 'High', 'Huỷ phiếu huỷ hàng đã hoàn thành hoàn lại tồn đúng lô', ['UC-43', 'BR-44'], {
    api: ['DELETE /api/disposals/{id:int}'], steps: ['Huỷ phiếu của IT-DSP-001'], exp: ['Tồn = 10 (đúng kho, vị trí, lô cũ); CANCELLED'], tech: ['ST'] }),

  // ── Trả hàng bán ──
  T('IT-RET-001', 'RET', 'Critical', 'Trả hàng theo hoá đơn: tồn tăng, công nợ giảm theo giá trị trả − phí', ['UC-28', 'UC-41', 'BR-19', 'BR-21', 'FLOW-05'], {
    api: ['POST /api/sales-returns'], pre: 'Hoá đơn HĐ1: H1 × 5 × 100.000, khách còn nợ 500.000', data: 'Trả 2, phí trả 20.000',
    steps: ['Tạo phiếu trả', 'Đọc tồn, công nợ'], exp: ['Phiếu COMPLETED', 'Tồn kho nhận +2', 'Công nợ khách = 500.000 − (200.000 − 20.000)'], tech: ['EP'] }),
  T('IT-RET-002', 'RET', 'Critical', 'Trả nhiều lần không vượt SL đã bán − đã trả', ['UC-28', 'BR-19'], {
    api: ['POST /api/sales-returns'], data: 'HĐ1 bán 5: trả 2, trả 3, trả 1', steps: ['Gửi 3 phiếu trả'], exp: ['Hai lần đầu thành công', 'Lần 3 bị từ chối MSG31'], tech: ['BVA'] }),
  T('IT-RET-003', 'RET', 'High', 'Trả hàng nhanh không hoá đơn', ['UC-28', 'BR-19'], {
    api: ['POST /api/sales-returns'], steps: ['Tạo phiếu trả nhanh'], exp: ['Phiếu COMPLETED, tồn tăng, không giảm công nợ hoá đơn nào'], tech: ['EP'] }),
  T('IT-RET-004', 'RET', 'High', 'Hoàn tiền sau cho phiếu trả', ['UC-41', 'UC-82', 'BR-21'], {
    api: ['POST /api/sales-returns/{id:int}/refunds'], steps: ['Ghi hoàn tiền 180.000'], exp: ['Phiếu tài chính hoàn tiền; số đã hoàn của phiếu trả tăng'], tech: ['EP'] }),
  T('IT-RET-005', 'RET', 'Medium', 'Trả hàng sau thời hạn trả hàng trong cài đặt', ['UC-28', 'UC-97'], {
    api: ['POST /api/sales-returns'], pre: 'Cài đặt thời hạn trả 7 ngày; hoá đơn lập 8 ngày trước', steps: ['Tạo phiếu trả'], exp: ['Bị từ chối hoặc cảnh báo theo cài đặt'], tech: ['BVA'],
    note: 'Tài liệu có cài đặt "return time limit" (OrderSetting) nhưng chưa ghi rõ hành vi; cần xác nhận trước khi chạy.' }),

  // ── Tài chính, công nợ ──
  T('IT-FIN-001', 'FIN', 'Critical', 'Phiếu thu phân bổ vào hoá đơn còn nợ cũ nhất trước', ['UC-84', 'BR-15', 'BR-46'], {
    api: ['POST /api/customers/{id}/payments'], pre: 'KH1 nợ HĐ1 300.000 (cũ), HĐ2 500.000', data: 'Thu 400.000', steps: ['Ghi phiếu thu'],
    exp: ['HĐ1 hết nợ, HĐ2 còn 400.000', 'Công nợ KH1 = 400.000'], tech: ['EP'] }),
  T('IT-FIN-002', 'FIN', 'High', 'Số tiền phiếu thu: 0, bằng dư nợ, vượt dư nợ', ['UC-84', 'BR-46'], {
    api: ['POST /api/customers/{id}/payments'], data: 'Dư nợ 800.000: thu 0; 800.000; 800.001', steps: ['Ghi từng phiếu'],
    exp: ['0 bị từ chối MSG59', '800.000 thành công', '800.001 bị từ chối'], tech: ['BVA'] }),
  T('IT-FIN-003', 'FIN', 'High', 'Huỷ phiếu thu hoàn lại công nợ; sửa phiếu chỉ đổi thời gian, phương thức, ghi chú', ['UC-84', 'BR-46'], {
    api: ['PUT /api/customers/{id}/receipts/{code}', 'POST /api/customers/{id}/receipts/{code}/cancel'], steps: ['Sửa ghi chú phiếu', 'Thử sửa số tiền', 'Huỷ phiếu'],
    exp: ['Sửa ghi chú thành công', 'Số tiền không đổi được', 'Huỷ: công nợ tăng lại đúng số tiền phiếu'], tech: ['ST', 'NEG'] }),
  T('IT-FIN-004', 'FIN', 'High', 'Phiếu chi NCC giảm công nợ NCC', ['UC-85', 'BR-25', 'BR-46'], {
    api: ['POST /api/suppliers/{id}/payments'], data: 'Công nợ N1 1.000.000, chi 600.000', steps: ['Ghi phiếu chi'], exp: ['Công nợ N1 = 400.000; phiếu phân bổ vào phiếu nhập còn nợ'], tech: ['EP'] }),
  T('IT-FIN-005', 'FIN', 'High', 'Điều chỉnh công nợ khách / NCC và huỷ điều chỉnh', ['UC-98', 'BR-15', 'BR-25'], {
    api: ['POST /api/customers/{id}/debt-adjustments', 'POST /api/customers/{id}/debt-adjustments/{code}/cancel', 'POST /api/suppliers/{id}/debt-adjustments'],
    steps: ['Điều chỉnh nợ KH1 từ 400.000 thành 350.000', 'Huỷ điều chỉnh', 'Điều chỉnh công nợ N1'], exp: ['Nợ KH1 = 350.000', 'Huỷ: về 400.000', 'Công nợ N1 đổi đúng giá trị mới'], tech: ['EP'] }),

  // ── Tín dụng ──
  T('IT-CRD-001', 'CRD', 'Critical', 'Duyệt yêu cầu tín dụng: ngoại lệ một lần, hạn mức mới (có lịch sử)', ['UC-27', 'UC-64', 'BR-13', 'BR-50', 'NFR-SEC-07'], {
    api: ['POST /api/credit-requests', 'POST /api/credit-requests/{id:int}/approve'], steps: ['Duyệt yêu cầu A loại ONE_TIME', 'Duyệt yêu cầu B loại NEW_LIMIT 5.000.000'],
    exp: ['A: hoá đơn vượt hạn mức hoàn tất được 1 lần, lần sau bị chặn lại', 'B: hạn mức khách = 5.000.000; trx_credit_limit_histories có dòng cũ / mới / lý do', 'Cả hai ghi người duyệt, thời gian, ghi chú'], tech: ['DT'] }),
  T('IT-CRD-002', 'CRD', 'High', 'Hai Manager duyệt cùng một yêu cầu đồng thời', ['UC-64', 'BR-13'], {
    api: ['POST /api/credit-requests/{id:int}/approve'], steps: ['Gửi song song 2 lệnh duyệt / từ chối cùng yêu cầu'], exp: ['Chỉ 1 thành công; lệnh còn lại MSG57'], tech: ['CONC'] }),

  // ── Sản xuất ──
  T('IT-PRO-001', 'PRD', 'Critical', 'Luồng sản xuất: kế hoạch → duyệt → lệnh → xuất NVL → nhập thành phẩm', ['UC-92', 'UC-95', 'UC-46', 'UC-49', 'BR-30', 'BR-31', 'BR-32', 'BR-33', 'BR-36', 'BR-38', 'FLOW-03'], {
    api: ['POST /api/production/plans', 'POST /api/production/plans/{id:int}/submit', 'POST /api/production/plans/{id:int}/approve', 'POST /api/production/plans/{id:int}/orders', 'POST /api/production/material-issues', 'POST /api/production/finished-goods-receipts'],
    pre: 'TP1 có BOM active: NVL1 2 kg/sp, hao hụt 5%; NVL1 tồn 300', data: 'Kế hoạch TP1 × 100; lập lệnh 100; xuất 210; nhận 98 đạt + 2 lỗi',
    steps: ['Lập, gửi, duyệt kế hoạch', 'Lập lệnh', 'Xuất NVL', 'Nhập thành phẩm'],
    exp: ['Nhu cầu NVL1 = 210', 'Lệnh IN_PROGRESS sau xuất lần đầu; tồn NVL1 = 90; thẻ kho xuất NVL', 'Tồn TP1 + 98 (lô mới); 2 lỗi không vào tồn bán được', 'Lệnh lưu luỹ kế nhận'], tech: ['ST'] }),
  T('IT-PRO-002', 'PRD', 'Critical', 'Xuất NVL vượt tồn bị chặn', ['UC-46', 'BR-33'], {
    api: ['POST /api/production/material-issues'], data: 'NVL1 tồn 50, xuất 51', steps: ['Xuất'], exp: ['Bị từ chối MSG28; tồn không đổi'], tech: ['BVA'] }),
  T('IT-PRO-003', 'PRD', 'High', 'Cấp bổ sung vượt nhu cầu phải có lý do', ['UC-47', 'BR-34'], {
    api: ['POST /api/production/material-issues'], data: 'Nhu cầu 210, đã xuất 210, cấp thêm 10 không lý do / có lý do', steps: ['Cấp thêm không lý do', 'Cấp thêm có lý do'],
    exp: ['Lần 1 bị từ chối', 'Lần 2 thành công; luỹ kế 220; thiếu = 0'], tech: ['DT'] }),
  T('IT-PRO-004', 'PRD', 'High', 'Nhập thành phẩm vượt SL kế hoạch cần xác nhận; NVL đã xuất không đủ thì cảnh báo, không chặn', ['UC-49', 'BR-35', 'BR-37'], {
    api: ['GET /api/production/finished-goods-receipts/check', 'POST /api/production/finished-goods-receipts'], steps: ['Kiểm nhập 105 khi kế hoạch 100', 'Nhập khi NVL đã xuất chỉ đủ 90 sp'],
    exp: ['Hệ thống yêu cầu xác nhận trước khi lưu', 'Hiện cảnh báo, bắt ghi chú, đánh dấu cho Manager; phiếu vẫn lưu'], tech: ['BVA', 'DT'] }),
  T('IT-PRO-005', 'PRD', 'High', 'Không lập lệnh cho thành phẩm không có BOM active', ['UC-59', 'BR-30'], {
    api: ['POST /api/production/plans/{id:int}/orders'], steps: ['Ngừng BOM của TP1 rồi lập lệnh'], exp: ['Bị từ chối MSG58'], tech: ['NEG'] }),
  T('IT-PRO-006', 'PRD', 'High', 'Điều chỉnh định mức không làm nhu cầu thấp hơn đã xuất; không bỏ NVL đã xuất', ['UC-59', 'BR-51', 'BR-52'], {
    api: ['POST /api/production/orders/{id:int}/adjust-norms'], steps: ['Đặt nhu cầu mới < đã xuất', 'Bỏ NVL đã xuất', 'Điều chỉnh hợp lệ có lý do'],
    exp: ['Hai lệnh đầu bị từ chối', 'Lệnh 3 thành công; BOM không đổi'], tech: ['BVA', 'NEG'] }),
  T('IT-PRO-007', 'PRD', 'High', 'Xuất NVL theo số thực tế khác nhu cầu', ['UC-46', 'UC-48', 'BR-32', 'BR-33'], {
    api: ['POST /api/production/material-issues', 'GET /api/production/orders/{id:int}'], data: 'Nhu cầu NVL1 210; xuất thực tế 150, rồi 60',
    steps: ['Xuất 150', 'Xem chi tiết lệnh', 'Xuất 60'], exp: ['Tồn trừ 150; đã xuất 150; thiếu 60', 'Sau lần 2: đã xuất 210; thiếu 0', 'Mỗi lần xuất tham chiếu mã lệnh'], tech: ['BVA'] }),
  T('IT-MRP-001', 'MRP', 'High', 'Lần chạy MRP ghi run, lines, demands trong một transaction', ['UC-101', 'BR-MRP-30..33', 'NFR-REL-02'], {
    api: ['POST /api/production/mrp/runs'], steps: ['Chạy MRP hợp lệ', 'Chạy MRP với SL làm tràn giới hạn lưu'], exp: ['Lần 1: 1 trx_mrp_runs + dòng lines + demands khớp material_count', 'Lần 2 bị từ chối; không có bản ghi run mới'], tech: ['EG'] }),

  // ── Phân quyền ở tầng handler, bảo mật ──
  T('IT-SEC-001', 'SEC', 'Critical', 'Cô lập kho trong handler cho mọi nghiệp vụ kho', ['BR-04', 'NFR-SEC-01', 'FLOW-07'], {
    api: ['POST /api/purchases', 'POST /api/orders/pos', 'POST /api/transfers', 'POST /api/stocktakes', 'POST /api/disposals', 'POST /api/sales-returns', 'POST /api/production/material-issues', 'POST /api/production/finished-goods-receipts', 'POST /api/production/mrp/runs'],
    pre: 'U1 chỉ có quyền K001 (đủ quyền chức năng)', steps: ['Gửi từng nghiệp vụ với kho K002'], exp: ['Mỗi lệnh bị từ chối MSG04; không bản ghi nào được tạo'], tech: ['DT'] }),
  T('IT-SEC-002', 'SEC', 'High', 'Đổi ma trận quyền có hiệu lực ngay ở request kế tiếp', ['UC-13', 'BR-02', 'NFR-SEC-02'], {
    api: ['PUT /api/roles/{roleCode}/permissions'], steps: ['Bỏ SALES_CREATE của vai trò SalesStaff', 'sales01 gọi tạo hoá đơn bằng token cũ'], exp: ['403, không cần đăng nhập lại'], tech: ['ST'] }),
  T('IT-SEC-003', 'SEC', 'Critical', 'Khoá tài khoản thì mất quyền ở request kế tiếp', ['UC-09', 'BR-05', 'NFR-SEC-04'], {
    api: ['PUT /api/staff/{id}/toggle-status'], steps: ['Admin khoá sales01', 'sales01 gọi API bằng token còn hạn'], exp: ['401 / 403; frontend về trang đăng nhập'], tech: ['ST'] }),
  T('IT-SEC-004', 'SEC', 'High', 'Mật khẩu lưu dạng băm có salt', ['BR-05', 'NFR-SEC-03'], {
    api: ['POST /api/staff'], steps: ['Tạo nhân viên', 'Đọc sec_users.password_hash'], exp: ['Chuỗi BCrypt ($2a$/$2b$), khác nhau cho hai tài khoản cùng mật khẩu'], tech: ['EG'] }),
  T('IT-SET-001', 'SET', 'High', 'Sinh mã chứng từ từ sequence không trùng khi chạy song song', ['BR-06', 'UC-97'], {
    api: ['POST /api/orders/pos'], steps: ['Gửi song song 20 hoá đơn hợp lệ'], exp: ['20 mã khác nhau, đúng tiền tố và quy tắc trong cài đặt'], tech: ['CONC'] }),

  // ── Đồng thời (concurrency) ──
  T('IT-CONC-001', 'POS', 'Critical', 'Hai người cùng bán sản phẩm cuối cùng', ['UC-35', 'BR-16', 'NFR-REL-01'], {
    api: ['POST /api/orders/pos'], pre: 'Không cho bán âm; H1 tồn 1', steps: ['sales01 và manager01 gửi song song hoá đơn H1 × 1'],
    exp: ['Đúng 1 hoá đơn hoàn tất, request kia MSG28', 'Tồn H1 = 0, không âm', DB_CHECK], tech: ['CONC', 'RISK'], note: 'Nghi vấn N-03: không có khoá tồn kho.' }),
  T('IT-CONC-002', 'POS', 'Critical', 'Bấm thanh toán hai lần đồng thời (cùng ClientRequestId)', ['UC-23', 'NFR-REL-03'], {
    api: ['POST /api/orders/pos'], steps: ['Gửi song song 2 request giống hệt, cùng ClientRequestId'], exp: ['Chỉ 1 hoá đơn, 1 phiếu xuất, 1 lần trừ tồn và cộng nợ'], tech: ['CONC'],
    note: 'Nghi vấn N-05: chống trùng bằng kiểm tra ghi chú rồi mới ghi, không có ràng buộc unique.' }),
  T('IT-CONC-003', 'INV', 'Critical', 'Nhiều request nhập / xuất cùng hàng song song giữ tồn đúng', ['NFR-REL-01', 'NFR-REL-02'], {
    api: ['POST /api/purchases', 'POST /api/orders/pos', 'POST /api/disposals'], data: 'H1 tồn 100; song song: 10 phiếu nhập × 5, 10 hoá đơn × 3, 5 phiếu huỷ × 1',
    steps: ['Gửi đồng thời 25 request', 'Đối chiếu tồn và thẻ kho'], exp: ['Tồn = 100 + 50 − 30 − 5 = 115', DB_CHECK], tech: ['CONC'] }),
  T('IT-CONC-004', 'TRF', 'High', 'Hai request xuất (hoặc nhận) cùng một phiếu chuyển kho', ['UC-37', 'BR-40'], {
    api: ['POST /api/transfers/{id}/complete', 'POST /api/transfers/{id}/receive'], steps: ['Gửi song song 2 lệnh xuất', 'Gửi song song 2 lệnh nhận'], exp: ['Mỗi cặp chỉ 1 thành công; tồn chỉ trừ / cộng một lần'], tech: ['CONC'] }),
  T('IT-CONC-005', 'FIN', 'High', 'Hai phiếu thu đồng thời vượt dư nợ', ['UC-84', 'BR-46'], {
    api: ['POST /api/customers/{id}/payments'], data: 'Dư nợ 500.000; hai phiếu 300.000 song song', steps: ['Gửi song song'], exp: ['Không để công nợ âm; tổng thu không vượt 500.000'], tech: ['CONC'] }),
  T('IT-CONC-006', 'BKG', 'Medium', 'Hai người cùng sửa một đơn đặt', ['UC-21'], {
    api: ['PUT /api/sales-bookings/{id:int}'], steps: ['Gửi song song 2 bản sửa khác nhau'], exp: ['Đơn sau cùng nhất quán (đúng một bản), không trùng hoặc mất dòng hàng'], tech: ['CONC'],
    note: 'Tài liệu chưa quy định khoá lạc quan; ghi nhận hành vi thực tế.' }),
];
