# 07 — Thiết kế API đề xuất

Đề xuất, chưa có endpoint nào được tạo. Route gốc: `api/production/mrp` (`MrpController`), cùng nhánh với `api/production/plans`.

## 1. Quy ước chung

- **Quyền:** mọi action có `[RequirePermission]` + `[RequireFeature("feat-production-mrp")]` (tên chức năng tạm, chờ Q10). Chạy MRP dùng `PROD_UPDATE` (Kế toán sản xuất mặc định chỉ có `PROD_READ` và `PROD_UPDATE`); xem dùng `PROD_READ`.
- **Quyền kho:** handler kiểm từng kho bằng `ICurrentUserService.HasWarehouseAccessAsync`. Khi xem một lần chạy, người dùng phải có quyền với mọi kho của lần chạy đó.
- **Phản hồi lỗi:** theo cách đang dùng: 400 `{ message }` cho lỗi nghiệp vụ; 400 `{ code: "VALIDATION_FAILED", message, errors }` cho lỗi dữ liệu; 401; 403.
- **Số lượng:** đơn vị cơ sở, 2 chữ số thập phân. **Ngày:** `yyyy-MM-dd`.

## 2. Danh sách endpoint

| # | Method, endpoint | Mục đích | Loại |
|---|---|---|---|
| 1 | `POST /api/production/mrp/runs` | Chạy MRP, lưu một lần chạy | Command |
| 2 | `GET /api/production/mrp/runs` | Lịch sử các lần chạy | Query |
| 3 | `GET /api/production/mrp/runs/{id}` | Tổng quan một lần chạy | Query |
| 4 | `GET /api/production/mrp/runs/{id}/daily-requirements` | Nhu cầu theo ngày | Query |
| 5 | `GET /api/production/mrp/runs/{id}/monthly-demand` | Nhu cầu theo tháng hoặc tuần | Query |
| 6 | `GET /api/production/mrp/runs/{id}/shortages` | NVL thiếu | Query |
| 7 | `GET /api/production/mrp/runs/{id}/materials/{materialId}/projection` | Tồn dự phóng của một NVL | Query |
| 8 | `GET /api/production/mrp/runs/{id}/purchase-suggestions` | Đề xuất mua | Query |

## 3. Chi tiết

### 1. Chạy MRP

`POST /api/production/mrp/runs`

Request:
```json
{
  "periodEnd": "2026-12-16",
  "warehouseIds": [3],
  "includePendingPlans": false
}
```

| Mục | Nội dung |
|---|---|
| Validation | `periodEnd` bắt buộc, không trước hôm nay, không quá 366 ngày; `warehouseIds` có ít nhất một kho, không trùng |
| Quy tắc | BR-MRP-01..29. Kỳ bắt đầu từ hôm nay (giờ Việt Nam). Cả lần chạy lưu trong một transaction |
| Response | Như endpoint 3 |
| Lỗi | Kho không tồn tại hoặc ngừng hoạt động; không có quyền kho; số lượng tràn giới hạn lưu |

Không có kế hoạch hay lệnh nào trong kỳ **không** phải lỗi: trả lần chạy rỗng.

### 2. Lịch sử

`GET /api/production/mrp/runs?fromDate=&toDate=&warehouseId=`

Response: danh sách `{ mrpRunId, runCode, runAt, runByName, periodStart, periodEnd, warehouseNames, materialCount, shortageCount, lateCount }`, mới nhất trước. Chỉ trả lần chạy mà người dùng có quyền với mọi kho.

### 3. Tổng quan

`GET /api/production/mrp/runs/{id}`

Response:
```json
{
  "mrpRunId": 12,
  "runCode": "MRP00012",
  "runAt": "2026-11-16T09:30:00",
  "runByName": "Nguyễn Văn A",
  "periodStart": "2026-11-16",
  "periodEnd": "2026-12-16",
  "warehouses": [{ "warehouseId": 3, "name": "Kho Gia Lâm" }],
  "includePendingPlans": false,
  "materialCount": 3,
  "shortageCount": 2,
  "lateCount": 0,
  "productsWithoutBom": [{ "productId": 9, "productCode": "TP-09", "productName": "..." }],
  "isStale": true,
  "staleReasons": ["Kế hoạch KHSX00003 được sửa lúc 16/11/2026 10:05"]
}
```

`isStale` được tính lúc đọc: có kế hoạch, lệnh hoặc đơn đặt trong phạm vi được cập nhật sau `runAt`.

Lỗi: không tìm thấy lần chạy; không có quyền kho.

### 4. Nhu cầu theo ngày

`GET .../daily-requirements?fromDate=&toDate=&materialId=`

Response: danh sách `{ date, materialId, materialCode, materialName, unitName, grossRequirement, sources: [{ type: "PLAN" | "ORDER", code, productCode, quantity }] }`.

`sources` lấy từ bảng truy vết nếu có (file 06, bảng tùy chọn); nếu không có bảng đó thì trường này chỉ có với lần chạy mới nhất và được tính lại.

### 5. Nhu cầu theo tháng hoặc tuần

`GET .../monthly-demand?bucket=month|week`

Response: `{ buckets: ["2026-11", "2026-12"], materials: [{ materialId, materialCode, materialName, unitName, quantities: [900, 0], total: 900 }] }`.

Validation: `bucket` là `month` hoặc `week`. Tuần bắt đầu thứ Hai.

### 6. NVL thiếu

`GET .../shortages?lateOnly=`

Response: danh sách `{ materialId, materialCode, materialName, unitName, firstShortageDate, totalNetRequirement, isLate, hasLeadTime, onHand, onOrderWithoutDate, affected: [{ type, code, productCode, neededDate, shortageQty }], otherWarehouses: [{ warehouseId, name, onHand }] }`.

`otherWarehouses` chỉ gồm kho người dùng có quyền, tính lúc đọc.

### 7. Tồn dự phóng

`GET .../materials/{materialId}/projection`

Response: `{ material: {...}, openingBalance, safetyStock, leadTimeDays, rows: [{ date, grossRequirement, scheduledReceipt, projectedBalance, netRequirement, plannedReceipt, projectedBalanceAfterPlan, plannedReleaseDate }] }`.

Lỗi: NVL không có trong lần chạy.

### 8. Đề xuất mua

`GET .../purchase-suggestions?status=ON_TIME|LATE|NO_LEAD_TIME`

Response: danh sách `{ materialId, materialCode, materialName, unitName, suggestedQty, suggestedQtyRounded, requiredReceiptDate, releaseDate, status, lastSupplier: { partnerId, name } | null }`.

- `suggestedQtyRounded` là số làm tròn lên số nguyên để mở đơn đặt (BR-MRP-27).
- `lastSupplier` lấy từ đơn đặt gần nhất có NVL này; không phải nhà cung cấp mặc định.
- NVL ngừng kinh doanh không có trong danh sách (BR-MRP-29).

Mở đơn đặt: frontend chuyển tới `/purchase-orders/create?products={id}:{suggestedQtyRounded},...&notes=...`. Không có API tạo đơn đặt từ MRP (BR-MRP-28).

## 4. Thay đổi ở API đang có

| API | Thay đổi | Bắt buộc? |
|---|---|---|
| `POST`, `PUT api/Products`; `GET api/Products/{id}` | Thêm `leadTimeDays` (số nguyên ≥ 0, tùy chọn) | Có |
| `POST`, `PUT api/purchase-orders`; `GET api/purchase-orders/{id}` | Thêm `expectedDate` (tùy chọn; không trước ngày đặt) | Có nếu chốt Q6 |
| `GET api/production/plans/{id}/material-requirements` | Không đổi | — |

Trường mới là tùy chọn và đặt cuối DTO, để frontend và client cũ không bị ảnh hưởng.
