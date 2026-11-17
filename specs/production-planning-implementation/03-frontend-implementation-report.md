# 03 — Báo cáo Phase 3: Frontend

- **Ngày:** 15/11/2026. **Nhánh:** `feature/production-planning` (chưa commit).
- **Phạm vi:** màn hình cho UC-PP-01..06, gọi API thật ở `api/production/plans` (Phase 2). Không dùng dữ liệu giả.

## 1. Đối chiếu cách tổ chức hiện có

| Nội dung | Cách module Sản xuất đang làm | Kế hoạch làm theo |
|---|---|---|
| Nạp trang | `page.tsx` → `LazyAppLayout initialScreen` → `AppLayout` switch | 2 trang mới cùng mẫu |
| Bố cục màn | Thanh tiêu đề + `ProductionFilterSidebar` + bảng Tailwind tự dựng, bấm dòng mở panel chi tiết | Giống `ProductionOrdersScreen` |
| Modal | `ProductionDialog` tự dựng (không dùng antd `Modal`), `ConfirmDialog`, `ReasonDialog` | Dùng lại |
| Gọi API | `services/*.ts` qua `lib/api/client.ts` | `productionPlanService.ts` |
| Quyền hiển thị | `useProductionFeatures` đọc chức năng từ `/api/Roles/my-features` | Thêm 2 cờ |
| Ma trận phân quyền | Màn Phân quyền chức năng chỉ hiện các chức năng là **mục menu** (`NAVBAR_FEATURES` = `NAV_ITEMS_FLAT`) | Chức năng duyệt phải là mục menu riêng (giống "Duyệt yêu cầu" `feat-credit-approvals`) |

## 2. Màn hình và luồng

| Đường dẫn | Mục menu (nhóm Sản xuất) | Chức năng | Nội dung |
|---|---|---|---|
| `/production/plans` | Kế hoạch sản xuất | `feat-production-plans` | Danh sách (mặc định: Nháp, Chờ duyệt, Đã duyệt, Bị từ chối), lập kế hoạch, chi tiết, sửa, gửi duyệt, hủy, lập lệnh từ kế hoạch |
| `/production/plan-approvals` | Duyệt kế hoạch sản xuất | `feat-production-plan-approval` | Cùng màn, mặc định lọc **Chờ duyệt**; duyệt, từ chối, điều chỉnh sau duyệt, đóng |

Các thành phần:

| Thành phần | Use Case | Ghi chú |
|---|---|---|
| Bảng danh sách + bộ lọc (trạng thái, kỳ kế hoạch, tìm mã / tên), xuất Excel | UC-PP-01 | Có trạng thái đang tải, rỗng, lỗi (kèm nút Thử lại) |
| `ProductionPlanDetailPanel`: tab Thông tin & tiến độ, Nhu cầu NVL, Lệnh sản xuất | UC-PP-01, UC-PP-03 | Từng dòng: kế hoạch, đã lập lệnh, còn lại, đã nhập kho; ghi chú hiển thị cả lý do từ chối / hủy |
| Thanh nút thao tác | UC-PP-02/04/05/06 | **Chỉ đọc `detail.actions` từ backend**; không tự suy từ trạng thái |
| `ProductionPlanFormModal` (lập / sửa) | UC-PP-02 | Tìm thành phẩm (`ProductSearchInput`, loại Thành phẩm, ẩn thành phẩm đã chọn); số lượng, ngày, kho nhận (kho được phân quyền), ghi chú; cảnh báo chưa có BOM; chế độ **sửa hạn chế** khi kế hoạch đã duyệt (khóa tên, kỳ, khóa nút xóa dòng đã có lệnh, hiện cột Đã lập lệnh); xem trước nhu cầu NVL (trễ 400 ms) |
| `PlanMaterialRequirementsPanel` | UC-PP-03 | Chọn kho so tồn; cảnh báo thiếu (không chặn); liệt kê thành phẩm chưa có BOM; khi đã có lệnh, mặc định tính theo số còn lại, có ô chuyển sang tổng kế hoạch |
| `CreateOrderFromPlanModal` | UC-PP-05 | Chỉ hiện dòng còn số; chọn dòng, nhập số lượng (mặc định = số còn lại, chặn vượt); hạn hoàn thành bỏ trống = ngày kết thúc muộn nhất của dòng chọn; xưởng, ghi chú |
| Xác nhận gửi duyệt / duyệt / đóng (`ConfirmDialog`); từ chối / hủy (`ReasonDialog`, tối đa 200 ký tự) | UC-PP-04, UC-PP-06 | |
| Mã kế hoạch trên chi tiết lệnh sản xuất | UC-PP-01 | `ProductionOrderDetailPanel` hiện "Kế hoạch sản xuất: KHSX…" nếu lệnh thuộc kế hoạch |

### Validation phía frontend khớp backend

`utils/productionPlanFormat.ts → validatePlanForm` dùng cùng luật với `SaveProductionPlanRequestValidator`: tên bắt buộc ≤ 150; kỳ hợp lệ; có ít nhất 1 dòng; số lượng > 0 và tối đa 2 chữ số thập phân; ngày dòng hợp lệ và nằm trong kỳ; ghi chú ≤ 500; khi sửa sau duyệt thì số lượng ≥ số đã lập lệnh, dòng mới phải có BOM. Lỗi backend dạng `VALIDATION_FAILED` được ghép thông báo chi tiết qua `planErrorText` (trước đây `apiClient` chỉ hiện "Dữ liệu không hợp lệ.").

## 3. File đã tạo / sửa

**Tạo:**
- `src/app/(dashboard)/production/plans/page.tsx`, `src/app/(dashboard)/production/plan-approvals/page.tsx`
- `src/features/production/screens/ProductionPlansScreen.tsx`
- `src/features/production/components/ProductionPlanDetailPanel.tsx`, `ProductionPlanFormModal.tsx`, `CreateOrderFromPlanModal.tsx`, `PlanMaterialRequirementsPanel.tsx`, `ProductionPlanStatusTag.tsx`
- `src/features/production/services/productionPlanService.ts`
- `src/features/production/types/productionPlan.ts`
- `src/features/production/utils/productionPlanFormat.ts`

**Sửa:**
- `src/lib/navigation/navbar.ts`: 2 mục menu mới đầu nhóm Sản xuất
- `src/components/layout/AppLayout.tsx`: 2 `case` màn hình
- `src/features/admin/services/permissionService.ts`: mặc định chức năng của Manager / Kế toán sản xuất (khớp `FeatureConstants` backend)
- `src/features/production/hooks/useProductionFeatures.ts`: `canPlanProduction`, `canApprovePlans`
- `src/features/production/types/index.ts`: `productionPlanId`, `productionPlanCode` trên lệnh; export kiểu kế hoạch
- `src/features/production/components/ReasonDialog.tsx`: thêm tùy chọn `maxLength` (mặc định 300 như cũ)
- `src/features/production/components/ProductionOrderDetailPanel.tsx`: hiện mã kế hoạch

Không thêm package (dùng `xlsx`, `lucide-react`, `antd` `message` đã có). Không có `any`, không có `console.log` trong file mới. Không đổi URL trang cũ.

## 4. Kiểm tra

| Bước | Kết quả |
|---|---|
| `npx tsc --noEmit` | 0 lỗi trong code mới / đã sửa. 45 lỗi còn lại đều có từ trước: `.next/dev/types/validator.ts` (cache `next dev` cũ trỏ tới trang `production/import`, `production/logs` đã xóa) và `src/features/roles/components/AppLayout.tsx` (file **chưa được theo dõi** trên máy, import module không còn tồn tại) |
| `npx eslint` các file mới / đã sửa | 0 lỗi ở file mới. 13 lỗi ở `permissionService.ts` dòng 23–266 có từ trước (đoạn mình sửa ở dòng ~585 không có lỗi) |
| `npm run lint` toàn bộ | 238 vấn đề (122 lỗi, 116 cảnh báo), **bằng đường cơ sở** trước khi sửa |
| `node docs/refactor/tools/check-structure.js --strict` | 2 vi phạm "mới", đều thuộc file chưa theo dõi `features/roles/components/AppLayout.tsx`; code mới 0 vi phạm |
| `npm run build` | **Đạt**, 46/46 trang; có `/production/plans`, `/production/plan-approvals`. Để build chạy được, đã **tạm dời** 2 thứ có sẵn trên máy (thư mục chưa theo dõi `src/features/roles/` và cache `.next/dev`) ra scratchpad rồi **trả lại nguyên vẹn** (đã so hash) |
| Chạy thử giao diện bằng trình duyệt | **Chưa làm** (môi trường không có công cụ trình duyệt). Các API màn hình gọi đã chạy đạt ở Phase 2 và Phase 4 |

## 5. Hạn chế

| # | Nội dung |
|---|---|
| F1 | Chưa bấm thử giao diện thật; cần một người chạy `npm run dev` và thử luồng ở mục 2 trước khi merge |
| F2 | Lập lệnh từ kế hoạch dùng định mức BOM mặc định; muốn chỉnh định mức thì làm sau ở màn Lệnh sản xuất ("Điều chỉnh định mức", BR-51) |
| F3 | Danh sách lệnh trong chi tiết kế hoạch chưa có liên kết mở thẳng lệnh (màn Lệnh sản xuất chưa nhận tham số mở theo mã) |
| F4 | Vai trò đã lưu ma trận chức năng phải được Admin tick 2 mục mới ở màn Phân quyền chức năng (mục mới đã hiện trong ma trận) |
| F5 | File chưa theo dõi `src/features/roles/components/AppLayout.tsx` và cache `.next/dev` cũ làm `npm run build` trên máy này lỗi; nên xóa (ngoài phạm vi, không tự xóa) |

## 6. Tự kiểm

- **(a) Giả định:** chức năng duyệt là một mục menu riêng (theo tiền lệ `feat-credit-approvals`), vì ma trận phân quyền chỉ liệt kê mục menu.
- **(b) Cần hỏi nhóm:** tên 2 mục menu; có xóa file `src/features/roles/components/AppLayout.tsx` không.
- **(c) Chỗ không chắc:** giao diện chưa được bấm thử.
- **(d) UC/BR:** UC-PP-01..06; BR-PP-06, 09, 13, 15, 20.
